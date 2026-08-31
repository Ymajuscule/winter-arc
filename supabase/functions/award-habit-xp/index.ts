// @ts-nocheck -- Deno Edge Function (npm:/Deno.serve), not resolved by the repo's Node/tsc typecheck.
/**
 * award-habit-xp — CDC §31-32 (habit completion) + §17-21 (XP/level).
 *
 * The one Edge Function the whole Phase 1 loop depends on: mobile calls this
 * on habit completion, it is the only writer of xp_transactions / habit_logs
 * / streaks / profiles.level for this action (CDC §127 — mobile never
 * computes official XP).
 *
 * Two real bugs fixed here on 2026-08-31, both silent:
 * - The `streaks` row (snake_case) was assigned straight into a `StreakState`
 *   (camelCase), so every field read `undefined` and the streak count went to
 *   NaN on the first completion. bootstrap-profile creates that row for every
 *   user, so this hit everyone — see the mapping's own comment below.
 * - `advanceStreak` was given *this habit's* completion percentage as the
 *   whole day's rate, so completing one habit out of ten held even an
 *   `extreme` (95%) streak. It now gets `dayCompletionPct` over the user's
 *   active habits (game-engine), matching what that input documents.
 *
 * Known gaps, intentionally not guessed at:
 * - isSeasonEvent (CDC §102) needs a "current event" concept beyond the
 *   `seasons` table (which only models Battle Pass seasons, not sub-events).
 *   Hard-coded false.
 * - isComebackStreak (CDC §43) needs to know when a broken streak was
 *   restarted; `streaks` has no such column yet. Hard-coded false — the
 *   Comeback experience is its own open Phase 1 item in TODO.md.
 * - isEarlyBird uses UTC hour < 9 as a placeholder for "before 9am local" —
 *   there's no user timezone stored yet (CDC doesn't specify where it'd live).
 * - freezesAllowedThisMonth is the flat default; the Anchor skill's +1
 *   (CDC §22) needs a user_skills read, same TODO advance-streak carries.
 *
 * Closed since the last pass: isPerfectDay and hasXpElixir/hasXpFeast are
 * both real now (the day's logs and the `active_boosts` table respectively),
 * as are freezesUsedThisMonth and wasActiveSixOfLastSeven.
 *
 * Wrapped in withIdempotency (2026-08-28) — a retried network call with the
 * same Idempotency-Key header replays the cached result instead of
 * double-logging the habit. Also now calls evaluateAndUnlockAchievements
 * after the streak write, since a habit completion is exactly the kind of
 * event that can cross an achievement threshold (level/streak/category
 * count) — the response's `achievements` field is empty most of the time and
 * populated exactly when something unlocks.
 *
 * Real gap found while wiring the mobile app to this function (2026-08-28,
 * continuation 4): this never touched user_currency, so Coins (CDC §70)
 * would have silently stayed at 0 forever through the real API. Fixed —
 * habit.difficulty 'easy'/'medium' -> +2 Coins, 'hard'/'extreme' -> +8,
 * matching CDC §70's "simple / difficile" split onto the 4-tier difficulty
 * column that actually exists (CDC's own table is binary, the schema isn't).
 */
import { type ClassId, classSynergyBonus } from '../../../packages/game-engine/src/classes.ts';
import { calculateXpMultiplier } from '../../../packages/game-engine/src/multipliers.ts';
import {
  type Difficulty,
  FREEZES_PER_MONTH_DEFAULT,
  STREAK_THRESHOLD_BY_DIFFICULTY,
  type StreakState,
  advanceStreak,
  dayCompletionPct,
  isPerfectDay,
  isSameCalendarMonth,
} from '../../../packages/game-engine/src/streaks.ts';
import {
  DAILY_XP_CAP,
  applyDailyXpCap,
  levelFromTotalXp,
} from '../../../packages/game-engine/src/xp.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  countActiveDays,
  fetchActiveHabitIds,
  fetchDayLogs,
  isoDateBefore,
} from '../_shared/day-history.ts';
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

    // `streaks` is snake_case, StreakState is camelCase. Assigning the row
    // straight across (as this did until 2026-08-31) left every field
    // `undefined`, so `state.currentCount + 1` evaluated to NaN and the upsert
    // below wrote that back — silently, since its error was never checked.
    // bootstrap-profile creates this row for every user, so the row always
    // existed and the streak never advanced for anyone. advance-streak had
    // always mapped it explicitly; this now matches.
    const streakState: StreakState = streakRow
      ? {
          currentCount: streakRow.current_count,
          longestCount: streakRow.longest_count,
          lastCompletedOn: streakRow.last_completed_on,
          freezeUsedOn: streakRow.freeze_used_on,
        }
      : { currentCount: 0, longestCount: 0, lastCompletedOn: null, freezeUsedOn: null };

    // --- The whole day, not just this habit ---------------------------------
    // The multiplier's Perfect Day bonus and the streak's threshold are both
    // about the day as a whole. This completion isn't inserted yet, so fold it
    // in by hand — the numbers should describe the state the user lands in.
    const activeHabitIds = await fetchActiveHabitIds(db, user.id);
    const dayLogs = [
      ...(await fetchDayLogs(db, user.id, body.loggedFor)),
      { habitId: habit.id as string, completionPct },
    ];
    const dayPct = dayCompletionPct(activeHabitIds, dayLogs);
    const perfectDay = isPerfectDay(activeHabitIds, dayLogs);

    // Active XP boosts — CDC §25. The active_boosts table has existed since
    // migration 20260828010000; nothing read it until now.
    const { data: boosts } = await db
      .from('active_boosts')
      .select('type')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString());
    const hasXpElixir = (boosts ?? []).some((b: { type: string }) => b.type === 'xp_elixir');
    const hasXpFeast = (boosts ?? []).some((b: { type: string }) => b.type === 'xp_feast');

    const now = new Date();
    const isWeekend = now.getUTCDay() === 0 || now.getUTCDay() === 6;
    const isEarlyBird = now.getUTCHours() < 9; // see gaps note above

    const multiplier = calculateXpMultiplier({
      streakDays: streakState.currentCount,
      isPerfectDay: perfectDay,
      isClassSynergy: profile.current_class_id
        ? classSynergyBonus(profile.current_class_id as ClassId, habit.category) > 0
        : false,
      isEarlyBird,
      isWeekend,
      hasXpElixir,
      hasXpFeast,
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

    const coinsAwarded =
      xpAwarded > 0 ? (habit.difficulty === 'hard' || habit.difficulty === 'extreme' ? 8 : 2) : 0;
    if (coinsAwarded > 0) {
      const { data: currency } = await db
        .from('user_currency')
        .select('coins')
        .eq('user_id', user.id)
        .single();
      await db
        .from('user_currency')
        .update({
          coins: (currency?.coins ?? 0) + coinsAwarded,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    }

    const requiredThreshold = STREAK_THRESHOLD_BY_DIFFICULTY[profile.difficulty as Difficulty];
    // CDC §42's automatic freeze needs "active on 6 of the 7 days before
    // today" — the same window and the same per-day rule advance-streak uses.
    const activeDaysBefore = await countActiveDays(
      db,
      user.id,
      activeHabitIds,
      isoDateBefore(body.loggedFor, 7),
      body.loggedFor,
      requiredThreshold,
    );

    const streakOutcome = advanceStreak({
      state: streakState,
      today: body.loggedFor,
      // The day's rate, not this one habit's: passing `completionPct` here let
      // a single 100%-completed habit hold an `extreme` (95%) streak.
      completionPct: dayPct,
      requiredThreshold,
      freezesAllowedThisMonth: FREEZES_PER_MONTH_DEFAULT, // TODO: +1 with the Anchor skill (user_skills)
      freezesUsedThisMonth:
        streakState.freezeUsedOn && isSameCalendarMonth(streakState.freezeUsedOn, body.loggedFor)
          ? 1
          : 0,
      wasActiveSixOfLastSeven: activeDaysBefore >= 6,
    });
    const { error: streakError } = await db.from('streaks').upsert(
      {
        user_id: user.id,
        scope: 'global',
        scope_ref: null,
        current_count: streakOutcome.state.currentCount,
        longest_count: streakOutcome.state.longestCount,
        last_completed_on: streakOutcome.state.lastCompletedOn,
        freeze_used_on: streakOutcome.state.freezeUsedOn,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,scope,scope_ref' },
    );
    // Not fatal — the XP is already granted and the log already written, so
    // failing the whole request here would strand the client. But it must not
    // stay silent the way it did while it was writing NaN.
    if (streakError) console.error('streak upsert failed', streakError.message);

    const achievements = await evaluateAndUnlockAchievements(user.id);

    return {
      status: 200,
      body: {
        xpAwarded,
        coinsAwarded,
        completionPct,
        dayCompletionPct: dayPct,
        isPerfectDay: perfectDay,
        multiplier: multiplier.multiplier,
        dailyXpCap: DAILY_XP_CAP,
        level: levelProgress,
        streak: streakOutcome,
        achievements,
      },
    };
  });
});
