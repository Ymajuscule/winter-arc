import { OnboardingShell } from '@/components/onboarding-shell';
import { DOMAINS, DOMAINS_MAX, DOMAINS_MIN } from '@/constants/onboarding-content';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Text, border, frost, radii, spacing } from '@winterarc/ui-primitives';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

/** CDC §9 Écran 6 — "What do you want to improve?", multi-select 2-6. Emoji sanctioned here specifically (wireframes.md). */
export default function DomainsScreen() {
  const router = useRouter();
  const domainIds = useOnboardingStore((s) => s.domainIds);
  const toggleDomain = useOnboardingStore((s) => s.toggleDomain);

  const canSelectMore = domainIds.length < DOMAINS_MAX;
  const valid = domainIds.length >= DOMAINS_MIN && domainIds.length <= DOMAINS_MAX;

  return (
    <OnboardingShell
      eyebrow={`STEP 4 OF 10 · SELECT ${DOMAINS_MIN}-${DOMAINS_MAX}`}
      continueDisabled={!valid}
      onContinue={() => router.push('/onboarding/goals')}
    >
      <Text variant="title" color="bone" style={styles.question}>
        What do you want to improve?
      </Text>
      <View style={styles.chips}>
        {DOMAINS.map((d) => {
          const selected = domainIds.includes(d.id);
          const disabled = !selected && !canSelectMore;
          return (
            <Pressable
              key={d.id}
              onPress={() => toggleDomain(d.id)}
              disabled={disabled}
              style={[
                styles.chip,
                selected && styles.chipSelected,
                disabled && styles.chipDisabled,
              ]}
            >
              <Text variant="body" color={selected ? 'void' : disabled ? 'fog' : 'ghost'}>
                {d.emoji} {d.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  question: { marginBottom: spacing.xl, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: border.width,
    borderColor: border.color,
    backgroundColor: frost.graphite,
  },
  chipSelected: { backgroundColor: frost.ice, borderColor: frost.ice },
  chipDisabled: { opacity: 0.4 },
});
