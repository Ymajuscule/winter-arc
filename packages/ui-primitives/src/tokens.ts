/**
 * Design tokens — CLAUDE.md §5 (Design Law) and CDC v2.1 §114.
 * Nothing in this file should be invented at the component level — if a
 * screen needs a color/spacing/radius that isn't here, it's a token to add,
 * not a one-off literal to inline.
 */

/** Frost palette — canonical, from CLAUDE.md §5. Never use pure #FFFFFF or #000000. */
export const frost = {
  void: '#05070A', // page background
  obsidian: '#0B0F14', // elevated surface
  graphite: '#161B22', // card background
  fog: '#8A94A6', // secondary text
  ghost: '#C7CFDB', // primary text on dark
  bone: '#EAEEF5', // pure text, sparse use
  ice: '#7FB7D9', // primary accent (XP, focus)
  glacier: '#4A90B8', // pressed / active
  ember: '#E85D3B', // streak flame, rare
  blood: '#8B1A1A', // failure state, very rare
  aurora: '#7B5CFF', // prestige / legendary cosmetic
} as const;

export type FrostColor = keyof typeof frost;

/** Other onboarding palettes (CDC §9 Écran 4) — same token shape as `frost`, swapped wholesale as a theme. */
export const palettes = {
  frost,
  ember: { ...frost, ice: '#E85D3B', glacier: '#B84A2E' },
  void: { ...frost, ice: '#7B5CFF', glacier: '#5A3FCC' },
  forest: { ...frost, ice: '#5FBF8F', glacier: '#3D8F66' },
  blood: { ...frost, ice: '#C24545', glacier: '#8B1A1A' },
  solar: { ...frost, ice: '#D9B24A', glacier: '#B8912E' },
} as const;

export type PaletteId = keyof typeof palettes;

/** 4px base spacing scale. */
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

/**
 * Design Law rule 1: no rounded-2xl. Cards are flat or barely rounded;
 * `full` is reserved for orbs, avatars, and status pills.
 */
export const radii = {
  none: 0,
  sm: 2,
  full: 9999,
} as const;

/** Design Law rule 6: hairlines, not 1px solid borders. */
export const border = {
  width: 0.5,
  color: 'rgba(255,255,255,0.08)',
} as const;

/**
 * Design Law rule 4: JetBrains Mono for numbers/data, Neue Haas Grotesk
 * Display for headers (fallback Inter Tight), Inter for body. Never
 * system-ui. Actual font loading (expo-font) happens in apps/mobile —
 * these are the family names components should reference.
 */
export const typography = {
  fontFamily: {
    mono: 'JetBrainsMono-Regular',
    monoMedium: 'JetBrainsMono-Medium',
    display: 'NeueHaasDisplay-Bold', // fallback: InterTight-Bold
    displayFallback: 'InterTight-Bold',
    body: 'Inter-Regular',
    bodyMedium: 'Inter-Medium',
  },
  size: {
    label: 11, // small caps, tracked +80, used above hero numbers
    body: 14,
    title: 20,
    display: 32,
    hero: 48, // level / XP numbers
  },
  tracking: {
    label: 0.8, // "+80" tracking on small-caps labels, in em-ish units for RN letterSpacing
    tight: -0.02,
    normal: 0,
  },
} as const;

/**
 * Design Law rule 5: mechanical motion. out-expo for entrances, in-expo
 * for exits, nothing bounces. Durations are asymmetric by scale.
 */
export const motion = {
  easing: {
    outExpo: [0.22, 1, 0.36, 1] as const,
    inExpo: [0.7, 0, 0.84, 0] as const,
  },
  duration: {
    micro: 180,
    panel: 320,
    hero: 640,
  },
} as const;

export const tokens = { palettes, spacing, radii, border, typography, motion } as const;
