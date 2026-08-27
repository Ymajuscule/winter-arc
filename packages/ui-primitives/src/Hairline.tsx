import { StyleSheet, View, type ViewProps } from 'react-native';
import { border } from './tokens.js';

export type HairlineOrientation = 'horizontal' | 'vertical';

export interface HairlineProps extends ViewProps {
  orientation?: HairlineOrientation;
}

/** Design Law rule 6: StyleSheet.hairlineWidth-scale dividers, never `1px solid white`. */
export function Hairline({ orientation = 'horizontal', style, ...rest }: HairlineProps) {
  return (
    <View
      style={[orientation === 'horizontal' ? styles.horizontal : styles.vertical, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: { height: border.width, width: '100%', backgroundColor: border.color },
  vertical: { width: border.width, height: '100%', backgroundColor: border.color },
});
