import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';
import { frost, typography } from './tokens.js';

export type TextVariant = 'display' | 'title' | 'body' | 'mono' | 'label' | 'hero';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: keyof typeof frost;
}

/**
 * Design Law rule 4 + 7: mono/display/body only, never system-ui. `hero` is
 * for the big kerned-tight numbers (level, XP, streak) that rule 7 asks for.
 */
export function Text({ variant = 'body', color = 'ghost', style, ...rest }: TextProps) {
  return (
    <RNText style={[styles.base, styles[variant], { color: frost[color] }, style]} {...rest} />
  );
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
  display: { fontFamily: typography.fontFamily.display, fontSize: typography.size.display },
  title: { fontFamily: typography.fontFamily.bodyMedium, fontSize: typography.size.title },
  body: { fontFamily: typography.fontFamily.body, fontSize: typography.size.body },
  mono: { fontFamily: typography.fontFamily.mono, fontSize: typography.size.body },
  label: {
    fontFamily: typography.fontFamily.monoMedium,
    fontSize: typography.size.label,
    letterSpacing: typography.tracking.label,
    textTransform: 'uppercase',
  },
  hero: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.size.hero,
    letterSpacing: typography.tracking.tight,
  },
});
