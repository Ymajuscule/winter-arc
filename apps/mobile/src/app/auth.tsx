import { isSupabaseConfigured, supabase } from '@/services/supabase';
import { Surface, Text, frost, spacing } from '@winterarc/ui-primitives';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * CDC §10 / CLAUDE.md §3 — "void background, mono WINTER ARC wordmark,
 * single input, single button. No signup/login toggle — one field figures
 * it out." Magic link only for now — Apple/Google/GitHub need their own
 * OAuth setup, not stubbed as dead buttons here.
 *
 * Real `signInWithOtp` call (2026-08-28, continuation 4 — Supabase is
 * linked now). `emailRedirectTo` uses the app's own scheme (`winterarc://`,
 * app.json) so the magic link reopens the app instead of a browser. Landing
 * back in the app and exchanging the link for a session is now handled too
 * (2026-08-28, continuation 6 — `lib/auth-deep-link.ts`, wired from the root
 * layout): it fetches the returning user's real profile via
 * `bootstrap-profile` and jumps straight to the dashboard, no re-onboarding.
 * `session-store.ts`'s `onAuthStateChange` listener picks up the session
 * itself, this screen doesn't need to know any of that happened.
 *
 * Still needed from Julien: the `winterarc://` redirect URL must be
 * registered in the Supabase dashboard's Auth -> URL Configuration ->
 * Redirect URLs — not settable via this session's tools.
 */
export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = email.includes('@') && !sending;

  async function handleSend() {
    if (!canSend || !supabase) return;
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
    setSent(true);
  }

  return (
    <Surface variant="void" style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <Text variant="mono" color="ice" style={styles.wordmark}>
          WINTER ARC
        </Text>

        {!isSupabaseConfigured ? (
          <Text variant="body" color="blood" style={styles.sentMessage}>
            Sign-in isn't configured yet.
          </Text>
        ) : sent ? (
          <Text variant="body" color="ghost" style={styles.sentMessage}>
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
            {error ? (
              <Text variant="body" color="blood" style={styles.sentMessage}>
                {error}
              </Text>
            ) : null}
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              style={({ pressed }) => [
                styles.button,
                !canSend && styles.buttonDisabled,
                pressed && canSend && styles.buttonPressed,
              ]}
            >
              <Text variant="label" color={canSend ? 'void' : 'fog'}>
                {sending ? 'SENDING…' : 'SEND LINK'}
              </Text>
            </Pressable>
          </>
        )}
      </SafeAreaView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
  wordmark: { textAlign: 'center', marginBottom: spacing['2xl'], letterSpacing: 4 },
  input: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: frost.bone,
    borderBottomWidth: 1,
    borderBottomColor: frost.graphite,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
  button: {
    backgroundColor: frost.ice,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 2,
  },
  buttonDisabled: { backgroundColor: frost.graphite },
  buttonPressed: { backgroundColor: frost.glacier },
  sentMessage: { textAlign: 'center' },
});
