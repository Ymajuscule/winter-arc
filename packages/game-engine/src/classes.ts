/**
 * Classes — CDC v2.0 §29-30.
 *
 * `focusCategories` holds **habit category ids** — the same 12-value
 * vocabulary as `habits.category`, `LINKED_STATS_BY_CATEGORY` (stats.ts) and
 * onboarding's `DOMAINS`. It used to hold display labels ('Fitness',
 * 'Focus', 'Discipline'), which was a real bug found on 2026-08-31 while
 * verifying the app in a browser for the first time: three of those strings
 * ('Focus', 'Discipline', 'Health') are stat names, not domains, so no habit
 * could ever match them and the Monk's +15% synergy never once applied. See
 * CATEGORY_IDS below — one vocabulary, checked by a test.
 */

export type ClassId = 'warrior' | 'scholar' | 'monk' | 'ranger' | 'artisan' | 'sage' | 'wanderer';

export interface ClassDefinition {
  id: ClassId;
  name: string;
  icon: string;
  /** Habit categories this class gets a synergy bonus on. Empty = no synergy (Wanderer) or all (Sage). */
  focusCategories: string[];
  /** Flat XP bonus applied per §19 "Class Synergy" when a habit's category is in focusCategories. */
  synergyBonusPct: number;
  /** Sage-only: a small bonus applies to *every* habit regardless of category. */
  appliesToAllCategories?: boolean;
}

/**
 * The canonical habit-category vocabulary. Every `habits.category` value,
 * every `focusCategories` entry, and every `LINKED_STATS_BY_CATEGORY` key is
 * one of these. Onboarding's `DOMAINS` list in apps/mobile is the user-facing
 * label for each — the label is display text and must never be persisted as
 * the category.
 */
export const CATEGORY_IDS = [
  'fitness',
  'mind',
  'knowledge',
  'career',
  'finance',
  'sleep',
  'nutrition',
  'energy',
  'digital',
  'mental',
  'creativity',
  'relationships',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export const CLASSES: Record<ClassId, ClassDefinition> = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    icon: '⚔️',
    focusCategories: ['fitness'],
    synergyBonusPct: 0.15,
  },
  scholar: {
    id: 'scholar',
    name: 'Scholar',
    icon: '📖',
    focusCategories: ['knowledge'],
    synergyBonusPct: 0.15,
  },
  monk: {
    id: 'monk',
    name: 'Monk',
    icon: '🧘',
    focusCategories: ['mind', 'digital'], // meditation + digital detox — CDC §29's "méditation, deep work"
    synergyBonusPct: 0.15,
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    icon: '🏹',
    focusCategories: ['sleep', 'nutrition', 'energy'], // CDC §29's "sommeil, nutrition"
    synergyBonusPct: 0.15,
  },
  artisan: {
    id: 'artisan',
    name: 'Artisan',
    icon: '🎨',
    focusCategories: ['creativity'],
    synergyBonusPct: 0.15,
  },
  sage: {
    id: 'sage',
    name: 'Sage',
    icon: '🔮',
    focusCategories: [],
    synergyBonusPct: 0.05,
    appliesToAllCategories: true,
  },
  wanderer: {
    id: 'wanderer',
    name: 'Wanderer',
    icon: '🌫️',
    focusCategories: [],
    synergyBonusPct: 0,
  },
};

/** Whether a habit's category earns the §19 "Class Synergy" (+15%, or +5% flat for Sage) bonus. */
export function hasClassSynergy(classId: ClassId, habitCategory: string): boolean {
  const def = CLASSES[classId];
  if (def.appliesToAllCategories) return true;
  return def.focusCategories.includes(habitCategory);
}

export function classSynergyBonus(classId: ClassId, habitCategory: string): number {
  return hasClassSynergy(classId, habitCategory) ? CLASSES[classId].synergyBonusPct : 0;
}

/** Class change cooldown — CDC §29: 30 days between changes. */
export const CLASS_CHANGE_COOLDOWN_DAYS = 30;

/** Level required to unlock a hybrid class in one of the two component classes — CDC §29. */
export const HYBRID_UNLOCK_LEVEL = 25;
