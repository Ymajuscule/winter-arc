import { useAppStore } from '@/stores/app-store';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Frame, Surface, Text, frost, motion, spacing } from '@winterarc/ui-primitives';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * CDC §9 Écran 13 — first reward reveal, then enters the dashboard with an
 * already-unique profile (CDC §8's golden rule: something visually theirs
 * before the app proper). Initializes app-store from every onboarding
 * answer collected so far.
 */
export default function RewardScreen() {
  const router = useRouter();
  const onboarding = useOnboardingStore();
  const initializeFromOnboarding = useAppStore((s) => s.initializeFromOnboarding);

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
          onPress={() => {
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
          }}
          style={({ pressed }) => [styles.enter, pressed && styles.enterPressed]}
        >
          <Text variant="label" color="void">
            ENTER
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
});
