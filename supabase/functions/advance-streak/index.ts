// @ts-nocheck -- Deno Edge Function (npm:/Deno.serve), not resolved by the repo's Node/tsc typecheck.
/**
 * advance-streak — CDC §40-43, pg_cron target (docs/api-specifications.md).
 *
 * NOT called by mobile — this is the Grace Period cutoff job (00:00-03:00,
 * CDC §42), meant to run once daily around 03:00 via pg_cron + a scheduled
 * HTTP call. It closes out "yesterday" for every user whose global streak
 * wasn't already advanced today by award-habit-xp — i.e. it's specifically
 * for users who didn't open the app at all that day. Distinct auth model
 * from every other function here: there's no user JWT when Postgres itself
 * invokes this, so it checks a shared secret header instead of
 * getUserFromRequest. Julien sets CRON_SECRET as an Edge Function secret and
 * configures the pg_cron job to send it — neither done by this session
 * (Supabase-side config, not a file to write).
 *
 * Known gaps, intentionally not guessed at:
 * - Streak Freeze monthly-usage tracking (`freezesUsedThisMonth`) is
 *   approximated from `streaks.freeze_used_on` being within the current
 *   calendar month — correct for the "at most 1 freeze/month" default, but
 *   doesn't account for the Anchor skill's monthly-allowance-of-2 (CDC §22)
 *   since user_skills isn't queried here yet.
 * - Streak-milestone achievements (e.g. "100-day streak") aren't
 *   re-evaluated here even when a milestone is hit — evaluateAndUnlockAchievements
 *   runs per-user on every award-habit-xp call, so a user who's been away
 *   gets caught up the next time they open the app and log anything. Calling
 *   it here too would mean an extra full-context query per affected user in
 *   a batch job; left for the next pass once this function has a way to
 *   measure its own run time in production.
 */
import {
  type Difficulty,
  FREEZES_PER_MONTH_DEFAULT,
  STREAK_THRESHOLD_BY_DIFFICULTY,
  type StreakState,
  advanceStreak,
  dayCompletionPct,
  isSameCalendarMonth,
  milestoneReachedAt,
} from '../../../packages/game-engine/src/streaks.ts';
import { levelFromTotalXp } from '../../../packages/game-engine/src/xp.ts';
import { jsonResponse } from '../_shared/cors.ts';
import {
  countActiveDays,
  fetchActiveHabitIds,
  fetchDayLogs,
  isoDateBefore,
} from '../_shared/day-history.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';

function isoDateDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  const provided = req.headers.get('X-Cron-Secret');
  if (!cronSecret || provided !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const db = supabaseAdmin();
  const yesterday = isoDateDaysAgo(1);
  // Inclusive lower bound of the "6 of the last 7 days" window ending at
  // (but excluding) `yesterday` — i.e. exactly 7 days. The previous bound was
  // an exclusive `isoDateDaysAgo(8)`, which made the window 6 days wide and
  // so demanded all 6 of them, not 6 of 7.
  const windowStart = isoDateBefore(yesterday, 7);

  const { data: streakRows } = await db
    .from('streaks')
    .select('*')
    .eq('scope', 'global')
    .is('scope_ref', null);

  const results: Array<{ userId: string; outcome: string }> = [];

  for (const streakRow of streakRows ?? []) {
    // Already advanced today (via award-habit-xp during the user's own session) — nothing to do.
    if (streakRow.last_completed_on === yesterday) continue;

    const { data: profile } = await db
      .from('profiles')
      .select('difficulty, total_xp, lifetime_xp')
      .eq('user_id', streakRow.user_id)
      .single();
    if (!profile) continue;

    const threshold = STREAK_THRESHOLD_BY_DIFFICULTY[profile.difficulty as Difficulty];

    // Yesterday's rate over every *active* habit — an unlogged habit counts as
    // 0. This used to average over only the habits that had a log, which meant
    // a user who logged one habit out of ten scored 100% for the day and held
    // an `extreme` streak on it. Shared with award-habit-xp so both writers of
    // this row agree on what a completed day is.
    const activeHabitIds = await fetchActiveHabitIds(db, streakRow.user_id);
    const completionPct = dayCompletionPct(
      activeHabitIds,
      await fetchDayLogs(db, streakRow.user_id, yesterday),
    );

    const activeDaysCount = await countActiveDays(
      db,
      streakRow.user_id,
      activeHabitIds,
      windowStart,
      yesterday,
      threshold,
    );

    const state: StreakState = {
      currentCount: streakRow.current_count,
      longestCount: streakRow.longest_count,
      lastCompletedOn: streakRow.last_completed_on,
      freezeUsedOn: streakRow.freeze_used_on,
    };

    const outcome = advanceStreak({
      state,
      today: yesterday,
      completionPct,
      requiredThreshold: threshold,
      freezesAllowedThisMonth: FREEZES_PER_MONTH_DEFAULT, // TODO: +1 with the Anchor skill (user_skills) — see file header
      freezesUsedThisMonth:
        streakRow.freeze_used_on && isSameCalendarMonth(streakRow.freeze_used_on, yesterday)
          ? 1
          : 0,
      wasActiveSixOfLastSeven: activeDaysCount >= 6,
    });

    await db
      .from('streaks')
      .update({
        current_count: outcome.state.currentCount,
        longest_count: outcome.state.longestCount,
        last_completed_on: outcome.state.lastCompletedOn,
        freeze_used_on: outcome.state.freezeUsedOn,
        updated_at: new Date().toISOString(),
      })
      .eq('id', streakRow.id);

    if (outcome.kind === 'extended' || outcome.kind === 'frozen') {
      const milestone = milestoneReachedAt(outcome.state.currentCount);
      if (milestone) {
        await db.from('xp_transactions').insert({
          user_id: streakRow.user_id,
          amount: milestone.xp,
          source: 'streak_milestone',
          multiplier: 1.0,
        });
        const newTotalXp = profile.total_xp + milestone.xp;
        const levelProgress = levelFromTotalXp(newTotalXp);
        await db
          .from('profiles')
          .update({
            total_xp: newTotalXp,
            lifetime_xp: profile.lifetime_xp + milestone.xp,
            level: levelProgress.level,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', streakRow.user_id);
      }
    }

    results.push({ userId: streakRow.user_id, outcome: outcome.kind });
  }

  return jsonResponse({ processedFor: yesterday, count: results.length, results });
});
