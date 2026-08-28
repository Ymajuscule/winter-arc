import { StyleSheet, View, type ViewProps } from 'react-native';
import { Text } from './Text';
import { border, frost, radii, spacing } from './tokens';

export interface LevelBadgeProps extends ViewProps {
  level: number;
  /** Prestige rank tints the border — 0 = no prestige (Frost default). CDC §23. */
  prestigeRank?: number;
}

const PRESTIGE_BORDER_COLOR: readonly (keyof typeof frost)[] = [
  'fog', // 0 — no prestige
  'ice',
  'glacier',
  'ember',
  'aurora',
];

/** CDC §60 — sober typography variant only; gothic/futuristic/calligraphic faces are cosmetic unlocks, not built yet. */
export function LevelBadge({ level, prestigeRank = 0, style, ...rest }: LevelBadgeProps) {
  const tint = PRESTIGE_BORDER_COLOR[Math.min(prestigeRank, PRESTIGE_BORDER_COLOR.length - 1)];
  return (
    <View
      style={[styles.badge, { borderColor: frost[tint ?? 'fog'] }, style]}
      accessibilityLabel={`Level ${level}`}
      {...rest}
    >
      <Text variant="label" color="fog">
        LVL
      </Text>
      <Text variant="mono" color="bone" style={styles.number}>
        {level}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: border.width * 2,
    borderRadius: radii.sm,
    backgroundColor: frost.obsidian,
    alignSelf: 'flex-start',
  },
  number: {
    fontSize: 18,
  },
});
