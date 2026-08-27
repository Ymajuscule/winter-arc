import { describe, expect, it } from 'vitest';
import {
  type StreakState,
  advanceStreak,
  isWithinComebackWindow,
  milestoneReachedAt,
} from './streaks.js';

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
