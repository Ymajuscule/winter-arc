import { OnboardingShell } from '@/components/onboarding-shell';
import { DOMAINS, GOALS_BY_DOMAIN, GOALS_MAX, GOALS_MIN } from '@/constants/onboarding-content';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Text, border, frost, radii, spacing } from '@winterarc/ui-primitives';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

/** CDC §9 Écran 7 — one card per selected domain, paginated internally within this one route. */
export default function GoalsScreen() {
  const router = useRouter();
  const domainIds = useOnboardingStore((s) => s.domainIds);
  const goalIdsByDomain = useOnboardingStore((s) => s.goalIdsByDomain);
  const toggleGoal = useOnboardingStore((s) => s.toggleGoal);
  const [index, setIndex] = useState(0);

  const domainId = domainIds[index];
  const domain = DOMAINS.find((d) => d.id === domainId);
  const goals = domainId ? (GOALS_BY_DOMAIN[domainId] ?? []) : [];
  const selectedGoals = domainId ? (goalIdsByDomain[domainId] ?? []) : [];
  const valid = selectedGoals.length >= GOALS_MIN && selectedGoals.length <= GOALS_MAX;
  const isLast = index === domainIds.length - 1;

  return (
    <OnboardingShell
      eyebrow={`${domain?.label.toUpperCase() ?? ''} · PICK ${GOALS_MIN}-${GOALS_MAX}`}
      continueLabel={isLast ? 'Continue' : 'Next domain'}
      continueDisabled={!valid}
      onContinue={() => {
        if (isLast) {
          router.push('/onboarding/habits');
        } else {
          setIndex((i) => i + 1);
        }
      }}
    >
      <View style={styles.list}>
        {goals.map((g) => {
          const selected = selectedGoals.includes(g.id);
          return (
            <Pressable
              key={g.id}
              onPress={() => domainId && toggleGoal(domainId, g.id)}
              style={[styles.row, selected && styles.rowSelected]}
            >
              <View style={[styles.checkbox, selected && styles.checkboxSelected]} />
              <Text variant="body" color={selected ? 'bone' : 'ghost'}>
                {g.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.progress}>
        {domainIds.map((id) => (
          <View key={id} style={[styles.dot, id === domainId && styles.dotActive]} />
        ))}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowSelected: {},
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: radii.sm,
    borderWidth: border.width * 2,
    borderColor: border.color,
  },
  checkboxSelected: { backgroundColor: frost.ice, borderColor: frost.ice },
  progress: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    marginTop: spacing['2xl'],
  },
  dot: { width: 6, height: 6, borderRadius: radii.full, backgroundColor: frost.graphite },
  dotActive: { backgroundColor: frost.ice },
});
