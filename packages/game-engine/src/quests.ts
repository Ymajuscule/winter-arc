/**
 * Quest condition & progress DSL — CDC v2.1 §33-36.
 *
 * `quest_definitions.condition` (schema-postgresql.md) has no formalized shape,
 * unlike `achievements.condition` — this is that shape, designed the same way
 * (Julien's 2026-08-28 "débrouille-toi" instruction: decide and document,
 * don't escalate). Unlike achievements, quests are progress-tracked over a
 * bounded period (daily/weekly/monthly/boss/arc_boss/class — CDC §33-36), not
 * one-shot booleans, so the DSL evaluates to a 0-100 progress percentage
 * rather than a plain boolean. `isQuestComplete` is just `progress >= 100`.
 *
 * Extend this union as new quest shapes get designed — don't stretch an
 * existing case to mean something it wasn't meant for (same rule as
 * `achievements.ts`).
 */

export type QuestCondition =
  | { type: 'habit_completions_in_period'; count: number; category?: string }
  | { type: 'habit_completions_in_period_specific'; habitId: string; count: number }
  | { type: 'metric_total_in_period'; metric: string; amount: number } // e.g. metric: 'pages_read', amount: 100
  | { type: 'completion_pct_days_in_period'; minPct: number; days: number } // e.g. weekly consistency: >=80% on 5 days
  | { type: 'consecutive_days_at_least_pct'; minPct: number; days: number } // boss: N consecutive days >= minPct
  | { type: 'arc_completion_at_least'; minPct: number } // arc boss (CDC §36)
  | { type: 'all_of'; conditions: QuestCondition[] }
  | { type: 'any_of'; conditions: QuestCondition[] };

/**
 * Everything progress evaluation needs for one quest instance's period.
 * Flat and pre-aggregated, same philosophy as `AchievementEvalContext` —
 * cheap and testable without a database, built by the caller (`claim-quest`
 * / the progress-refresh path) from that period's `habit_logs` rows.
 */
export interface QuestEvalContext {
  habitCompletionsInPeriod: number;
  habitCompletionsInPeriodByCategory: Record<string, number>;
  habitCompletionsInPeriodByHabitId: Record<string, number>;
  metricTotalsInPeriod: Record<string, number>;
  /** One entry per elapsed day in the period, chronological, 0-100 completion each. */
  dailyCompletionPcts: number[];
  /** Only meaningful for `arc_completion_at_least`; null if the quest isn't arc-scoped. */
  arcCompletionPct: number | null;
}

function longestConsecutiveRunAtLeast(values: number[], minPct: number): number {
  let longest = 0;
  let current = 0;
  for (const v of values) {
    if (v >= minPct) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

function countAtLeast(values: number[], minPct: number): number {
  return values.filter((v) => v >= minPct).length;
}

function progressRatio(achieved: number, target: number): number {
  if (target <= 0) return 100;
  return Math.min(100, Math.round((achieved / target) * 100));
}

/** Evaluates a quest's current progress, 0-100. */
export function evaluateQuestProgress(condition: QuestCondition, ctx: QuestEvalContext): number {
  switch (condition.type) {
    case 'habit_completions_in_period': {
      const achieved = condition.category
        ? (ctx.habitCompletionsInPeriodByCategory[condition.category] ?? 0)
        : ctx.habitCompletionsInPeriod;
      return progressRatio(achieved, condition.count);
    }
    case 'habit_completions_in_period_specific': {
      const achieved = ctx.habitCompletionsInPeriodByHabitId[condition.habitId] ?? 0;
      return progressRatio(achieved, condition.count);
    }
    case 'metric_total_in_period': {
      const achieved = ctx.metricTotalsInPeriod[condition.metric] ?? 0;
      return progressRatio(achieved, condition.amount);
    }
    case 'completion_pct_days_in_period': {
      const achieved = countAtLeast(ctx.dailyCompletionPcts, condition.minPct);
      return progressRatio(achieved, condition.days);
    }
    case 'consecutive_days_at_least_pct': {
      const achieved = longestConsecutiveRunAtLeast(ctx.dailyCompletionPcts, condition.minPct);
      return progressRatio(achieved, condition.days);
    }
    case 'arc_completion_at_least': {
      if (ctx.arcCompletionPct === null) return 0;
      return progressRatio(ctx.arcCompletionPct, condition.minPct);
    }
    case 'all_of': {
      // Bottleneck semantics: not "done" until every sub-condition is —
      // aggregate progress is the slowest one, not an average.
      if (condition.conditions.length === 0) return 100;
      return Math.min(...condition.conditions.map((c) => evaluateQuestProgress(c, ctx)));
    }
    case 'any_of': {
      if (condition.conditions.length === 0) return 0;
      return Math.max(...condition.conditions.map((c) => evaluateQuestProgress(c, ctx)));
    }
  }
}

export function isQuestComplete(progress: number): boolean {
  return progress >= 100;
}

/** Daily quest slot count — CDC §33: 3 rotating + 1 optional bonus slot. */
export const DAILY_QUEST_SLOTS = 3;
export const DAILY_BONUS_QUEST_CHANCE = 0.15; // "peut apparaître aléatoirement" — not specified further, a reasonable rare rate

/** Weekly quest slot count — CDC §34: 3-5 per week. */
export const WEEKLY_QUEST_SLOTS_MIN = 3;
export const WEEKLY_QUEST_SLOTS_MAX = 5;
