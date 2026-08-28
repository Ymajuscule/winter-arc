import { OnboardingShell } from '@/components/onboarding-shell';
import { DOMAINS } from '@/constants/onboarding-content';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { CLASSES, STREAK_THRESHOLD_BY_DIFFICULTY } from '@winterarc/game-engine';
import { Hairline, Text, spacing } from '@winterarc/ui-primitives';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

const ARC_LENGTH_DAYS = 90;

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** CDC §9 Écran 11 — cinematic Arc recap, purely a confirmation of prior answers. */
export default function RecapScreen() {
  const router = useRouter();
  const domainIds = useOnboardingStore((s) => s.domainIds);
  const habits = useOnboardingStore((s) => s.habits);
  const difficulty = useOnboardingStore((s) => s.difficulty);
  const classId = useOnboardingStore((s) => s.classId);

  const includedHabits = habits.filter((h) => h.included).length;
  const start = new Date();
  const end = new Date(start.getTime() + ARC_LENGTH_DAYS * 86_400_000);
  const classDef = classId ? CLASSES[classId] : null;
  const domainLabels = domainIds
    .map((id) => DOMAINS.find((d) => d.id === id))
    .filter((d): d is (typeof DOMAINS)[number] => !!d);

  return (
    <OnboardingShell
      eyebrow="YOUR WINTER ARC"
      continueLabel="Begin"
      onContinue={() => router.push('/onboarding/permissions')}
    >
      <View style={styles.block}>
        <Text variant="mono" color="ghost" style={styles.dates}>
          {formatDate(start)} → {formatDate(end)}
        </Text>
        <Text variant="hero" color="bone">
          {ARC_LENGTH_DAYS} DAYS
        </Text>
      </View>

      <Hairline style={styles.hairline} />

      <View style={styles.row}>
        <Text variant="label" color="fog">
          FOCUS
        </Text>
        <Text variant="body" color="ghost">
          {domainLabels.map((d) => `${d.emoji} ${d.label}`).join('  ·  ')}
        </Text>
      </View>

      <View style={styles.row}>
        <Text variant="label" color="fog">
          CLASS
        </Text>
        <Text variant="body" color="ghost">
          {classDef ? `${classDef.icon} ${classDef.name.toUpperCase()}` : 'WANDERER'}
        </Text>
      </View>

      <View style={styles.row}>
        <Text variant="label" color="fog">
          DIFFICULTY
        </Text>
        <Text variant="body" color="ghost">
          {difficulty.toUpperCase()} · {STREAK_THRESHOLD_BY_DIFFICULTY[difficulty]}%
        </Text>
      </View>

      <Hairline style={styles.hairline} />

      <View style={styles.statsRow}>
        <Text variant="mono" color="ice">
          Habits: {includedHabits}
        </Text>
        <Text variant="mono" color="ice">
          Weekly Quests: 3
        </Text>
        <Text variant="mono" color="ice">
          Monthly Boss: 1
        </Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  block: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xl },
  dates: {},
  hairline: { marginVertical: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
