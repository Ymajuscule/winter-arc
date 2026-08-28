import { StyleSheet, View, type ViewProps } from 'react-native';
import { LevelBadge } from './LevelBadge.js';
import { Text } from './Text.js';
import { border, frost, radii, spacing } from './tokens.js';

export interface NameplateProps extends ViewProps {
  username: string;
  level: number;
  title?: string;
  avatar?: React.ReactNode;
  prestigeRank?: number;
}

/** CDC §54 — "Basic" variant (rectangle). Knight's Plate/Scholar's Tome/etc. are class-unlocked shapes, not built yet. */
export function Nameplate({
  username,
  level,
  title,
  avatar,
  prestigeRank = 0,
  style,
  ...rest
}: NameplateProps) {
  return (
    <View style={[styles.row, style]} {...rest}>
      {avatar}
      <View style={styles.identity}>
        <Text variant="title" color="bone">
          {username}
        </Text>
        {title ? (
          <Text variant="label" color="ice">
            {title}
          </Text>
        ) : null}
      </View>
      <LevelBadge level={level} prestigeRank={prestigeRank} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: border.width,
    borderColor: border.color,
    borderRadius: radii.sm,
    backgroundColor: frost.graphite,
  },
  identity: {
    flex: 1,
    gap: spacing.xs,
  },
});
