import { OnboardingShell } from '@/components/onboarding-shell';
import { DOMAINS, GOALS_BY_DOMAIN } from '@/constants/onboarding-content';
import { type HabitDraft, useOnboardingStore } from '@/stores/onboarding-store';
import { CheckIcon, Text, border, frost, radii, spacing } from '@winterarc/ui-primitives';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

function suggestHabits(
  domainIds: string[],
  goalIdsByDomain: Record<string, string[]>,
): HabitDraft[] {
  const drafts: HabitDraft[] = [];
  for (const domainId of domainIds) {
    const domain = DOMAINS.find((d) => d.id === domainId);
    const goalIds = goalIdsByDomain[domainId] ?? [];
    const goals = GOALS_BY_DOMAIN[domainId] ?? [];
    for (const goalId of goalIds) {
      const goal = goals.find((g) => g.id === goalId);
      if (!goal || !domain) continue;
      drafts.push({
        id: `${domainId}-${goalId}`,
        name: goal.label,
        category: domain.label,
        included: true,
      });
    }
  }
  return drafts;
}

/** CDC §9 Écran 8 — 7-10 suggested habits generated from prior answers, editable. */
export default function HabitsScreen() {
  const router = useRouter();
  const domainIds = useOnboardingStore((s) => s.domainIds);
  const goalIdsByDomain = useOnboardingStore((s) => s.goalIdsByDomain);
  const habits = useOnboardingStore((s) => s.habits);
  const setHabits = useOnboardingStore((s) => s.setHabits);
  const toggleHabit = useOnboardingStore((s) => s.toggleHabit);
  const addCustomHabit = useOnboardingStore((s) => s.addCustomHabit);
  const [customName, setCustomName] = useState('');

  // biome-ignore lint/correctness/useExhaustiveDependencies: seeds once on mount only, re-running on every domain/goal store update would clobber the user's own edits
  useEffect(() => {
    if (habits.length === 0) {
      setHabits(suggestHabits(domainIds, goalIdsByDomain));
    }
  }, []);

  const includedCount = habits.filter((h) => h.included).length;

  return (
    <OnboardingShell
      eyebrow="STEP 6 OF 10 · YOUR HABITS"
      continueDisabled={includedCount === 0}
      onContinue={() => router.push('/onboarding/difficulty')}
    >
      <View style={styles.list}>
        {habits.map((h) => (
          <Pressable key={h.id} onPress={() => toggleHabit(h.id)} style={styles.row}>
            <View style={[styles.checkbox, h.included && styles.checkboxOn]}>
              {h.included ? <CheckIcon size={12} color={frost.void} /> : null}
            </View>
            <View style={styles.rowText}>
              <Text variant="body" color={h.included ? 'bone' : 'fog'}>
                {h.name}
              </Text>
              <Text variant="label" color="fog">
                {h.category.toUpperCase()}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
      <View style={styles.addRow}>
        <TextInput
          value={customName}
          onChangeText={setCustomName}
          placeholder="+ Add habit"
          placeholderTextColor={frost.fog}
          style={styles.addInput}
          onSubmitEditing={() => {
            if (customName.trim()) {
              addCustomHabit(customName.trim(), 'Custom');
              setCustomName('');
            }
          }}
        />
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radii.sm,
    borderWidth: border.width * 2,
    borderColor: border.color,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: frost.ice, borderColor: frost.ice },
  rowText: { gap: 2 },
  addRow: { marginTop: spacing.lg },
  addInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: frost.ghost,
    paddingVertical: spacing.sm,
  },
});
