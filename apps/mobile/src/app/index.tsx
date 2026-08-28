import { useAppStore } from '@/stores/app-store';
import { Surface, Text, frost, motion, spacing } from '@winterarc/ui-primitives';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * CDC §9 Écran 1 — Splash / Welcome. wireframes.md: void background, no
 * spinner (Design Law: no shimmer/skeleton), text + CTAs appear immediately.
 * The 3-5s video loop it describes needs a real asset this session doesn't
 * have — the glow/silhouette treatment is deferred, text-only for now.
 */
export default function SplashScreen() {
  const router = useRouter();
  const onboarded = useAppStore((s) => s.onboarded);

  // Returning user (already has a local profile) — skip straight to the loop.
  if (onboarded) return <Redirect href="/dashboard" />;

  return (
    <Surface variant="void" style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View entering={FadeIn.duration(motion.duration.hero)} style={styles.hero}>
          <Text variant="display" color="bone" style={styles.title}>
            Build your{'\n'}Winter Arc.
          </Text>
          <Text variant="body" color="fog" style={styles.subtitle}>
            Transform your next 90 days.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(motion.duration.panel).duration(motion.duration.panel)}
          style={styles.actions}
        >
          <Pressable
            onPress={() => router.push('/onboarding/manifesto')}
            style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
          >
            <Text variant="label" color="void">
              GET STARTED
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push('/auth')} style={styles.secondary}>
            <Text variant="body" color="fog">
              Sign In
            </Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'space-between', paddingHorizontal: spacing.xl },
  hero: { flex: 1, justifyContent: 'center' },
  title: { lineHeight: 40 },
  subtitle: { marginTop: spacing.md },
  actions: { paddingBottom: spacing.xl, gap: spacing.md },
  primary: {
    backgroundColor: frost.ice,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 2,
  },
  primaryPressed: { backgroundColor: frost.glacier },
  secondary: { alignItems: 'center', paddingVertical: spacing.sm },
});
