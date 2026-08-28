// @ts-nocheck -- Deno Edge Function shared helper, not resolved by the repo's Node/tsc typecheck.
/**
 * Builds a `QuestEvalContext` (packages/game-engine/src/quests.ts) for one
 * quest instance's period and returns its current progress (0-100). Shared
 * between `claim-quest` (verify before paying out) and the future
 * `rotate-quests` cron (refresh progress on active quests so the dashboard's
 * "2/3 daily quests" doesn't only update at claim time).
 *
 * `metricTotalsInPeriod` is always `{}` — same root cause as
 * `evaluate-achievements.ts`'s `metricTotals` gap: no metric-tagged logging
 * exists in the schema yet (deep work minutes, pages read, etc. aren't
 * captured anywhere). Any quest_definitions.condition using
 * `metric_total_in_period` won't be able to progress past 0 until that gap
 * closes — a real limitation, not silently ignored.
 */
import {
  type QuestCondition,
  type QuestEvalContext,
  evaluateQuestProgress,
} from '../../../packages/game-engine/src/quests.ts';
import { supabaseAdmin } from './supabase-admin.ts';

function referencesArcCompletion(condition: QuestCondition): boolean {
  if (condition.type === 'arc_completion_at_least') return true;
  if (condition.type === 'all_of' || condition.type === 'any_of') {
    return condition.conditions.some(referencesArcCompletion);
  }
  return false;
}

export async function computeQuestProgress(
  userId: string,
  periodStart: string,
  periodEnd: string,
  condition: QuestCondition,
): Promise<number> {
  const db = supabaseAdmin();

  const { data: logs } = await db
    .from('habit_logs')
    .select('completion_pct, logged_for, habits(id, category)')
    .eq('user_id', userId)
    .gte('logged_for', periodStart)
    .lte('logged_for', periodEnd);

  const habitCompletionsInPeriodByCategory: Record<string, number> = {};
  const habitCompletionsInPeriodByHabitId: Record<string, number> = {};
  const pctsByDay: Record<string, number[]> = {};

  for (const log of logs ?? []) {
    const habit = (log as { habits?: { id?: string; category?: string } }).habits;
    if (habit?.category) {
      habitCompletionsInPeriodByCategory[habit.category] =
        (habitCompletionsInPeriodByCategory[habit.category] ?? 0) + 1;
    }
    if (habit?.id) {
      habitCompletionsInPeriodByHabitId[habit.id] =
        (habitCompletionsInPeriodByHabitId[habit.id] ?? 0) + 1;
    }
    const day = log.logged_for as string;
    if (!pctsByDay[day]) pctsByDay[day] = [];
    pctsByDay[day].push(log.completion_pct as number);
  }

  const dailyCompletionPcts = Object.keys(pctsByDay)
    .sort()
    .map((day) => {
      const pcts = pctsByDay[day];
      return Math.round(pcts.reduce((sum, pct) => sum + pct, 0) / pcts.length);
    });

  let arcCompletionPct: number | null = null;
  if (referencesArcCompletion(condition)) {
    const { data: arc } = await db
      .from('arcs')
      .select('completion_pct')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    arcCompletionPct = arc?.completion_pct ?? null;
  }

  const ctx: QuestEvalContext = {
    habitCompletionsInPeriod: (logs ?? []).length,
    habitCompletionsInPeriodByCategory,
    habitCompletionsInPeriodByHabitId,
    metricTotalsInPeriod: {}, // gap — see file header
    dailyCompletionPcts,
    arcCompletionPct,
  };

  return evaluateQuestProgress(condition, ctx);
}
