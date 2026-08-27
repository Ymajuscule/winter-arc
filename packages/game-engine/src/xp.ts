/**
 * Level curve — CDC v2.0 §20.
 *
 * The spec gives one literal formula: `XPRequired(n) = round(500 × n^1.35)`,
 * the XP needed to go from level `n` to level `n+1`. The illustrative table in
 * the same section (level 5 → 1 810 XP, cumulative 4 645, etc.) does not
 * reconcile numerically with that formula — the CDC itself calls the curve
 * "a parameter" the backend can retune, so this implements the formula
 * literally rather than reverse-engineering constants to match the table.
 * If Julien wants the table's exact numbers, that's a different curve and a
 * DECISION-NEEDED, not a bug here.
 */

const BASE_XP = 500;
const CURVE_EXPONENT = 1.35;

/** XP needed to go from `level` to `level + 1`. */
export function xpRequiredForLevel(level: number): number {
  if (level < 1) throw new RangeError(`level must be >= 1, got ${level}`);
  return Math.round(BASE_XP * level ** CURVE_EXPONENT);
}

const cumulativeCache: number[] = [0, 0]; // index = level, value = total XP to *reach* that level (level 1 = 0)

function cumulativeXpForLevel(level: number): number {
  if (level < 1) throw new RangeError(`level must be >= 1, got ${level}`);
  while (cumulativeCache.length <= level) {
    const prevLevel = cumulativeCache.length - 1;
    const prevTotal = cumulativeCache[prevLevel];
    if (prevTotal === undefined) throw new Error('unreachable: cumulativeCache invariant violated');
    cumulativeCache.push(prevTotal + xpRequiredForLevel(prevLevel));
  }
  const total = cumulativeCache[level];
  if (total === undefined) throw new Error('unreachable: cumulativeCache invariant violated');
  return total;
}

export interface LevelProgress {
  level: number;
  totalXp: number;
  /** XP earned since hitting the current level. */
  xpIntoLevel: number;
  /** XP still needed to reach the next level. */
  xpToNextLevel: number;
  /** Total XP the next level requires (for progress-bar denominators). */
  xpForNextLevel: number;
}

const MAX_LEVEL = 100;

/** Resolves a total (lifetime, post-prestige-reset) XP amount into a level + progress. */
export function levelFromTotalXp(totalXp: number): LevelProgress {
  if (totalXp < 0) throw new RangeError(`totalXp must be >= 0, got ${totalXp}`);

  let level = 1;
  while (level < MAX_LEVEL && cumulativeXpForLevel(level + 1) <= totalXp) {
    level += 1;
  }

  if (level >= MAX_LEVEL) {
    const base = cumulativeXpForLevel(MAX_LEVEL);
    return {
      level: MAX_LEVEL,
      totalXp,
      xpIntoLevel: totalXp - base,
      xpToNextLevel: 0,
      xpForNextLevel: 0,
    };
  }

  const base = cumulativeXpForLevel(level);
  const required = xpRequiredForLevel(level);
  return {
    level,
    totalXp,
    xpIntoLevel: totalXp - base,
    xpToNextLevel: base + required - totalXp,
    xpForNextLevel: required,
  };
}

/** Daily XP cap before overflow — CDC §19. Overflow still counts toward quests, not leveling. */
export const DAILY_XP_CAP = 3000;

export interface DailyXpAward {
  applied: number;
  overflow: number;
}

/** Applies the daily XP cap to a raw (already-multiplied) XP gain. */
export function applyDailyXpCap(xpEarnedTodaySoFar: number, rawGain: number): DailyXpAward {
  const remaining = Math.max(0, DAILY_XP_CAP - xpEarnedTodaySoFar);
  const applied = Math.min(rawGain, remaining);
  return { applied, overflow: rawGain - applied };
}
