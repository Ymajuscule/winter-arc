import { useEffect } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { border, frost, motion, radii } from './tokens';

export interface XPBarProps extends ViewProps {
  /** 0-1 */
  progress: number;
  /** Track height in px — the dashboard hero bar is taller than an inline one. */
  height?: number;
}

/**
 * CDC §59 — "Solid" variant only (the default, always-unlocked style).
 * Gradient/Segmented/Neon/Particles/Runic are cosmetic unlocks, not built
 * yet — see winter-arc-design-system skill / TODO.md.
 */
export function XPBar({ progress, height = 6, style, ...rest }: XPBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const widthPct = useSharedValue(0);

  useEffect(() => {
    widthPct.value = withTiming(clamped * 100, { duration: motion.duration.panel });
  }, [clamped, widthPct]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${widthPct.value}%` }));

  return (
    <View style={[styles.track, { height, borderRadius: radii.sm }, style]} {...rest}>
      <Animated.View
        style={[styles.fill, { borderRadius: radii.sm }, fillStyle]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: frost.graphite,
    borderWidth: border.width,
    borderColor: border.color,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: frost.ice,
  },
});
