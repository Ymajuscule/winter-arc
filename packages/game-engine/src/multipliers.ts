/**
 * XP multiplier stack — CDC v2.0 §19.
 *
 * All bonuses are additive percentages on top of the base 100%, summed and
 * then capped: "cap absolu de +200%" (§25) means the *bonus* portion cannot
 * exceed +200%, i.e. the final multiplier tops out at 3.0×.
 */

export const MAX_BONUS = 2.0; // +200% absolute cap (CDC §25)

export interface XpMultiplierInput {
  /** Current streak length in days, at the moment the action is logged. */
  streakDays: number;
  /** True if this action completes a 100%-of-habits day. */
  isPerfectDay: boolean;
  /** True if the habit's category matches the user's active class focus. */
  isClassSynergy: boolean;
  /** True if completed before 09:00 local time. */
  isEarlyBird: boolean;
  /** True if today is Saturday or Sunday. */
  isWeekend: boolean;
  /** True if an XP Elixir (24h, +50%) is currently active. */
  hasXpElixir: boolean;
  /** True if an XP Feast (1h, +100%) is currently active. */
  hasXpFeast: boolean;
  /** True during a global season event (+100%). */
  isSeasonEvent: boolean;
  /** True during the user's first 7 days after a Comeback (+50%) — CDC §43. */
  isComebackStreak: boolean;
}

export interface XpMultiplierBreakdown {
  streakBonus: number;
  perfectDay: number;
  classSynergy: number;
  earlyBird: number;
  weekendWarrior: number;
  xpElixir: number;
  xpFeast: number;
  seasonEvent: number;
  comebackStreak: number;
  /** Sum of the above, before the absolute cap. */
  rawBonus: number;
  /** rawBonus clamped to MAX_BONUS. */
  cappedBonus: number;
  /** 1 + cappedBonus — multiply the base XP by this. */
  multiplier: number;
}

const STREAK_BONUS_PER_WEEK = 0.05;
const STREAK_BONUS_CAP = 0.5;

export function calculateXpMultiplier(input: XpMultiplierInput): XpMultiplierBreakdown {
  const streakBonus = Math.min(
    Math.floor(input.streakDays / 7) * STREAK_BONUS_PER_WEEK,
    STREAK_BONUS_CAP,
  );
  const perfectDay = input.isPerfectDay ? 0.25 : 0;
  const classSynergy = input.isClassSynergy ? 0.15 : 0;
  const earlyBird = input.isEarlyBird ? 0.1 : 0;
  const weekendWarrior = input.isWeekend ? 0.2 : 0;
  const xpElixir = input.hasXpElixir ? 0.5 : 0;
  const xpFeast = input.hasXpFeast ? 1.0 : 0;
  const seasonEvent = input.isSeasonEvent ? 1.0 : 0;
  const comebackStreak = input.isComebackStreak ? 0.5 : 0;

  const rawBonus =
    streakBonus +
    perfectDay +
    classSynergy +
    earlyBird +
    weekendWarrior +
    xpElixir +
    xpFeast +
    seasonEvent +
    comebackStreak;

  const cappedBonus = Math.min(rawBonus, MAX_BONUS);

  return {
    streakBonus,
    perfectDay,
    classSynergy,
    earlyBird,
    weekendWarrior,
    xpElixir,
    xpFeast,
    seasonEvent,
    comebackStreak,
    rawBonus,
    cappedBonus,
    multiplier: 1 + cappedBonus,
  };
}
