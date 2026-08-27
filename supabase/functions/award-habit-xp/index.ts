import { type ClassId, classSynergyBonus } from '../../../packages/game-engine/src/classes.ts';
import { calculateXpMultiplier } from '../../../packages/game-engine/src/multipliers.ts';
import { type StreakState, advanceStreak } from '../../../packages/game-engine/src/streaks.ts';
import {
  DAILY_XP_CAP,
  applyDailyXpCap,
  levelFromTotalXp,
} from '../../../packages/game-engine/src/xp.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
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
 * - hasXpElixir / hasXpFeast (CDC §25) need an active-boosts table that
 *   doesn't exist yet in the schema. Hard-coded false.
 * - isSeasonEvent (CDC §102) needs a "current event" concept beyond the
 *   `seasons` table (which only models Battle Pass seasons, not sub-events).
 *   Hard-coded false.
 * - isEarlyBird uses UTC hour < 9 as a placeholder for "before 9am local" —
 *   there's no user timezone stored yet (CDC doesn't specify where it'd live).
 */
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

  const db = supabaseAdmin();

  const { data: habit, error: habitError } = await db
    .from('habits')
    .select('*')
    .eq('id', body.habitId)
    .eq('user_id', user.id)
    .single();
  if (habitError || !habit) return jsonResponse({ error: 'Habit not found' }, 404);

  const { data: existingLog } = await db
    .from('habit_logs')
    .select('id')
    .eq('habit_id', habit.id)
    .eq('logged_for', body.loggedFor)
    .maybeSingle();
  if (existingLog) return jsonResponse({ error: 'Already logged for this day' }, 409);

  // Completion % — boolean habits are all-or-nothing; value-based ones are
  // partial credit against target_value (CDC §32: "1.5L / 2L → 75% of XP").
  const completionPct =
    habit.type === 'boolean'
      ? 100
      : Math.min(100, Math.round(((body.value ?? 0) / (habit.target_value ?? 1)) * 100));

  const { data: profile } = await db
    .from('profiles')
    .select('total_xp, current_class_id')
    .eq('user_id', user.id)
    .single();
  if (!profile) return jsonResponse({ error: 'Profile not found' }, 404);

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
  if (logError) return jsonResponse({ error: logError.message }, 500);

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
      level: levelProgress.level,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  const streakOutcome = advanceStreak({
    state: streakState,
    today: body.loggedFor,
    completionPct,
    requiredThreshold: 60, // TODO: read from the user's Arc difficulty (CDC §9 Écran 9), not hard-coded
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

  return jsonResponse({
    xpAwarded,
    completionPct,
    multiplier: multiplier.multiplier,
    dailyXpCap: DAILY_XP_CAP,
    level: levelProgress,
    streak: streakOutcome,
  });
});
