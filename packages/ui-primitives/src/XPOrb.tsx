import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Text } from './Text.js';
import { motion } from './tokens.js';

export interface XPOrbProps {
  amount: number;
  /** Increment this from the caller to re-fire the popup (e.g. on every habit completion). */
  trigger: number;
}

/**
 * CDC §15 / wireframes.md "XP popup" overlay — floats "+N XP" above the
 * tapped habit, fades + drifts up, disappears. cinematic-ui skill: this is
 * the *one* place spring physics is allowed (an XP orb "absorbing" should
 * read as impact, not playfulness) — everything else in the app uses the
 * mechanical out-expo/in-expo easings from tokens.motion.
 */
export function XPOrb({ amount, trigger }: XPOrbProps) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  // biome-ignore lint/correctness/useExhaustiveDependencies: shared values are stable refs from useSharedValue, intentionally re-firing only on `trigger`
  useEffect(() => {
    if (trigger === 0) return;
    translateY.value = 0;
    scale.value = 0.8;
    opacity.value = 1;
    scale.value = withSpring(1, { damping: 8, stiffness: 220 });
    translateY.value = withTiming(-28, {
      duration: motion.duration.hero,
      easing: Easing.bezier(...motion.easing.outExpo),
    });
    opacity.value = withDelay(
      motion.duration.panel,
      withTiming(0, { duration: motion.duration.panel }),
    );
  }, [trigger]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, style]} pointerEvents="none">
      <Text variant="mono" color="ice">
        +{amount} XP
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignSelf: 'center',
  },
});
