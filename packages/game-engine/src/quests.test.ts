import { describe, expect, it } from 'vitest';
import { type QuestEvalContext, evaluateQuestProgress, isQuestComplete } from './quests.js';

const baseCtx: QuestEvalContext = {
  habitCompletionsInPeriod: 0,
  habitCompletionsInPeriodByCategory: {},
  habitCompletionsInPeriodByHabitId: {},
  metricTotalsInPeriod: {},
  dailyCompletionPcts: [],
  arcCompletionPct: null,
};

describe('evaluateQuestProgress', () => {
  it('computes a ratio for habit_completions_in_period ("4 workouts this week", CDC §34)', () => {
    const ctx = { ...baseCtx, habitCompletionsInPeriodByCategory: { Fitness: 2 } };
    expect(
      evaluateQuestProgress(
        { type: 'habit_completions_in_period', count: 4, category: 'Fitness' },
        ctx,
      ),
    ).toBe(50);
  });

  it('caps progress at 100 even if the target is exceeded', () => {
    const ctx = { ...baseCtx, habitCompletionsInPeriod: 10 };
    expect(evaluateQuestProgress({ type: 'habit_completions_in_period', count: 4 }, ctx)).toBe(100);
  });

  it('tracks a specific habit ("100% of your morning routine", CDC §33)', () => {
    const ctx = { ...baseCtx, habitCompletionsInPeriodByHabitId: { 'habit-1': 1 } };
    expect(
      evaluateQuestProgress(
        { type: 'habit_completions_in_period_specific', habitId: 'habit-1', count: 1 },
        ctx,
      ),
    ).toBe(100);
  });

  it('sums a metric total ("Read for 30h", CDC §35)', () => {
    const ctx = { ...baseCtx, metricTotalsInPeriod: { reading_minutes: 900 } };
    expect(
      evaluateQuestProgress(
        { type: 'metric_total_in_period', metric: 'reading_minutes', amount: 1800 },
        ctx,
      ),
    ).toBe(50);
  });

  it('counts days at or above a threshold ("≥80% habits 5 days straight", weekly consistency CDC §34)', () => {
    const ctx = { ...baseCtx, dailyCompletionPcts: [90, 40, 85, 100, 60, 80] };
    expect(
      evaluateQuestProgress({ type: 'completion_pct_days_in_period', minPct: 80, days: 5 }, ctx),
    ).toBe(80); // 4 of 6 days qualify (90, 85, 100, 80) -> 4/5
  });

  it('finds the longest consecutive run for a boss quest ("80% for 30 consecutive days", CDC §35)', () => {
    const ctx = { ...baseCtx, dailyCompletionPcts: [80, 80, 40, 80, 80, 80, 80] };
    // longest run is 4 (the trailing 80,80,80,80), not the total count of qualifying days (6)
    expect(
      evaluateQuestProgress({ type: 'consecutive_days_at_least_pct', minPct: 80, days: 10 }, ctx),
    ).toBe(40);
  });

  it('evaluates arc_completion_at_least against the arc boss threshold (CDC §36)', () => {
    expect(
      evaluateQuestProgress(
        { type: 'arc_completion_at_least', minPct: 85 },
        { ...baseCtx, arcCompletionPct: 68 },
      ),
    ).toBe(80); // 68/85
    expect(evaluateQuestProgress({ type: 'arc_completion_at_least', minPct: 85 }, baseCtx)).toBe(0); // no arc context at all
  });

  it('takes the bottleneck (min) for all_of', () => {
    const condition = {
      type: 'all_of' as const,
      conditions: [
        { type: 'habit_completions_in_period' as const, count: 10 },
        { type: 'metric_total_in_period' as const, metric: 'pages_read', amount: 100 },
      ],
    };
    const ctx = {
      ...baseCtx,
      habitCompletionsInPeriod: 10,
      metricTotalsInPeriod: { pages_read: 40 },
    };
    expect(evaluateQuestProgress(condition, ctx)).toBe(40);
  });

  it('takes the best (max) for any_of', () => {
    const condition = {
      type: 'any_of' as const,
      conditions: [
        { type: 'habit_completions_in_period' as const, count: 10 },
        { type: 'metric_total_in_period' as const, metric: 'pages_read', amount: 100 },
      ],
    };
    const ctx = {
      ...baseCtx,
      habitCompletionsInPeriod: 3,
      metricTotalsInPeriod: { pages_read: 40 },
    };
    expect(evaluateQuestProgress(condition, ctx)).toBe(40);
  });
});

describe('isQuestComplete', () => {
  it('is true only at 100 or above', () => {
    expect(isQuestComplete(99)).toBe(false);
    expect(isQuestComplete(100)).toBe(true);
  });
});
