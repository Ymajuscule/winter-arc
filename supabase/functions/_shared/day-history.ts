// @ts-nocheck -- Deno Edge Function module, not resolved by the repo's Node/tsc typecheck.
/**
 * The habit-day queries `award-habit-xp` and `advance-streak` both need to
 * answer "how much of this day did the user actually complete".
 *
 * Extracted 2026-08-31 because the two functions had each grown their own
 * version and they disagreed: `award-habit-xp` passed a *single habit's*
 * completion as the whole day's rate, `advance-streak` averaged over only the
 * habits that happened to be logged. Both let a user hold an `extreme` (95%)
 * streak by logging one habit out of ten. The arithmetic itself lives in
 * `game-engine/streaks.ts` (`dayCompletionPct`, unit-tested); this module is
 * only the Supabase reads that feed it.
 */
import { type HabitDayLog, dayCompletionPct } from '../../../packages/game-engine/src/streaks.ts';
import type { supabaseAdmin } from './supabase-admin.ts';

/** The service-role client the caller already holds — passed in rather than rebuilt per helper. */
type Db = ReturnType<typeof supabaseAdmin>;

/**
 * The habits that count toward a day's completion rate: active and not
 * paused. A paused habit (CDC §37 vacation mode) must not drag the rate down
 * — that's the whole point of pausing it.
 */
export async function fetchActiveHabitIds(db: Db, userId: string): Promise<string[]> {
  const { data } = await db
    .from('habits')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('is_paused', false);
  return (data ?? []).map((row: { id: string }) => row.id);
}

/** One day's habit logs, in the shape `game-engine` expects. */
export async function fetchDayLogs(
  db: Db,
  userId: string,
  loggedFor: string,
): Promise<HabitDayLog[]> {
  const { data } = await db
    .from('habit_logs')
    .select('habit_id, completion_pct')
    .eq('user_id', userId)
    .eq('logged_for', loggedFor);
  return (data ?? []).map((row: { habit_id: string; completion_pct: number }) => ({
    habitId: row.habit_id,
    completionPct: Number(row.completion_pct),
  }));
}

/**
 * How many of the days in `[fromInclusive, toExclusive)` met `threshold`.
 * Feeds `advanceStreak`'s `wasActiveSixOfLastSeven` (CDC §42 auto-freeze).
 *
 * Known approximation: it scores history against the habit set that is
 * active *now*, because `habits` has no per-day activation history to
 * reconstruct what was active last Tuesday. A user who added habits this
 * week therefore looks slightly less active last week than they were. Erring
 * that way is the safe direction — it withholds an automatic freeze rather
 * than granting one that wasn't earned.
 */
export async function countActiveDays(
  db: Db,
  userId: string,
  activeHabitIds: readonly string[],
  fromInclusive: string,
  toExclusive: string,
  threshold: number,
): Promise<number> {
  if (activeHabitIds.length === 0) return 0;

  const { data } = await db
    .from('habit_logs')
    .select('logged_for, habit_id, completion_pct')
    .eq('user_id', userId)
    .gte('logged_for', fromInclusive)
    .lt('logged_for', toExclusive);

  const logsByDay = new Map<string, HabitDayLog[]>();
  for (const row of data ?? []) {
    const day = row.logged_for as string;
    const bucket = logsByDay.get(day) ?? [];
    bucket.push({ habitId: row.habit_id as string, completionPct: Number(row.completion_pct) });
    logsByDay.set(day, bucket);
  }

  let count = 0;
  for (const logs of logsByDay.values()) {
    if (dayCompletionPct(activeHabitIds, logs) >= threshold) count++;
  }
  return count;
}

/** `isoDate` shifted back by `days`, still as "YYYY-MM-DD". */
export function isoDateBefore(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) - days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}
