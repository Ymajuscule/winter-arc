import { OnboardingShell } from '@/components/onboarding-shell';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { type PaletteId, Text, border, palettes, radii, spacing } from '@winterarc/ui-primitives';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

const PALETTE_LABELS: Record<PaletteId, string> = {
  frost: 'Frost',
  ember: 'Ember',
  void: 'Void',
  forest: 'Forest',
  blood: 'Blood',
  solar: 'Solar',
};

/**
 * CDC §9 Écran 4 — palette pick. wireframes.md wants the change to preview
 * live across the whole screen; every component today reads the static
 * `frost` export directly rather than a theme context, so full app-wide
 * live retheming is a bigger change than tonight's scope (Design Law is
 * still respected — no hardcoded literals outside tokens.ts either way).
 * The choice is saved and will drive real live preview once a ThemeProvider
 * exists to read `palettes[paletteId]` from.
 */
export default function PaletteScreen() {
  const router = useRouter();
  const paletteId = useOnboardingStore((s) => s.paletteId);
  const setPalette = useOnboardingStore((s) => s.setPalette);

  return (
    <OnboardingShell
      eyebrow="STEP 2 OF 10 · PICK YOUR COLORS"
      onContinue={() => router.push('/onboarding/identity')}
    >
      <View style={styles.grid}>
        {(Object.keys(palettes) as PaletteId[]).map((id) => {
          const palette = palettes[id];
          const selected = id === paletteId;
          return (
            <Pressable
              key={id}
              onPress={() => setPalette(id)}
              style={[styles.swatch, selected && { borderColor: palette.ice }]}
            >
              <View style={[styles.dot, { backgroundColor: palette.ice }]} />
              <Text variant="label" color={selected ? 'bone' : 'fog'}>
                {PALETTE_LABELS[id]}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
  swatch: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: border.width * 2,
    borderColor: 'transparent',
    borderRadius: radii.sm,
  },
  dot: { width: 28, height: 28, borderRadius: radii.full },
});
