import { OnboardingShell } from '@/components/onboarding-shell';
import type { Difficulty } from '@/stores/onboarding-store';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { STREAK_THRESHOLD_BY_DIFFICULTY } from '@winterarc/game-engine';
import { Text, border, frost, radii, spacing } from '@winterarc/ui-primitives';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'extreme'];

/** CDC §9 Écran 9 — difficulty tiers, thresholds from game-engine (single source of truth with award-habit-xp/advance-streak). */
export default function DifficultyScreen() {
  const router = useRouter();
  const difficulty = useOnboardingStore((s) => s.difficulty);
  const setDifficulty = useOnboardingStore((s) => s.setDifficulty);

  return (
    <OnboardingShell
      eyebrow="STEP 7 OF 10 · HOW HARD?"
      onContinue={() => router.push('/onboarding/class')}
    >
      <View style={styles.list}>
        {DIFFICULTIES.map((d) => {
          const selected = d === difficulty;
          return (
            <Pressable
              key={d}
              onPress={() => setDifficulty(d)}
              style={[styles.row, selected && styles.rowSelected]}
            >
              <View style={[styles.radio, selected && styles.radioSelected]} />
              <Text variant="title" color={selected ? 'bone' : 'ghost'} style={styles.label}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </Text>
              <Text variant="mono" color="fog">
                {STREAK_THRESHOLD_BY_DIFFICULTY[d]}%
              </Text>
            </Pressable>
          );
        })}
      </View>
      {difficulty === 'extreme' ? (
        <Text variant="body" color="blood" style={styles.warning}>
          One missed day breaks your streak, no grace.
        </Text>
      ) : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowSelected: {},
  radio: {
    width: 16,
    height: 16,
    borderRadius: radii.full,
    borderWidth: border.width * 2,
    borderColor: border.color,
  },
  radioSelected: { borderColor: frost.ice, backgroundColor: frost.ice },
  label: { flex: 1 },
  warning: { marginTop: spacing.lg, textAlign: 'center' },
});
