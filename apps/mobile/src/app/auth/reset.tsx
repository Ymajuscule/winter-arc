import { resolvePostSignIn } from '@/lib/auth-flow';
import { supabase } from '@/services/supabase';
import { Surface, Text, border, frost, radii, spacing } from '@winterarc/ui-primitives';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Where a password-recovery email lands (`winterarc://auth/reset?code=…`,
 * set by `auth.tsx`'s `resetPasswordForEmail`).
 *
 * A separate route from `auth/callback.tsx` on purpose. Both arrive as the
 * same PKCE `?code=`, and the session that comes back from exchanging one
 * carries nothing that says "this came from a recovery email" — so routing
 * both through the shared callback would sign the user in and silently drop
 * them on the dashboard with the password they've forgotten still set. The
 * route itself is the only durable signal, so it carries the meaning.
 *
 * Exchanging the code is what authorises `updateUser({ password })`: Supabase
 * applies it to the session's own user, which is precisely the account the
 * emailed link proves ownership of.
 */

const MIN_PASSWORD_LENGTH = 8;

export default function AuthResetScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [exchanged, setExchanged] = useState(false);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }
    if (!code) {
      setError('This reset link is missing its code.');
      return;
    }
    let cancelled = false;
    supabase.auth.exchangeCodeForSession(code).then(({ data, error: exchangeError }) => {
      if (cancelled) return;
      if (exchangeError || !data.session) {
        setError(exchangeError?.message ?? 'This reset link is invalid or has expired.');
        return;
      }
      setExchanged(true);
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const canSave = exchanged && password.length >= MIN_PASSWORD_LENGTH && !saving;

  async function handleSave() {
    if (!canSave || !supabase) return;
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }
    // The recovery session is a real session, so the user is already signed
    // in — send them wherever they belong rather than back to a login screen
    // they'd have nothing left to type into.
    const result = await resolvePostSignIn();
    setSaving(false);
    if (result.ok) router.replace(result.destination);
    else setError(result.message);
  }

  return (
    <Surface variant="void" style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <Text variant="mono" color="ice" style={styles.wordmark}>
          WINTER ARC
        </Text>

        {error ? (
          <>
            <Text variant="body" color="blood" style={styles.centered}>
              {error}
            </Text>
            <Pressable onPress={() => router.replace('/auth')} style={styles.linkRow}>
              <Text variant="body" color="fog">
                Back to sign in
              </Text>
            </Pressable>
          </>
        ) : !exchanged ? (
          <Text variant="body" color="fog" style={styles.centered}>
            CHECKING YOUR LINK…
          </Text>
        ) : (
          <>
            <Text variant="label" color="fog" style={styles.centered}>
              SET A NEW PASSWORD
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={`new password · ${MIN_PASSWORD_LENGTH}+ characters`}
              placeholderTextColor={frost.fog}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              style={styles.input}
              accessibilityLabel="New password"
            />
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryButton,
                !canSave && styles.buttonDisabled,
                pressed && canSave && styles.buttonPressed,
              ]}
            >
              <Text variant="label" color={canSave ? 'void' : 'fog'}>
                {saving ? 'SAVING…' : 'SET PASSWORD'}
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
  safeArea: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  wordmark: { textAlign: 'center', marginBottom: spacing.xl, letterSpacing: 4 },
  centered: { textAlign: 'center' },
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
  linkRow: { alignItems: 'center', paddingVertical: spacing.sm },
});
