/**
 * Achievement condition evaluator — CDC v2.1 §44-48.
 *
 * The CDC gives achievements a `condition: JSON` field (§44, §108) but never
 * specifies its shape. Per Julien's instruction (2026-08-28), this is a
 * first-cut DSL rather than an escalated DECISION-NEEDED: a small,
 * extensible discriminated union covering every achievement example listed
 * in §46, plus `all_of`/`any_of` combinators for the compound ones (e.g.
 * "The Silent One": 90 days without journal or social reactions — expressed
 * as `all_of` two `stat_below` conditions over the same window).
 *
 * Extend this union as new achievement types get designed — don't stretch
 * an existing case to mean something it wasn't meant for.
 */

export type AchievementCondition =
  | { type: 'level_reaches'; level: number }
  | { type: 'prestige_reaches'; rank: number }
  | {
      type: 'streak_reaches';
      days: number;
      scope?: 'global' | 'habit' | 'category' | 'perfect' | 'quest';
    }
  | { type: 'habit_completions_total'; count: number; category?: string }
  | { type: 'perfect_days_total'; count: number }
  | { type: 'metric_total_at_least'; metric: string; amount: number } // e.g. metric: 'deep_work_minutes', amount: 3600
  | { type: 'squad_joined' }
  | { type: 'squad_created' }
  | { type: 'encouragements_sent_total'; count: number }
  | { type: 'challenge_won' }
  | { type: 'cosmetics_owned_total'; count: number }
  | { type: 'all_sections_opened' }
  | { type: 'profile_fully_customized' } // every cosmetic slot in Profile has a non-null id
  | { type: 'habit_completions_after_hour'; hour: number; count: number } // "Night Owl": hour: 0, i.e. after midnight
  | { type: 'comeback_streak_reaches'; days: number } // returned after 30+ day absence, then hit N days
  | { type: 'arc_completed_without_squad' }
  | { type: 'days_without_activity'; activity: 'journal_entry' | 'social_reaction'; days: number }
  | { type: 'all_classes_tried' }
  | { type: 'all_of'; conditions: AchievementCondition[] }
  | { type: 'any_of'; conditions: AchievementCondition[] };

/**
 * Everything an evaluation needs. Callers (the `evaluate-achievements` Edge
 * Function) build this from the tables it just touched — it is deliberately
 * flat rather than "give me a user id and I'll query everything myself":
 * evaluation should be cheap and testable without a database.
 */
export interface AchievementEvalContext {
  level: number;
  prestigeRank: number;
  streaks: Partial<Record<'global' | 'habit' | 'category' | 'perfect' | 'quest', number>>;
  habitCompletionsTotal: number;
  habitCompletionsByCategory: Record<string, number>;
  perfectDaysTotal: number;
  metricTotals: Record<string, number>;
  hasJoinedSquad: boolean;
  hasCreatedSquad: boolean;
  encouragementsSentTotal: number;
  hasWonChallenge: boolean;
  cosmeticsOwnedTotal: number;
  allSectionsOpened: boolean;
  profileFullyCustomized: boolean;
  habitCompletionsAfterHour: Partial<Record<number, number>>;
  comebackStreakDays: number;
  arcCompletedWithoutSquad: boolean;
  daysWithoutActivity: Partial<Record<'journal_entry' | 'social_reaction', number>>;
  allClassesTried: boolean;
}

export function evaluateAchievementCondition(
  condition: AchievementCondition,
  ctx: AchievementEvalContext,
): boolean {
  switch (condition.type) {
    case 'level_reaches':
      return ctx.level >= condition.level;
    case 'prestige_reaches':
      return ctx.prestigeRank >= condition.rank;
    case 'streak_reaches':
      return (ctx.streaks[condition.scope ?? 'global'] ?? 0) >= condition.days;
    case 'habit_completions_total':
      return condition.category
        ? (ctx.habitCompletionsByCategory[condition.category] ?? 0) >= condition.count
        : ctx.habitCompletionsTotal >= condition.count;
    case 'perfect_days_total':
      return ctx.perfectDaysTotal >= condition.count;
    case 'metric_total_at_least':
      return (ctx.metricTotals[condition.metric] ?? 0) >= condition.amount;
    case 'squad_joined':
      return ctx.hasJoinedSquad;
    case 'squad_created':
      return ctx.hasCreatedSquad;
    case 'encouragements_sent_total':
      return ctx.encouragementsSentTotal >= condition.count;
    case 'challenge_won':
      return ctx.hasWonChallenge;
    case 'cosmetics_owned_total':
      return ctx.cosmeticsOwnedTotal >= condition.count;
    case 'all_sections_opened':
      return ctx.allSectionsOpened;
    case 'profile_fully_customized':
      return ctx.profileFullyCustomized;
    case 'habit_completions_after_hour':
      return (ctx.habitCompletionsAfterHour[condition.hour] ?? 0) >= condition.count;
    case 'comeback_streak_reaches':
      return ctx.comebackStreakDays >= condition.days;
    case 'arc_completed_without_squad':
      return ctx.arcCompletedWithoutSquad;
    case 'days_without_activity':
      return (ctx.daysWithoutActivity[condition.activity] ?? 0) >= condition.days;
    case 'all_classes_tried':
      return ctx.allClassesTried;
    case 'all_of':
      return condition.conditions.every((c) => evaluateAchievementCondition(c, ctx));
    case 'any_of':
      return condition.conditions.some((c) => evaluateAchievementCondition(c, ctx));
  }
}

/** Returns every achievement (by id) whose condition is now met and wasn't before. */
export function evaluateNewlyUnlockedAchievements(
  achievements: ReadonlyArray<{ id: string; condition: AchievementCondition }>,
  alreadyUnlockedIds: ReadonlySet<string>,
  ctx: AchievementEvalContext,
): string[] {
  return achievements
    .filter((a) => !alreadyUnlockedIds.has(a.id))
    .filter((a) => evaluateAchievementCondition(a.condition, ctx))
    .map((a) => a.id);
}
