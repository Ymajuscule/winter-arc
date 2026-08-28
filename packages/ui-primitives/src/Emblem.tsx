import { StyleSheet, View, type ViewProps } from 'react-native';
import { Text } from './Text.js';
import { border, frost, radii } from './tokens.js';

export interface EmblemProps extends ViewProps {
  /** 1-2 letters — CDC §55 emblems are a symbol/blason; a real icon set per-class/achievement is a later pass. */
  glyph: string;
  size?: number;
  color?: keyof typeof frost;
}

export function Emblem({ glyph, size = 28, color = 'ice', style, ...rest }: EmblemProps) {
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: radii.sm, borderColor: frost[color] },
        style,
      ]}
      {...rest}
    >
      <Text variant="label" color={color}>
        {glyph.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: border.width * 2,
    backgroundColor: frost.obsidian,
  },
});
