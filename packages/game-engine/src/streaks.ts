/**
 * Streak lifecycle — CDC v2.0 §40-43.
 *
 * Deliberately scoped to the Global Streak (the one gating the dashboard
 * flame and most milestones). Habit/Category/Perfect/Quest streaks share the
 * same day-by-day mechanics and can reuse `advanceStreak` with a different
 * `completionPct`/`requiredThreshold` pair per scope.
 */

export type IsoDate = string; // "YYYY-MM-DD"

/** Difficulty -> required daily completion % for the streak to hold — CDC §9 Écran 9. */
export type Difficulty = 'easy' | 'normal' | 'hard' | 'extreme';
export const STREAK_THRESHOLD_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 60,
  normal: 75,
  hard: 85,
  extreme: 95,
};

export interface StreakState {
  currentCount: number;
  longestCount: number;
  lastCompletedOn: IsoDate | null;
  /** Last calendar date a Streak Freeze was consumed — used to enforce the monthly cap. */
  freezeUsedOn: IsoDate | null;
}

export interface AdvanceStreakInput {
  state: StreakState;
  today: IsoDate;
  /** 0-100, today's completion rate against the user's active habits. */
  completionPct: number;
  /** Difficulty-derived threshold (CDC §9 Écran 9): 60 / 75 / 85 / 95. */
  requiredThreshold: number;
  /** Skill Point "Anchor" doubles the monthly freeze allowance to 2 — CDC §22. */
  freezesAllowedThisMonth: number;
  /** How many freezes have already been consumed this calendar month. */
  freezesUsedThisMonth: number;
  /** Was the user active (>= threshold) on at least 6 of the 7 days before `today`? Auto-freeze eligibility, CDC §42. */
  wasActiveSixOfLastSeven: boolean;
}

export type AdvanceStreakOutcome =
  | { kind: 'extended'; state: StreakState }
  | { kind: 'already_logged_today'; state: StreakState }
  | { kind: 'frozen'; state: StreakState; freezeConsumed: true }
  | { kind: 'broken'; state: StreakState; previousCount: number };

function daysBetween(a: IsoDate, b: IsoDate): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(b) - Date.parse(a)) / msPerDay);
}

/**
 * Advances (or breaks, or freezes) a streak for a single day's result.
 * Call once per user per day, after that day's habit logs are final —
 * typically from the Grace Period cutoff job (00:00–03:00, CDC §42).
 */
export function advanceStreak(input: AdvanceStreakInput): AdvanceStreakOutcome {
  const { state, today, completionPct, requiredThreshold } = input;

  if (state.lastCompletedOn === today) {
    return { kind: 'already_logged_today', state };
  }

  const met = completionPct >= requiredThreshold;
  const gap = state.lastCompletedOn ? daysBetween(state.lastCompletedOn, today) : 1;

  if (met && gap <= 1) {
    const newCount = state.currentCount + 1;
    return {
      kind: 'extended',
      state: {
        ...state,
        currentCount: newCount,
        longestCount: Math.max(state.longestCount, newCount),
        lastCompletedOn: today,
      },
    };
  }

  if (!met && gap <= 1) {
    // Today itself fell short but is still "today" relative to the streak —
    // give Grace Period / Recovery Day flows a chance before calling it broken.
    return {
      kind: 'broken',
      state: { ...state, currentCount: 0 },
      previousCount: state.currentCount,
    };
  }

  // A day was skipped entirely (gap > 1). Eligible for an automatic freeze?
  const freezeEligible =
    gap === 2 &&
    input.wasActiveSixOfLastSeven &&
    input.freezesUsedThisMonth < input.freezesAllowedThisMonth;

  if (freezeEligible) {
    return {
      kind: 'frozen',
      freezeConsumed: true,
      state: {
        ...state,
        // streak count is preserved; lastCompletedOn advances to today only if today itself was met
        lastCompletedOn: met ? today : state.lastCompletedOn,
        currentCount: met ? state.currentCount + 1 : state.currentCount,
        longestCount: met
          ? Math.max(state.longestCount, state.currentCount + 1)
          : state.longestCount,
        freezeUsedOn: today,
      },
    };
  }

  return {
    kind: 'broken',
    state: { ...state, currentCount: 0 },
    previousCount: state.currentCount,
  };
}

/** Streak milestones and their XP rewards — CDC §41. */
export const STREAK_MILESTONES: ReadonlyArray<{ days: number; xp: number }> = [
  { days: 3, xp: 50 },
  { days: 7, xp: 200 },
  { days: 14, xp: 500 },
  { days: 30, xp: 1200 },
  { days: 60, xp: 2500 },
  { days: 100, xp: 5000 },
  { days: 200, xp: 10000 },
  { days: 365, xp: 25000 },
];

/** Returns the milestone hit by exactly reaching `streakDays`, if any. */
export function milestoneReachedAt(streakDays: number) {
  return STREAK_MILESTONES.find((m) => m.days === streakDays) ?? null;
}

/** Comeback Streak bonus window — CDC §43: +50% XP for the first 7 days after a return. */
export const COMEBACK_STREAK_BONUS_DAYS = 7;

export function isWithinComebackWindow(comebackStartedOn: IsoDate, today: IsoDate): boolean {
  const elapsed = daysBetween(comebackStartedOn, today);
  return elapsed >= 0 && elapsed < COMEBACK_STREAK_BONUS_DAYS;
}
