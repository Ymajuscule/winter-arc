import { Surface, Text, border, frost, motion, radii, spacing } from '@winterarc/ui-primitives';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface OnboardingShellProps {
  /** Small tracked-caps label above the content — e.g. "STEP 3 OF 13". */
  eyebrow?: string;
  children: ReactNode;
  continueLabel?: string;
  onContinue: () => void;
  continueDisabled?: boolean;
  /** Secondary, lower-emphasis action below the primary CTA (e.g. "Stay Wanderer"). */
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/**
 * Shared shell for the 13 onboarding screens (CDC §9) — top-third identity/
 * label, middle content, bottom-third single action, per cinematic-ui's
 * composition rule. One implementation so all 13 screens agree on spacing
 * and the Continue button instead of 13 near-duplicates.
 */
export function OnboardingShell({
  eyebrow,
  children,
  continueLabel = 'Continue',
  onContinue,
  continueDisabled,
  secondaryLabel,
  onSecondary,
}: OnboardingShellProps) {
  return (
    <Surface variant="void" style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        {eyebrow ? (
          <Text variant="label" color="fog" style={styles.eyebrow}>
            {eyebrow}
          </Text>
        ) : null}
        <Animated.View entering={FadeIn.duration(motion.duration.panel)} style={styles.content}>
          {children}
        </Animated.View>
        <View style={styles.actions}>
          <Pressable
            onPress={onContinue}
            disabled={continueDisabled}
            style={({ pressed }) => [
              styles.primaryButton,
              continueDisabled && styles.primaryButtonDisabled,
              pressed && !continueDisabled && styles.primaryButtonPressed,
            ]}
          >
            <Text variant="label" color={continueDisabled ? 'fog' : 'void'}>
              {continueLabel.toUpperCase()}
            </Text>
          </Pressable>
          {secondaryLabel && onSecondary ? (
            <Pressable onPress={onSecondary} style={styles.secondaryButton}>
              <Text variant="body" color="fog">
                {secondaryLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: spacing.xl },
  eyebrow: { paddingTop: spacing.lg },
  content: { flex: 1, justifyContent: 'center' },
  actions: { paddingBottom: spacing.xl, gap: spacing.md },
  primaryButton: {
    backgroundColor: frost.ice,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  primaryButtonPressed: { backgroundColor: frost.glacier },
  primaryButtonDisabled: {
    backgroundColor: frost.graphite,
    borderWidth: border.width,
    borderColor: border.color,
  },
  secondaryButton: { alignItems: 'center', paddingVertical: spacing.sm },
});
