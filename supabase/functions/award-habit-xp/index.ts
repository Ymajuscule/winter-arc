// @ts-nocheck -- Deno Edge Function (npm:/Deno.serve), not resolved by the repo's Node/tsc typecheck.
/**
 * award-habit-xp — CDC §31-32 (habit completion) + §17-21 (XP/level).
 *
 * The one Edge Function the whole Phase 1 loop depends on: mobile calls this
 * on habit completion, it is the only writer of xp_transactions / habit_logs
 * / streaks / profiles.level for this action (CDC §127 — mobile never
 * computes official XP).
 *
 * Known gaps, intentionally not guessed at:
 * - isPerfectDay (CDC §19) needs "did every active habit get logged today",
 *   which means querying all of today's habits, not just this one. Hard-coded
 *   false until that query is written.
 * - hasXpElixir / hasXpFeast (CDC §25): active_boosts table now exists
 *   (20260828010000_active_boosts.sql) but isn't queried here yet — next
 *   pass. Still hard-coded false.
 * - isSeasonEvent (CDC §102) needs a "current event" concept beyond the
 *   `seasons` table (which only models Battle Pass seasons, not sub-events).
 *   Hard-coded false.
 * - isEarlyBird uses UTC hour < 9 as a placeholder for "before 9am local" —
 *   there's no user timezone stored yet (CDC doesn't specify where it'd live).
 * - Streak threshold now reads profiles.difficulty via
 *   STREAK_THRESHOLD_BY_DIFFICULTY (game-engine/streaks.ts) instead of a
 *   hard-coded 60 — closes a gap this file used to flag directly.
 *
 * Wrapped in withIdempotency (2026-08-28) — a retried network call with the
 * same Idempotency-Key header replays the cached result instead of
 * double-logging the habit. Also now calls evaluateAndUnlockAchievements
 * after the streak write, since a habit completion is exactly the kind of
 * event that can cross an achievement threshold (level/streak/category
 * count) — the response's `achievements` field is empty most of the time and
 * populated exactly when something unlocks.
 */
import { type ClassId, classSynergyBonus } from '../../../packages/game-engine/src/classes.ts';
import { calculateXpMultiplier } from '../../../packages/game-engine/src/multipliers.ts';
import {
  type Difficulty,
  STREAK_THRESHOLD_BY_DIFFICULTY,
  type StreakState,
  advanceStreak,
} from '../../../packages/game-engine/src/streaks.ts';
import {
  DAILY_XP_CAP,
  applyDailyXpCap,
  levelFromTotalXp,
} from '../../../packages/game-engine/src/xp.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { evaluateAndUnlockAchievements } from '../_shared/evaluate-achievements.ts';
import { withIdempotency } from '../_shared/idempotency.ts';
import { getUserFromRequest, supabaseAdmin } from '../_shared/supabase-admin.ts';

interface AwardHabitXpBody {
  habitId: string;
  loggedFor: string; // "YYYY-MM-DD"
  value?: number; // for numeric/duration/counter/distance habits
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const user = await getUserFromRequest(req);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

  const body = (await req.json()) as AwardHabitXpBody;
  if (!body.habitId || !body.loggedFor) {
    return jsonResponse({ error: 'habitId and loggedFor are required' }, 400);
  }

  return withIdempotency(req, user.id, 'award-habit-xp', async () => {
    const db = supabaseAdmin();

    const { data: habit, error: habitError } = await db
      .from('habits')
      .select('*')
      .eq('id', body.habitId)
      .eq('user_id', user.id)
      .single();
    if (habitError || !habit) return { status: 404, body: { error: 'Habit not found' } };

    const { data: existingLog } = await db
      .from('habit_logs')
      .select('id')
      .eq('habit_id', habit.id)
      .eq('logged_for', body.loggedFor)
      .maybeSingle();
    if (existingLog) return { status: 409, body: { error: 'Already logged for this day' } };

    // Completion % — boolean habits are all-or-nothing; value-based ones are
    // partial credit against target_value (CDC §32: "1.5L / 2L → 75% of XP").
    const completionPct =
      habit.type === 'boolean'
        ? 100
        : Math.min(100, Math.round(((body.value ?? 0) / (habit.target_value ?? 1)) * 100));

    const { data: profile } = await db
      .from('profiles')
      .select('total_xp, lifetime_xp, current_class_id, difficulty')
      .eq('user_id', user.id)
      .single();
    if (!profile) return { status: 404, body: { error: 'Profile not found' } };

    const { data: streakRow } = await db
      .from('streaks')
      .select('*')
      .eq('user_id', user.id)
      .eq('scope', 'global')
      .is('scope_ref', null)
      .maybeSingle();

    const streakState: StreakState = streakRow ?? {
      currentCount: 0,
      longestCount: 0,
      lastCompletedOn: null,
      freezeUsedOn: null,
    };

    const now = new Date();
    const isWeekend = now.getUTCDay() === 0 || now.getUTCDay() === 6;
    const isEarlyBird = now.getUTCHours() < 9; // see gaps note above

    const multiplier = calculateXpMultiplier({
      streakDays: streakState.currentCount,
      isPerfectDay: false, // gap, see file header
      isClassSynergy: profile.current_class_id
        ? classSynergyBonus(profile.current_class_id as ClassId, habit.category) > 0
        : false,
      isEarlyBird,
      isWeekend,
      hasXpElixir: false, // gap, see file header
      hasXpFeast: false, // gap, see file header
      isSeasonEvent: false, // gap, see file header
      isComebackStreak: false, // gap, see file header
    });

    const rawXp = Math.round(habit.xp_value * (completionPct / 100) * multiplier.multiplier);

    const { data: todaysXp } = await db
      .from('xp_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .gte('created_at', `${body.loggedFor}T00:00:00Z`)
      .lt('created_at', `${body.loggedFor}T23:59:59Z`);
    const xpEarnedTodaySoFar = (todaysXp ?? []).reduce((sum, row) => sum + row.amount, 0);
    const { applied: xpAwarded } = applyDailyXpCap(xpEarnedTodaySoFar, rawXp);

    const { error: logError } = await db.from('habit_logs').insert({
      habit_id: habit.id,
      user_id: user.id,
      logged_for: body.loggedFor,
      value: body.value ?? null,
      completion_pct: completionPct,
      xp_awarded: xpAwarded,
    });
    if (logError) return { status: 500, body: { error: logError.message } };

    if (xpAwarded > 0) {
      await db.from('xp_transactions').insert({
        user_id: user.id,
        amount: xpAwarded,
        source: 'habit',
        source_id: habit.id,
        multiplier: multiplier.multiplier,
      });
    }

    const newTotalXp = profile.total_xp + xpAwarded;
    const levelProgress = levelFromTotalXp(newTotalXp);
    await db
      .from('profiles')
      .update({
        total_xp: newTotalXp,
        lifetime_xp: profile.lifetime_xp + xpAwarded, // CDC §23-24 — never reset by prestige
        level: levelProgress.level,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    const streakOutcome = advanceStreak({
      state: streakState,
      today: body.loggedFor,
      completionPct,
      requiredThreshold: STREAK_THRESHOLD_BY_DIFFICULTY[profile.difficulty as Difficulty],
      freezesAllowedThisMonth: 1,
      freezesUsedThisMonth: 0, // TODO: derive from streakState.freezeUsedOn vs current month
      wasActiveSixOfLastSeven: false, // TODO: needs a 7-day habit_logs lookback query
    });
    await db.from('streaks').upsert({
      user_id: user.id,
      scope: 'global',
      scope_ref: null,
      current_count: streakOutcome.state.currentCount,
      longest_count: streakOutcome.state.longestCount,
      last_completed_on: streakOutcome.state.lastCompletedOn,
      freeze_used_on: streakOutcome.state.freezeUsedOn,
      updated_at: new Date().toISOString(),
    });

    const achievements = await evaluateAndUnlockAchievements(user.id);

    return {
      status: 200,
      body: {
        xpAwarded,
        completionPct,
        multiplier: multiplier.multiplier,
        dailyXpCap: DAILY_XP_CAP,
        level: levelProgress,
        streak: streakOutcome,
        achievements,
      },
    };
  });
});
