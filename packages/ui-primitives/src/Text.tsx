import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';
import { frost, typography } from './tokens';

export type TextVariant = 'display' | 'title' | 'body' | 'mono' | 'label' | 'hero';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: keyof typeof frost;
}

/**
 * Design Law rule 4 + 7: mono/display/body only, never system-ui. `hero` is
 * for the big kerned-tight numbers (level, XP, streak) that rule 7 asks for.
 *
 * `display` renders in `typography.fontFamily.displayFallback` (Inter
 * Tight), not `.display` (Neue Haas Grotesk) — Neue Haas is a licensed
 * commercial font with no available file; loading a font that doesn't exist
 * silently falls back to the OS system font, which is exactly what rule 4
 * forbids. Switch this back to `.display` in apps/mobile/src/app/_layout.tsx
 * (useFonts) + here together, in the same commit, if Julien provides the
 * license file.
 */
export function Text({ variant = 'body', color = 'ghost', style, ...rest }: TextProps) {
  return (
    <RNText style={[styles.base, styles[variant], { color: frost[color] }, style]} {...rest} />
  );
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
  display: {
    fontFamily: typography.fontFamily.displayFallback,
    fontSize: typography.size.display,
  },
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
