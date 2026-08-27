/**
 * Prestige — CDC v2.0 §23-24.
 */

export const PRESTIGE_UNLOCK_LEVEL = 100;
export const MAX_PRESTIGE_RANK = 10; // Prestige X
export const PRESTIGE_XP_BONUS_PER_RANK = 0.02;
export const PRESTIGE_XP_BONUS_CAP = 0.2; // +20% at Prestige X

export interface PrestigeState {
  level: number;
  prestigeRank: number;
  lifetimeXp: number;
}

export function canPrestige(state: Pick<PrestigeState, 'level' | 'prestigeRank'>): boolean {
  return state.level >= PRESTIGE_UNLOCK_LEVEL && state.prestigeRank < MAX_PRESTIGE_RANK;
}

/** Resets level to 1, keeps lifetime XP, increments prestige rank. Throws if not eligible. */
export function applyPrestige(state: PrestigeState): PrestigeState {
  if (!canPrestige(state)) {
    throw new Error(
      `Cannot prestige: level ${state.level} (need ${PRESTIGE_UNLOCK_LEVEL}), rank ${state.prestigeRank} (max ${MAX_PRESTIGE_RANK})`,
    );
  }
  return {
    level: 1,
    prestigeRank: state.prestigeRank + 1,
    lifetimeXp: state.lifetimeXp,
  };
}

/** Permanent passive XP multiplier bonus from prestige rank — stacks with §19 multipliers. */
export function prestigeXpBonus(prestigeRank: number): number {
  return Math.min(prestigeRank * PRESTIGE_XP_BONUS_PER_RANK, PRESTIGE_XP_BONUS_CAP);
}

/** "Legend" status — CDC §24: Prestige X (the cumulative-1000-levels milestone). */
export function isLegend(prestigeRank: number): boolean {
  return prestigeRank >= MAX_PRESTIGE_RANK;
}
