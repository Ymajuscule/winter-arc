import { StyleSheet, View, type ViewProps } from 'react-native';
import { frost, radii } from './tokens.js';

export type FrameTier = 'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'obsidian';

const TIER_COLOR: Record<FrameTier, keyof typeof frost> = {
  iron: 'fog',
  bronze: 'ember',
  silver: 'ghost',
  gold: 'aurora',
  platinum: 'ice',
  diamond: 'bone',
  obsidian: 'aurora',
};

export interface FrameProps extends ViewProps {
  tier?: FrameTier;
  size?: number;
}

/**
 * CDC §51 — flat border-only placeholder. The real spec wants animated/
 * particle frames at Rare+ (Platinum reflet, Diamond particules, Obsidian
 * éclats) — needs Skia, deliberately deferred (winter-arc-design-system
 * skill: "coordinate with mobile-performance before starting"). This
 * renders the correct tier color so it's usable everywhere now and upgrades
 * to real FX later without changing the call sites.
 */
export function Frame({ tier = 'iron', size = 56, style, children, ...rest }: FrameProps) {
  const color = frost[TIER_COLOR[tier]];
  return (
    <View
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: radii.full, borderColor: color },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: frost.graphite,
    overflow: 'hidden',
  },
});
