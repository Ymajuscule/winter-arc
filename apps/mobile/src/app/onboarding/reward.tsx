import { api } from '@/services/api';
import { useAppStore } from '@/stores/app-store';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useSessionStore } from '@/stores/session-store';
import { Frame, Surface, Text, frost, motion, spacing } from '@winterarc/ui-primitives';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * CDC §9 Écran 13 — first reward reveal, then enters the dashboard with an
 * already-unique profile (CDC §8's golden rule: something visually theirs
 * before the app proper).
 *
 * Two paths on ENTER (2026-08-28 continuation 4 — Supabase is linked now):
 * - **Signed in already** (visited /auth before or during onboarding):
 *   calls `bootstrap-profile` and seeds app-store from the server's
 *   response (real UUIDs, cloud-synced from the first habit tap onward).
 * - **Not signed in**: CDC §13's demo mode — unchanged local-only init.
 * A failed bootstrap call falls back to demo mode rather than stranding
 * the user on this screen — logged, not surfaced as a blocking error,
 * since Day Zero shouldn't be gate-kept by a network hiccup.
 */
export default function RewardScreen() {
  const router = useRouter();
  const onboarding = useOnboardingStore();
  const initializeFromOnboarding = useAppStore((s) => s.initializeFromOnboarding);
  const initializeFromServer = useAppStore((s) => s.initializeFromServer);
  const session = useSessionStore((s) => s.session);
  const [entering, setEntering] = useState(false);

  async function handleEnter() {
    if (entering) return;
    setEntering(true);

    if (session) {
      try {
        const response = await api.bootstrapProfile({
          username: onboarding.username || 'wanderer',
          difficulty: onboarding.difficulty,
          classId: onboarding.classId,
          avatarId: onboarding.avatarId,
          habits: onboarding.habits
            .filter((h) => h.included)
            .map((h) => ({ name: h.name, category: h.category })),
        });
        initializeFromServer(response, {
          paletteId: onboarding.paletteId,
          difficulty: onboarding.difficulty,
        });
        onboarding.complete();
        router.replace('/dashboard');
        return;
      } catch (err) {
        console.warn('[reward] bootstrap-profile failed, falling back to demo mode:', err);
      }
    }

    initializeFromOnboarding({
      username: onboarding.username || 'wanderer',
      avatarId: onboarding.avatarId,
      paletteId: onboarding.paletteId,
      classId: onboarding.classId,
      difficulty: onboarding.difficulty,
      habits: onboarding.habits.filter((h) => h.included),
    });
    onboarding.complete();
    router.replace('/dashboard');
  }

  return (
    <Surface variant="void" style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View entering={FadeIn.duration(motion.duration.hero)} style={styles.content}>
          <Frame tier="iron" size={96}>
            <Text variant="display" color="bone">
              {(onboarding.firstName || '?').charAt(0).toUpperCase()}
            </Text>
          </Frame>

          <Animated.View
            entering={FadeIn.delay(motion.duration.hero).duration(motion.duration.panel)}
          >
            <Text variant="label" color="fog" style={styles.centered}>
              TITLE
            </Text>
            <Text variant="title" color="ice" style={styles.centered}>
              The Awakened
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeIn.delay(motion.duration.hero + motion.duration.panel).duration(
              motion.duration.panel,
            )}
          >
            <Text variant="label" color="fog" style={styles.centered}>
              FRAME
            </Text>
            <Text variant="title" color="ghost" style={styles.centered}>
              Iron Frame
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeIn.delay(motion.duration.hero + motion.duration.panel * 2).duration(
              motion.duration.panel,
            )}
          >
            <Text variant="label" color="fog" style={styles.centered}>
              ACHIEVEMENT
            </Text>
            <Text variant="title" color="ghost" style={styles.centered}>
              Day Zero
            </Text>
          </Animated.View>
        </Animated.View>

        <Pressable
          onPress={handleEnter}
          disabled={entering}
          style={({ pressed }) => [
            styles.enter,
            pressed && !entering && styles.enterPressed,
            entering && styles.enterDisabled,
          ]}
        >
          <Text variant="label" color={entering ? 'fog' : 'void'}>
            {entering ? 'ENTERING…' : 'ENTER'}
          </Text>
        </Pressable>
      </SafeAreaView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'space-between', paddingHorizontal: spacing.xl },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  centered: { textAlign: 'center' },
  enter: {
    backgroundColor: frost.ice,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 2,
    marginBottom: spacing.xl,
  },
  enterPressed: { backgroundColor: frost.glacier },
  enterDisabled: { backgroundColor: frost.graphite },
});
