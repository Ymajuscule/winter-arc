// @ts-nocheck -- Deno Edge Function (npm:/Deno.serve), not resolved by the repo's Node/tsc typecheck.
/**
 * rotate-quests — CDC §33-34, pg_cron target (docs/api-specifications.md).
 *
 * NOT called by mobile — same auth model as advance-streak (shared
 * X-Cron-Secret header, no user JWT since Postgres itself invokes this).
 * Meant to run once daily, early morning, alongside advance-streak. Assigns
 * `DAILY_QUEST_SLOTS` (3) daily quest instances to every profile every day,
 * and `WEEKLY_QUEST_SLOTS_MIN` (3) weekly instances on Mondays (UTC) for the
 * Mon-Sun window — both slot counts from packages/game-engine/src/quests.ts.
 * Idempotent per period: re-running the same day (or the same week) is a
 * no-op for a user who already has instances for that exact period, so a
 * retried cron call can't double-assign.
 *
 * Selection is uniform-random over the whole daily/weekly pool
 * (supabase/seed/004_quest_definitions.sql) — CDC §33 says selection should
 * favor a user's fragile habits/under-fed stats/class, but that needs
 * per-user habit-history analysis this pass doesn't build (decided directly
 * per Julien's 2026-08-28 "débrouille-toi" instruction: ship a genuinely-
 * completable random rotation now, personalize later rather than block on
 * it). `quest_definitions.class_id`-scoped rows aren't seeded yet either —
 * every current definition is generic (class_id null).
 *
 * Does NOT refresh progress on already-assigned active quests — that's a
 * documented gap in _shared/quest-progress.ts's file header. `claim-quest`
 * recomputes and persists progress on every call (even a failed/incomplete
 * one), which is the only place `user_quests.progress` updates today.
 */
import {
  DAILY_QUEST_SLOTS,
  WEEKLY_QUEST_SLOTS_MIN,
} from '../../../packages/game-engine/src/quests.ts';
import { jsonResponse } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Sunday (inclusive) of the week that starts on the given Monday-date string. */
function sundayOf(mondayIso: string): string {
  const d = new Date(`${mondayIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  const provided = req.headers.get('X-Cron-Secret');
  if (!cronSecret || provided !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const db = supabaseAdmin();
  const today = todayIso();
  const isMonday = new Date(`${today}T00:00:00Z`).getUTCDay() === 1;
  const weekEnd = isMonday ? sundayOf(today) : null;

  const { data: dailyDefs } = await db.from('quest_definitions').select('id').eq('type', 'daily');
  const { data: weeklyDefs } = isMonday
    ? await db.from('quest_definitions').select('id').eq('type', 'weekly')
    : { data: [] as { id: string }[] };

  const { data: profiles } = await db.from('profiles').select('user_id');

  let dailyAssigned = 0;
  let weeklyAssigned = 0;

  for (const profile of profiles ?? []) {
    const { data: existingDaily } = await db
      .from('user_quests')
      .select('id')
      .eq('user_id', profile.user_id)
      .eq('period_start', today)
      .eq('period_end', today);

    if ((existingDaily?.length ?? 0) === 0 && (dailyDefs?.length ?? 0) > 0) {
      const chosen = pickRandom(dailyDefs ?? [], DAILY_QUEST_SLOTS);
      await db.from('user_quests').insert(
        chosen.map((d) => ({
          user_id: profile.user_id,
          quest_definition_id: d.id,
          period_start: today,
          period_end: today,
        })),
      );
      dailyAssigned += chosen.length;
    }

    if (isMonday && weekEnd && (weeklyDefs?.length ?? 0) > 0) {
      const { data: existingWeekly } = await db
        .from('user_quests')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('period_start', today)
        .eq('period_end', weekEnd);

      if ((existingWeekly?.length ?? 0) === 0) {
        const chosen = pickRandom(weeklyDefs ?? [], WEEKLY_QUEST_SLOTS_MIN);
        await db.from('user_quests').insert(
          chosen.map((d) => ({
            user_id: profile.user_id,
            quest_definition_id: d.id,
            period_start: today,
            period_end: weekEnd,
          })),
        );
        weeklyAssigned += chosen.length;
      }
    }
  }

  return jsonResponse({
    date: today,
    isMonday,
    usersProcessed: profiles?.length ?? 0,
    dailyInstancesAssigned: dailyAssigned,
    weeklyInstancesAssigned: weeklyAssigned,
  });
});
