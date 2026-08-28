import { StyleSheet, View, type ViewProps } from 'react-native';
import { frost, radii } from './tokens';

export type AuraKind =
  | 'ember'
  | 'frost'
  | 'void'
  | 'verdant'
  | 'solar'
  | 'storm'
  | 'zen'
  | 'legend';

const AURA_COLOR: Record<AuraKind, keyof typeof frost> = {
  ember: 'ember',
  frost: 'ice',
  void: 'aurora',
  verdant: 'ice', // no green token in the Frost palette (CLAUDE.md §5) — closest available, revisit if a real green cosmetic ships
  solar: 'aurora',
  storm: 'ice',
  zen: 'fog',
  legend: 'aurora',
};

export interface AuraProps extends ViewProps {
  kind: AuraKind;
  size?: number;
  /** CDC §52 — user can disable their aura for a sober look. */
  enabled?: boolean;
}

/**
 * CDC §52 — flat soft-glow placeholder (a low-opacity ring behind the
 * avatar). The real spec wants particles/flames/halo motion — Skia,
 * deferred (see Frame.tsx's note, same reasoning).
 */
export function Aura({ kind, size = 72, enabled = true, style, children, ...rest }: AuraProps) {
  if (!enabled) return <>{children}</>;
  const color = frost[AURA_COLOR[kind]];
  return (
    <View style={[styles.wrap, { width: size, height: size }, style]} {...rest}>
      <View
        style={[
          styles.glow,
          { width: size, height: size, borderRadius: radii.full, backgroundColor: color },
        ]}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    opacity: 0.16,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
