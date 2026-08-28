import { StyleSheet, View, type ViewProps } from 'react-native';
import { frost, radii } from './tokens';

export interface SigilProps extends ViewProps {
  color?: keyof typeof frost;
  size?: number;
}

/** CDC §56 — a small marker next to a username. Solid dot placeholder until per-sigil icons (❄️/🔥/👁️ analogues, as SVG, not emoji) are designed. */
export function Sigil({ color = 'ice', size = 6, style, ...rest }: SigilProps) {
  return (
    <View
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: radii.full, backgroundColor: frost[color] },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  dot: {},
});
