import { describe, expect, it } from 'vitest';
import {
  type AchievementEvalContext,
  evaluateAchievementCondition,
  evaluateNewlyUnlockedAchievements,
} from './achievements.js';

const baseCtx: AchievementEvalContext = {
  level: 1,
  prestigeRank: 0,
  streaks: {},
  habitCompletionsTotal: 0,
  habitCompletionsByCategory: {},
  perfectDaysTotal: 0,
  metricTotals: {},
  hasJoinedSquad: false,
  hasCreatedSquad: false,
  encouragementsSentTotal: 0,
  hasWonChallenge: false,
  cosmeticsOwnedTotal: 0,
  allSectionsOpened: false,
  profileFullyCustomized: false,
  habitCompletionsAfterHour: {},
  comebackStreakDays: 0,
  arcCompletedWithoutSquad: false,
  daysWithoutActivity: {},
  allClassesTried: false,
};

describe('evaluateAchievementCondition', () => {
  it('checks simple thresholds', () => {
    expect(
      evaluateAchievementCondition({ type: 'level_reaches', level: 10 }, { ...baseCtx, level: 10 }),
    ).toBe(true);
    expect(
      evaluateAchievementCondition({ type: 'level_reaches', level: 10 }, { ...baseCtx, level: 9 }),
    ).toBe(false);
  });

  it('scopes streak checks (CDC §41 milestones)', () => {
    const ctx = { ...baseCtx, streaks: { global: 30, perfect: 5 } };
    expect(
      evaluateAchievementCondition({ type: 'streak_reaches', days: 30, scope: 'global' }, ctx),
    ).toBe(true);
    expect(
      evaluateAchievementCondition({ type: 'streak_reaches', days: 30, scope: 'perfect' }, ctx),
    ).toBe(false);
  });

  it('scopes habit completions by category ("100 Workouts", CDC §46)', () => {
    const ctx = { ...baseCtx, habitCompletionsByCategory: { Fitness: 100, Knowledge: 5 } };
    expect(
      evaluateAchievementCondition(
        { type: 'habit_completions_total', count: 100, category: 'Fitness' },
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateAchievementCondition(
        { type: 'habit_completions_total', count: 100, category: 'Knowledge' },
        ctx,
      ),
    ).toBe(false);
  });

  it('evaluates all_of ("The Silent One", CDC §46 hidden)', () => {
    const condition = {
      type: 'all_of' as const,
      conditions: [
        { type: 'days_without_activity' as const, activity: 'journal_entry' as const, days: 90 },
        { type: 'days_without_activity' as const, activity: 'social_reaction' as const, days: 90 },
      ],
    };
    const met = { ...baseCtx, daysWithoutActivity: { journal_entry: 90, social_reaction: 90 } };
    const notMet = { ...baseCtx, daysWithoutActivity: { journal_entry: 90, social_reaction: 40 } };
    expect(evaluateAchievementCondition(condition, met)).toBe(true);
    expect(evaluateAchievementCondition(condition, notMet)).toBe(false);
  });

  it('evaluates any_of', () => {
    const condition = {
      type: 'any_of' as const,
      conditions: [{ type: 'squad_joined' as const }, { type: 'squad_created' as const }],
    };
    expect(evaluateAchievementCondition(condition, { ...baseCtx, hasJoinedSquad: true })).toBe(
      true,
    );
    expect(evaluateAchievementCondition(condition, baseCtx)).toBe(false);
  });
});

describe('evaluateNewlyUnlockedAchievements', () => {
  it('only returns achievements not already unlocked whose condition now holds', () => {
    const achievements = [
      { id: 'first-step', condition: { type: 'habit_completions_total' as const, count: 1 } },
      { id: 'rising', condition: { type: 'level_reaches' as const, level: 10 } },
      { id: 'ascension', condition: { type: 'level_reaches' as const, level: 50 } },
    ];
    const ctx = { ...baseCtx, level: 10, habitCompletionsTotal: 1 };
    const unlocked = evaluateNewlyUnlockedAchievements(achievements, new Set(['first-step']), ctx);
    expect(unlocked).toEqual(['rising']);
  });
});
