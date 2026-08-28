import { Text, frost, motion, spacing } from '@winterarc/ui-primitives';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

export interface LevelUpOverlayProps {
  level: number;
  onProceed: () => void;
}

/** wireframes.md "Overlays transverses" — Level Up. Ember-tinted vignette, 640ms hero reveal, one button, never confetti. */
export function LevelUpOverlay({ level, onProceed }: LevelUpOverlayProps) {
  return (
    <Animated.View entering={FadeIn.duration(motion.duration.panel)} style={styles.backdrop}>
      <View style={styles.vignette} />
      <Animated.View
        entering={ZoomIn.duration(motion.duration.hero).easing((t) => 1 - (1 - t) ** 3)}
        style={styles.content}
      >
        <Text variant="label" color="ember">
          LEVEL UP
        </Text>
        <Text variant="hero" color="bone">
          LEVEL {level}
        </Text>
        <Pressable
          onPress={onProceed}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text variant="label" color="void">
            PROCEED
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,7,10,0.92)',
  },
  vignette: {
    ...StyleSheet.absoluteFill,
    backgroundColor: frost.ember,
    opacity: 0.06,
  },
  content: { alignItems: 'center', gap: spacing.lg },
  button: {
    backgroundColor: frost.ice,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 2,
    marginTop: spacing.md,
  },
  buttonPressed: { backgroundColor: frost.glacier },
});
