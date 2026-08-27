/**
 * Classes — CDC v2.0 §29-30.
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

export const CLASSES: Record<ClassId, ClassDefinition> = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    icon: '⚔️',
    focusCategories: ['Fitness'],
    synergyBonusPct: 0.15,
  },
  scholar: {
    id: 'scholar',
    name: 'Scholar',
    icon: '📖',
    focusCategories: ['Knowledge'],
    synergyBonusPct: 0.15,
  },
  monk: {
    id: 'monk',
    name: 'Monk',
    icon: '🧘',
    focusCategories: ['Focus', 'Discipline'],
    synergyBonusPct: 0.15,
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    icon: '🏹',
    focusCategories: ['Health', 'Energy'],
    synergyBonusPct: 0.15,
  },
  artisan: {
    id: 'artisan',
    name: 'Artisan',
    icon: '🎨',
    focusCategories: ['Creativity'],
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
