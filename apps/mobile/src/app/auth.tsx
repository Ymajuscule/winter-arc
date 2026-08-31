import { completeCodeSignIn, resolvePostSignIn } from '@/lib/auth-flow';
import { isSupabaseConfigured, supabase } from '@/services/supabase';
import { Hairline, Surface, Text, border, frost, radii, spacing } from '@winterarc/ui-primitives';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Sign in / create account — CDC §107 ("Supabase Auth: magic link +
 * Apple/Google"), extended to email+password at Julien's direct ask.
 *
 * Two explicit modes rather than one field that guesses: registering and
 * signing in fail differently ("that email is taken" vs "wrong password"),
 * and a screen that hides which one it is has to word both errors vaguely.
 * The mode selector is two tracked-caps labels over a hairline — Design Law
 * rule 6, not a pill-shaped segmented control.
 *
 * Three credentials, one destination. Whatever method produces a session,
 * `resolvePostSignIn` decides where the user lands: a returning account goes
 * to the dashboard with its real profile loaded, a brand-new one goes into
 * onboarding so `onboarding/reward.tsx` can call `bootstrap-profile` with a
 * real username, class, avatar and habits. Before 2026-08-31 registration
 * skipped straight to the dashboard on a profile auto-created as "wanderer".
 *
 * Google uses `skipBrowserRedirect: true` (React Native has no
 * `window.location`) and hands the URL to `expo-web-browser`'s
 * `openAuthSessionAsync`. On web that sheet returns the redirect URL
 * directly, so the `?code=` is exchanged here; on native the OS follows the
 * `winterarc://` deep link into `app/auth/callback.tsx` instead, and this
 * call is only waiting for the sheet to close.
 *
 * Password recovery redirects to its own route (`/auth/reset`) rather than
 * the shared callback: both arrive as a PKCE `?code=`, and nothing in the
 * exchanged session says "this one came from a recovery email", so the only
 * reliable way to know the user still owes us a new password is to land them
 * somewhere that knows it.
 *
 * Google's button is a text label, not a logo. Reproducing the multicolour
 * Google mark would break the Frost palette outright (Design Law rule 9),
 * and inventing a monochrome one misrepresents someone else's brand.
 *
 * Still needed from Julien — neither reachable from an agent session:
 * (1) `winterarc://auth/callback` and `winterarc://auth/reset` registered
 * under Auth -> URL Configuration -> Redirect URLs;
 * (2) a Google OAuth client (Google Cloud Console) wired into Auth ->
 * Providers -> Google. Without (2) the Google button surfaces a
 * provider-not-enabled error rather than crashing.
 */

type Mode = 'signin' | 'signup';
type Method = 'password' | 'magic-link';
/** What the screen is waiting on, so one flag can't leave two buttons spinning. */
type Pending = null | 'password' | 'google' | 'magic-link' | 'recovery';

const CALLBACK_URL = 'winterarc://auth/callback';
const RESET_URL = 'winterarc://auth/reset';
const MIN_PASSWORD_LENGTH = 8;

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [method, setMethod] = useState<Method>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  /** A terminal "we emailed you" state — the screen has nothing left to do. */
  const [notice, setNotice] = useState<string | null>(null);

  const emailValid = /^\S+@\S+\.\S+$/.test(email);
  const passwordValid = password.length >= MIN_PASSWORD_LENGTH;
  const busy = pending !== null;
  const canSubmit = !busy && emailValid && (method === 'magic-link' ? true : passwordValid);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  /** One place where a session becomes a screen — every method funnels here. */
  async function enterApp() {
    const result = await resolvePostSignIn();
    if (result.ok) {
      router.replace(result.destination);
    } else {
      setError(result.message);
    }
  }

  async function handlePasswordSubmit() {
    if (!canSubmit || !supabase) return;
    setPending('password');
    setError(null);

    const { data, error: authError } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: CALLBACK_URL },
          });

    if (authError) {
      setPending(null);
      setError(authError.message);
      return;
    }
    if (!data.session) {
      // Sign-up on a project with email confirmation on: the account exists
      // but there's no session to route with yet.
      setPending(null);
      setNotice(`Confirm your account from the email we sent to ${email}.`);
      return;
    }
    await enterApp();
    setPending(null);
  }

  async function handleMagicLink() {
    if (!canSubmit || !supabase) return;
    setPending('magic-link');
    setError(null);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      // Creating an account by magic link is the same call; this only blocks
      // it when the user is explicitly on the Sign In tab, so a typo'd
      // address doesn't quietly register a second account.
      options: { emailRedirectTo: CALLBACK_URL, shouldCreateUser: mode === 'signup' },
    });
    setPending(null);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setNotice(`Open the link we sent to ${email}.`);
  }

  async function handleGoogle() {
    if (busy || !supabase) return;
    setPending('google');
    setError(null);

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: CALLBACK_URL, skipBrowserRedirect: true },
    });
    if (oauthError || !data.url) {
      setPending(null);
      setError(oauthError?.message ?? 'Could not start Google sign-in.');
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, CALLBACK_URL);
    // Dismissed or cancelled is a decision, not a failure — say nothing.
    if (result.type !== 'success') {
      setPending(null);
      return;
    }
    // Web returns the redirect URL here instead of firing the deep link, so
    // the code has to be exchanged on this side. On native the OS routes to
    // app/auth/callback.tsx and `code` is absent here.
    const code = new URL(result.url).searchParams.get('code');
    if (!code) {
      setPending(null);
      return;
    }
    const outcome = await completeCodeSignIn(code);
    setPending(null);
    if (outcome.ok) router.replace(outcome.destination);
    else setError(outcome.message);
  }

  async function handleForgotPassword() {
    if (busy || !supabase) return;
    if (!emailValid) {
      setError('Enter your email address first.');
      return;
    }
    setPending('recovery');
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_URL,
    });
    setPending(null);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setNotice(`If ${email} has an account, a reset link is on its way.`);
  }

  if (!isSupabaseConfigured) {
    return (
      <Shell>
        <Text variant="body" color="blood" style={styles.centered}>
          Sign-in isn't configured yet.
        </Text>
      </Shell>
    );
  }

  if (notice) {
    return (
      <Shell>
        <Text variant="body" color="ghost" style={styles.centered}>
          {notice}
        </Text>
        <Pressable
          onPress={() => {
            setNotice(null);
            setPassword('');
          }}
          style={styles.linkRow}
        >
          <Text variant="body" color="fog">
            Back
          </Text>
        </Pressable>
      </Shell>
    );
  }

  const primaryLabel =
    method === 'magic-link'
      ? pending === 'magic-link'
        ? 'SENDING…'
        : 'SEND LINK'
      : pending === 'password'
        ? mode === 'signin'
          ? 'SIGNING IN…'
          : 'CREATING ACCOUNT…'
        : mode === 'signin'
          ? 'SIGN IN'
          : 'CREATE ACCOUNT';

  return (
    <Shell>
      <View style={styles.modeRow}>
        <ModeTab label="SIGN IN" active={mode === 'signin'} onPress={() => switchMode('signin')} />
        <ModeTab label="REGISTER" active={mode === 'signup'} onPress={() => switchMode('signup')} />
      </View>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={frost.fog}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        style={styles.input}
        accessibilityLabel="Email"
      />

      {method === 'password' ? (
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={`password · ${MIN_PASSWORD_LENGTH}+ characters`}
          placeholderTextColor={frost.fog}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          autoCorrect={false}
          style={styles.input}
          accessibilityLabel="Password"
        />
      ) : null}

      {error ? (
        <Text variant="body" color="blood" style={styles.centered}>
          {error}
        </Text>
      ) : null}

      <Pressable
        onPress={method === 'magic-link' ? handleMagicLink : handlePasswordSubmit}
        disabled={!canSubmit}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.primaryButton,
          !canSubmit && styles.buttonDisabled,
          pressed && canSubmit && styles.buttonPressed,
        ]}
      >
        <Text variant="label" color={canSubmit ? 'void' : 'fog'}>
          {primaryLabel}
        </Text>
      </Pressable>

      {method === 'password' && mode === 'signin' ? (
        <Pressable onPress={handleForgotPassword} disabled={busy} style={styles.linkRow}>
          <Text variant="body" color="fog">
            {pending === 'recovery' ? 'Sending…' : 'Forgot your password?'}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.dividerRow}>
        <Hairline style={styles.dividerLine} />
        <Text variant="label" color="fog">
          OR
        </Text>
        <Hairline style={styles.dividerLine} />
      </View>

      <Pressable
        onPress={handleGoogle}
        disabled={busy}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && !busy && styles.secondaryButtonPressed,
        ]}
      >
        <Text variant="label" color="ghost">
          {pending === 'google' ? 'OPENING GOOGLE…' : 'CONTINUE WITH GOOGLE'}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => {
          setMethod(method === 'password' ? 'magic-link' : 'password');
          setError(null);
        }}
        style={styles.linkRow}
      >
        <Text variant="body" color="fog">
          {method === 'password' ? 'Use a magic link instead' : 'Use a password instead'}
        </Text>
      </Pressable>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Surface variant="void" style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <Text variant="mono" color="ice" style={styles.wordmark}>
          WINTER ARC
        </Text>
        {children}
      </SafeAreaView>
    </Surface>
  );
}

/** Design Law rule 6/7: a tracked-caps label over a hairline, not a pill. */
function ModeTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={styles.modeTab}
    >
      <Text variant="label" color={active ? 'bone' : 'fog'}>
        {label}
      </Text>
      <View style={[styles.modeUnderline, active && styles.modeUnderlineActive]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  wordmark: { textAlign: 'center', marginBottom: spacing.xl, letterSpacing: 4 },
  centered: { textAlign: 'center' },
  modeRow: { flexDirection: 'row', gap: spacing.xl, justifyContent: 'center' },
  modeTab: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  modeUnderline: { height: border.width, width: 48, backgroundColor: border.color },
  modeUnderlineActive: { backgroundColor: frost.ice },
  input: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: frost.bone,
    borderBottomWidth: border.width,
    borderBottomColor: border.color,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: frost.ice,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radii.sm,
    marginTop: spacing.sm,
  },
  buttonDisabled: { backgroundColor: frost.graphite },
  buttonPressed: { backgroundColor: frost.glacier },
  secondaryButton: {
    borderWidth: border.width,
    borderColor: border.color,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  secondaryButtonPressed: { backgroundColor: frost.graphite },
  linkRow: { alignItems: 'center', paddingVertical: spacing.sm },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  dividerLine: { flex: 1 },
});
