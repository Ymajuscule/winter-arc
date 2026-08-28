import { StyleSheet, View, type ViewProps } from 'react-native';
import { Text } from './Text.js';
import { FlameIcon } from './icons/FlameIcon.js';
import { frost, spacing } from './tokens.js';

export interface StreakFlameProps extends ViewProps {
  days: number;
  size?: number;
}

/**
 * CDC §58 — 8 color/style tiers by streak length. No particle/halo FX yet
 * (needs Skia, see winter-arc-design-system skill) — color progression only.
 */
function tierColor(days: number): keyof typeof frost {
  if (days >= 365) return 'aurora'; // eternal flame — closest token to gold/red mix available
  if (days >= 200) return 'bone'; // diamond
  if (days >= 100) return 'bone'; // white core — same token, animation would differ (not built)
  if (days >= 60) return 'aurora'; // violet halo
  if (days >= 30) return 'ice'; // cold blue
  if (days >= 14) return 'ember'; // red-orange w/ particles (particles not built)
  if (days >= 7) return 'ember'; // bigger orange
  if (days >= 1) return 'blood'; // small red
  return 'fog'; // no streak
}

export function StreakFlame({ days, size = 20, style, ...rest }: StreakFlameProps) {
  const color = frost[tierColor(days)];
  return (
    <View style={[styles.row, style]} {...rest}>
      <FlameIcon size={size} color={color} />
      <Text variant="mono" color="ghost">
        {days}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
