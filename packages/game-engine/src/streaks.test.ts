import { describe, expect, it } from 'vitest';
import {
  STREAK_THRESHOLD_BY_DIFFICULTY,
  type StreakState,
  advanceStreak,
  dayCompletionPct,
  isPerfectDay,
  isSameCalendarMonth,
  isWithinComebackWindow,
  milestoneReachedAt,
} from './streaks';

const freshState: StreakState = {
  currentCount: 0,
  longestCount: 0,
  lastCompletedOn: null,
  freezeUsedOn: null,
};

describe('advanceStreak', () => {
  it('starts a streak from zero on the first qualifying day', () => {
    const outcome = advanceStreak({
      state: freshState,
      today: '2026-08-27',
      completionPct: 80,
      requiredThreshold: 75,
      freezesAllowedThisMonth: 1,
      freezesUsedThisMonth: 0,
      wasActiveSixOfLastSeven: false,
    });
    expect(outcome.kind).toBe('extended');
    expect(outcome.state.currentCount).toBe(1);
  });

  it('extends an existing streak on a consecutive qualifying day', () => {
    const state: StreakState = {
      ...freshState,
      currentCount: 5,
      longestCount: 5,
      lastCompletedOn: '2026-08-26',
    };
    const outcome = advanceStreak({
      state,
      today: '2026-08-27',
      completionPct: 90,
      requiredThreshold: 75,
      freezesAllowedThisMonth: 1,
      freezesUsedThisMonth: 0,
      wasActiveSixOfLastSeven: false,
    });
    expect(outcome.kind).toBe('extended');
    expect(outcome.state.currentCount).toBe(6);
    expect(outcome.state.longestCount).toBe(6);
  });

  it('is a no-op if the day was already logged', () => {
    const state: StreakState = { ...freshState, currentCount: 3, lastCompletedOn: '2026-08-27' };
    const outcome = advanceStreak({
      state,
      today: '2026-08-27',
      completionPct: 90,
      requiredThreshold: 75,
      freezesAllowedThisMonth: 1,
      freezesUsedThisMonth: 0,
      wasActiveSixOfLastSeven: false,
    });
    expect(outcome.kind).toBe('already_logged_today');
    expect(outcome.state.currentCount).toBe(3);
  });

  it('breaks the streak when completion is below threshold on a consecutive day', () => {
    const state: StreakState = {
      ...freshState,
      currentCount: 10,
      longestCount: 10,
      lastCompletedOn: '2026-08-26',
    };
    const outcome = advanceStreak({
      state,
      today: '2026-08-27',
      completionPct: 40,
      requiredThreshold: 75,
      freezesAllowedThisMonth: 1,
      freezesUsedThisMonth: 0,
      wasActiveSixOfLastSeven: false,
    });
    expect(outcome.kind).toBe('broken');
    expect(outcome.state.currentCount).toBe(0);
    if (outcome.kind === 'broken') expect(outcome.previousCount).toBe(10);
  });

  it('auto-freezes a single skipped day when eligible (CDC §42)', () => {
    const state: StreakState = {
      ...freshState,
      currentCount: 10,
      longestCount: 10,
      lastCompletedOn: '2026-08-25',
    };
    const outcome = advanceStreak({
      state,
      today: '2026-08-27', // one full day skipped (26th)
      completionPct: 90,
      requiredThreshold: 75,
      freezesAllowedThisMonth: 1,
      freezesUsedThisMonth: 0,
      wasActiveSixOfLastSeven: true,
    });
    expect(outcome.kind).toBe('frozen');
    expect(outcome.state.currentCount).toBe(11);
  });

  it('breaks instead of freezing once the monthly freeze allowance is used up', () => {
    const state: StreakState = {
      ...freshState,
      currentCount: 10,
      longestCount: 10,
      lastCompletedOn: '2026-08-25',
    };
    const outcome = advanceStreak({
      state,
      today: '2026-08-27',
      completionPct: 90,
      requiredThreshold: 75,
      freezesAllowedThisMonth: 1,
      freezesUsedThisMonth: 1,
      wasActiveSixOfLastSeven: true,
    });
    expect(outcome.kind).toBe('broken');
  });
});

describe('milestoneReachedAt', () => {
  it('finds an exact milestone match', () => {
    expect(milestoneReachedAt(30)?.xp).toBe(1200);
  });

  it('returns null between milestones', () => {
    expect(milestoneReachedAt(31)).toBeNull();
  });
});

describe('isWithinComebackWindow', () => {
  it('is true for the 7 days starting the comeback', () => {
    expect(isWithinComebackWindow('2026-08-01', '2026-08-01')).toBe(true);
    expect(isWithinComebackWindow('2026-08-01', '2026-08-07')).toBe(true);
  });

  it('is false on day 8 and beyond', () => {
    expect(isWithinComebackWindow('2026-08-01', '2026-08-08')).toBe(false);
  });
});

describe('STREAK_THRESHOLD_BY_DIFFICULTY', () => {
  it('matches the CDC §9 Écran 9 thresholds, ascending with difficulty', () => {
    expect(STREAK_THRESHOLD_BY_DIFFICULTY.easy).toBe(60);
    expect(STREAK_THRESHOLD_BY_DIFFICULTY.normal).toBe(75);
    expect(STREAK_THRESHOLD_BY_DIFFICULTY.hard).toBe(85);
    expect(STREAK_THRESHOLD_BY_DIFFICULTY.extreme).toBe(95);
  });
});

describe('dayCompletionPct', () => {
  it('counts unlogged active habits as zero, not as absent', () => {
    // The bug this function exists to prevent: one habit logged at 100% out of
    // ten is a 10% day, not a 100% day.
    const pct = dayCompletionPct(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
      [{ habitId: 'a', completionPct: 100 }],
    );
    expect(pct).toBe(10);
  });

  it('averages partial completions across every active habit', () => {
    const pct = dayCompletionPct(
      ['a', 'b', 'c', 'd'],
      [
        { habitId: 'a', completionPct: 100 },
        { habitId: 'b', completionPct: 50 },
        { habitId: 'c', completionPct: 75 },
      ],
    );
    expect(pct).toBe(56); // (100 + 50 + 75 + 0) / 4 = 56.25
  });

  it('ignores logs for habits that are no longer active', () => {
    const pct = dayCompletionPct(
      ['a'],
      [
        { habitId: 'a', completionPct: 100 },
        { habitId: 'archived', completionPct: 100 },
      ],
    );
    expect(pct).toBe(100);
  });

  it('clamps out-of-range completion values', () => {
    expect(dayCompletionPct(['a', 'b'], [{ habitId: 'a', completionPct: 250 }])).toBe(50);
    expect(dayCompletionPct(['a'], [{ habitId: 'a', completionPct: -30 }])).toBe(0);
  });

  it('is zero when the user has no active habits at all', () => {
    expect(dayCompletionPct([], [{ habitId: 'a', completionPct: 100 }])).toBe(0);
  });
});

describe('isPerfectDay', () => {
  it('requires every active habit fully completed', () => {
    expect(
      isPerfectDay(
        ['a', 'b'],
        [
          { habitId: 'a', completionPct: 100 },
          { habitId: 'b', completionPct: 100 },
        ],
      ),
    ).toBe(true);
  });

  it('rejects a day where one habit is only partially completed', () => {
    expect(
      isPerfectDay(
        ['a', 'b'],
        [
          { habitId: 'a', completionPct: 100 },
          { habitId: 'b', completionPct: 60 },
        ],
      ),
    ).toBe(false);
  });

  it('rejects a day where an active habit was never logged', () => {
    expect(isPerfectDay(['a', 'b'], [{ habitId: 'a', completionPct: 100 }])).toBe(false);
  });

  it('is false with no active habits — an empty day is not a perfect one', () => {
    expect(isPerfectDay([], [])).toBe(false);
  });
});

describe('isSameCalendarMonth', () => {
  it('matches two dates inside one month', () => {
    expect(isSameCalendarMonth('2026-08-01', '2026-08-31')).toBe(true);
  });

  it('rejects adjacent days across a month boundary', () => {
    expect(isSameCalendarMonth('2026-08-31', '2026-09-01')).toBe(false);
  });

  it('rejects the same month in different years', () => {
    expect(isSameCalendarMonth('2025-08-15', '2026-08-15')).toBe(false);
  });
});
