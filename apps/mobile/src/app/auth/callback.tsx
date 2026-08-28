import { completeCodeSignIn } from '@/lib/auth-flow';
import { Surface, Text, spacing } from '@winterarc/ui-primitives';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Where both the magic-link email AND the Google OAuth browser session land
 * (`winterarc://auth/callback?code=...` — `app/auth.tsx`'s
 * `emailRedirectTo`/`redirectTo`). Expo Router routes the deep link here by
 * file-based convention, handling cold-start and warm-start alike, no
 * separate `Linking` listener needed. `lib/auth-flow.ts` has the real logic
 * (exchange the code, bootstrap the returning user's profile); this screen
 * is just the loading/error states around that one async call.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError('Sign-in link is missing its code.');
      return;
    }
    let cancelled = false;
    completeCodeSignIn(code).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        router.replace('/dashboard');
      } else {
        setError(result.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  return (
    <Surface variant="void" style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <Text variant="mono" color="ice" style={styles.wordmark}>
          WINTER ARC
        </Text>
        <Text variant="body" color={error ? 'blood' : 'fog'} style={styles.status}>
          {error ?? 'SIGNING IN…'}
        </Text>
      </SafeAreaView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  wordmark: { letterSpacing: 4 },
  status: { textAlign: 'center', paddingHorizontal: spacing.xl },
});
