import { bootstrapAndEnterDashboard } from '@/lib/auth-flow';
import { isSupabaseConfigured, supabase } from '@/services/supabase';
import { Hairline, Surface, Text, frost, spacing } from '@winterarc/ui-primitives';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PasswordMode = 'signin' | 'signup';

/**
 * Julien asked directly for password + Google too (2026-08-28, continuation
 * 7). Turns out this isn't actually a CDC deviation: the CDC's own §107
 * architecture section always said "Supabase Auth (magic link + Apple/
 * Google)" — "magic link only for now" was this codebase's own prior
 * scoping decision (continuation 4's file header, since Apple/Google need
 * their own OAuth setup), and "no signup/login toggle — one field figures
 * it out" was never a CDC quote at all, just this screen's own comment —
 * there's no dedicated auth-screen wireframe in wireframes.md, only the
 * splash screen's "Sign In" CTA. So this adds password + Google without
 * contradicting anything actually specified; Apple sign-in is the one part
 * of §107's original list still not built.
 *
 * Three methods, prioritized by how new they are / how much setup they
 * need: password (primary — the two fields on screen), Google (secondary,
 * one tap), magic link (kept working, tucked behind a link at the bottom
 * since continuation 6 already built it and it still needs zero new UI).
 *
 * Password sign-up needs Supabase's own email-confirmation flow if that's
 * enabled on the project (dashboard default) — `data.session` comes back
 * null in that case and this screen shows a "check your email" state
 * identical in spirit to magic link's, distinct from the case where password
 * sign-in returns a session immediately (bootstrap + straight to dashboard).
 *
 * Google needs `redirectTo: 'winterarc://auth/callback'` (same route as
 * magic link — `lib/auth-flow.ts`'s `completeCodeSignIn` handles both) and
 * `skipBrowserRedirect: true` (RN has no `window.location`), then
 * `expo-web-browser`'s `openAuthSessionAsync` presents the actual browser
 * sheet and resolves once it closes — the deep link itself is what drives
 * `app/auth/callback.tsx`, this call is just "wait for the sheet to close
 * so the button can stop showing a loading state".
 *
 * Still needed from Julien, none of this session's tools reach it: (1) the
 * `winterarc://` redirect URL registered in the Supabase dashboard's Auth ->
 * URL Configuration (unchanged ask from continuation 6); (2) a Google OAuth
 * client (Google Cloud Console) wired into the Supabase dashboard's Auth ->
 * Providers -> Google — without it the Google button's `signInWithOAuth`
 * call fails with a provider-not-enabled error, not a crash, but it can't
 * actually be exercised from this session either way.
 */
export default function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordMode, setPasswordMode] = useState<PasswordMode>('signin');
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmitPassword = email.includes('@') && password.length >= 6 && !sending;
  const canSendMagicLink = email.includes('@') && !sending;

  async function enterApp() {
    const result = await bootstrapAndEnterDashboard();
    if (result.ok) {
      router.replace('/dashboard');
    } else {
      setError(result.message);
    }
  }

  async function handlePasswordSubmit() {
    if (!canSubmitPassword || !supabase) return;
    setSending(true);
    setError(null);

    const { data, error: authError } =
      passwordMode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: 'winterarc://auth/callback' },
          });

    if (authError) {
      setSending(false);
      setError(authError.message);
      return;
    }
    if (!data.session) {
      // Sign-up with email confirmation required on this project — nothing
      // to enter yet, matches magic link's "check your email" shape.
      setSending(false);
      setAwaitingEmailConfirmation(true);
      return;
    }
    await enterApp();
    setSending(false);
  }

  async function handleGoogleSignIn() {
    if (!supabase) return;
    setSending(true);
    setError(null);
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'winterarc://auth/callback', skipBrowserRedirect: true },
    });
    if (oauthError || !data.url) {
      setSending(false);
      setError(oauthError?.message ?? 'Could not start Google sign-in.');
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(data.url, 'winterarc://auth/callback');
    setSending(false);
    // A cancelled/dismissed sheet isn't an error to surface — the deep link
    // (app/auth/callback.tsx) is what actually completes sign-in on success.
    if (result.type !== 'success') return;
  }

  async function handleSendMagicLink() {
    if (!canSendMagicLink || !supabase) return;
    setSending(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'winterarc://auth/callback' },
    });
    setSending(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    setMagicLinkSent(true);
  }

  if (!isSupabaseConfigured) {
    return (
      <Surface variant="void" style={styles.root}>
        <SafeAreaView style={styles.safeArea}>
          <Text variant="mono" color="ice" style={styles.wordmark}>
            WINTER ARC
          </Text>
          <Text variant="body" color="blood" style={styles.centered}>
            Sign-in isn't configured yet.
          </Text>
        </SafeAreaView>
      </Surface>
    );
  }

  return (
    <Surface variant="void" style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <Text variant="mono" color="ice" style={styles.wordmark}>
          WINTER ARC
        </Text>

        {awaitingEmailConfirmation ? (
          <Text variant="body" color="ghost" style={styles.centered}>
            Check {email} to confirm your account.
          </Text>
        ) : magicLinkSent ? (
          <Text variant="body" color="ghost" style={styles.centered}>
            Check {email} for your link.
          </Text>
        ) : (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={frost.fog}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            {showMagicLink ? null : (
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="password"
                placeholderTextColor={frost.fog}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            )}
            {error ? (
              <Text variant="body" color="blood" style={styles.centered}>
                {error}
              </Text>
            ) : null}

            {showMagicLink ? (
              <>
                <Pressable
                  onPress={handleSendMagicLink}
                  disabled={!canSendMagicLink}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    !canSendMagicLink && styles.buttonDisabled,
                    pressed && canSendMagicLink && styles.buttonPressed,
                  ]}
                >
                  <Text variant="label" color={canSendMagicLink ? 'void' : 'fog'}>
                    {sending ? 'SENDING…' : 'SEND LINK'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => setShowMagicLink(false)} style={styles.linkRow}>
                  <Text variant="body" color="fog">
                    Use password instead
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={handlePasswordSubmit}
                  disabled={!canSubmitPassword}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    !canSubmitPassword && styles.buttonDisabled,
                    pressed && canSubmitPassword && styles.buttonPressed,
                  ]}
                >
                  <Text variant="label" color={canSubmitPassword ? 'void' : 'fog'}>
                    {sending
                      ? passwordMode === 'signin'
                        ? 'SIGNING IN…'
                        : 'CREATING ACCOUNT…'
                      : passwordMode === 'signin'
                        ? 'SIGN IN'
                        : 'CREATE ACCOUNT'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setPasswordMode(passwordMode === 'signin' ? 'signup' : 'signin')}
                  style={styles.linkRow}
                >
                  <Text variant="body" color="fog">
                    {passwordMode === 'signin'
                      ? 'New here? Create account'
                      : 'Already have an account? Sign in'}
                  </Text>
                </Pressable>
              </>
            )}

            <View style={styles.dividerRow}>
              <Hairline style={styles.dividerLine} />
              <Text variant="label" color="fog">
                OR
              </Text>
              <Hairline style={styles.dividerLine} />
            </View>

            <Pressable
              onPress={handleGoogleSignIn}
              disabled={sending}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && !sending && styles.secondaryButtonPressed,
              ]}
            >
              <Text variant="label" color="ghost">
                CONTINUE WITH GOOGLE
              </Text>
            </Pressable>

            {showMagicLink ? null : (
              <Pressable onPress={() => setShowMagicLink(true)} style={styles.linkRow}>
                <Text variant="body" color="fog">
                  Use a magic link instead
                </Text>
              </Pressable>
            )}
          </>
        )}
      </SafeAreaView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  wordmark: { textAlign: 'center', marginBottom: spacing.xl, letterSpacing: 4 },
  centered: { textAlign: 'center' },
  input: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: frost.bone,
    borderBottomWidth: 1,
    borderBottomColor: frost.graphite,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: frost.ice,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 2,
    marginTop: spacing.sm,
  },
  buttonDisabled: { backgroundColor: frost.graphite },
  buttonPressed: { backgroundColor: frost.glacier },
  secondaryButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: frost.graphite,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 2,
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
