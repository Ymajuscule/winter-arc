import { OnboardingShell } from '@/components/onboarding-shell';
import { AVATARS } from '@/constants/onboarding-content';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Emblem, Text, frost, spacing } from '@winterarc/ui-primitives';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

/** CDC §9 Écran 3 — 12 starter avatars, grid select. */
export default function AvatarScreen() {
  const router = useRouter();
  const avatarId = useOnboardingStore((s) => s.avatarId);
  const setAvatar = useOnboardingStore((s) => s.setAvatar);
  const selected = AVATARS.find((a) => a.id === avatarId);

  return (
    <OnboardingShell
      eyebrow="STEP 1 OF 10 · CHOOSE YOUR START"
      continueLabel="Continue"
      continueDisabled={!avatarId}
      onContinue={() => router.push('/onboarding/palette')}
    >
      <View style={styles.grid}>
        {AVATARS.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => setAvatar(a.id)}
            style={styles.slot}
            accessibilityLabel={a.name}
          >
            <Emblem
              glyph={a.name.replace('The ', '')}
              size={48}
              color={avatarId === a.id ? 'ice' : 'fog'}
              style={avatarId === a.id ? styles.selectedRing : undefined}
            />
          </Pressable>
        ))}
      </View>
      {selected ? (
        <View style={styles.detail}>
          <Text variant="title" color="bone">
            {selected.name}
          </Text>
          <Text variant="body" color="fog">
            {selected.description}
          </Text>
        </View>
      ) : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    justifyContent: 'center',
  },
  slot: { alignItems: 'center' },
  selectedRing: { borderColor: frost.ice, borderWidth: 2 },
  detail: { marginTop: spacing['2xl'], alignItems: 'center', gap: spacing.xs },
});
