// @ts-nocheck -- Deno Edge Function shared helper, not resolved by the repo's Node/tsc typecheck.
/**
 * evaluate-achievements — CDC §44-48, docs/api-specifications.md.
 *
 * Per that doc: "appelée en interne par les autres fonctions (pas
 * directement par le mobile) après tout événement qui pourrait débloquer un
 * achievement." There's no separate deployed function for it — Deno Edge
 * Functions don't share process memory across deployments, and invoking one
 * via HTTP from inside another just to reuse logic would be slower and
 * harder to reason about than importing a plain function. So this is a
 * shared helper (`_shared/`, like `idempotency.ts`), called directly by
 * `award-habit-xp` and any future function that can move the needle on an
 * achievement (claim-quest, advance-streak, apply-prestige). Decided
 * directly per CLAUDE.md §8 category 2 (pure engineering choice) — logged
 * here rather than escalated.
 *
 * Builds `AchievementEvalContext` (packages/game-engine/src/achievements.ts)
 * from the tables this function can see, evaluates every not-yet-unlocked
 * achievement, and for each newly-unlocked one: inserts `user_achievements`,
 * grants `xp_reward`/`coins_reward` (xp_transactions + profiles.total_xp/
 * level, same as a habit completion), and grants `cosmetic_reward` (if any)
 * into `user_cosmetics`.
 *
 * Known context gaps — fields the schema genuinely can't answer yet, kept at
 * a safe default (never falsely unlocks something) rather than guessed:
 * - `perfectDaysTotal`: same root cause as award-habit-xp's `isPerfectDay`
 *   gap (needs "how many habits were active that day", not reconstructable
 *   from habit_logs alone yet) — 0.
 * - `metricTotals`: no metric-tagged logging exists in the schema (deep work
 *   minutes, pages read, etc. aren't captured anywhere) — {}.
 * - `encouragementsSentTotal`, `hasWonChallenge`, `allSectionsOpened`,
 *   `comebackStreakDays`, `arcCompletedWithoutSquad`, `allClassesTried`: no
 *   underlying table/column models these yet (encouragements and challenge
 *   winners are Phase 2 social features per CDC §81-83; section-opened and
 *   comeback tracking are client engagement state with no server model) —
 *   left at their "never true" default so the achievements gated on them
 *   simply don't unlock yet, rather than risking a false positive.
 * - `daysWithoutActivity.social_reaction`: no reactions table exists — same
 *   reasoning, defaulted so "The Silent One" can't falsely unlock on a half
 *   real / half fake context.
 */
import {
  type AchievementCondition,
  evaluateNewlyUnlockedAchievements,
} from '../../../packages/game-engine/src/achievements.ts';
import { levelFromTotalXp } from '../../../packages/game-engine/src/xp.ts';
import { supabaseAdmin } from './supabase-admin.ts';

export interface AchievementUnlockResult {
  newlyUnlockedIds: string[];
  xpAwarded: number;
  coinsAwarded: number;
  cosmeticIdsGranted: string[];
}

const PROFILE_COSMETIC_SLOTS = [
  'avatar_id',
  'frame_id',
  'aura_id',
  'banner_id',
  'nameplate_id',
  'title_id',
  'emblem_id',
  'sigil_id',
  'theme_id',
  'flame_style_id',
  'xp_bar_style_id',
  'level_badge_id',
] as const;

/** "Night Owl" window (CDC §46 hidden) — completions logged at UTC hour >= h, within 00:00-05:59. */
const NIGHT_OWL_WINDOW_END_HOUR = 6;

export async function evaluateAndUnlockAchievements(
  userId: string,
): Promise<AchievementUnlockResult> {
  const db = supabaseAdmin();

  const [
    { data: profile },
    { data: streakRows },
    { data: habitLogs },
    { data: userAchievementRows },
    { data: allAchievements },
    { data: squadMemberRows },
    { data: createdSquads },
    { data: userCosmeticsCount },
    { data: journalEntries },
  ] = await Promise.all([
    db
      .from('profiles')
      .select(
        'level, prestige_rank, avatar_id, frame_id, aura_id, banner_id, nameplate_id, title_id, emblem_id, sigil_id, theme_id, flame_style_id, xp_bar_style_id, level_badge_id',
      )
      .eq('user_id', userId)
      .single(),
    db.from('streaks').select('scope, current_count').eq('user_id', userId),
    db
      .from('habit_logs')
      .select('completion_pct, created_at, habits(category)')
      .eq('user_id', userId),
    db.from('user_achievements').select('achievement_id').eq('user_id', userId),
    db.from('achievements').select('id, condition, xp_reward, coins_reward, cosmetic_reward'),
    db.from('squad_members').select('squad_id').eq('user_id', userId),
    db.from('squads').select('id').eq('created_by', userId),
    db
      .from('user_cosmetics')
      .select('cosmetic_id', { count: 'exact', head: true })
      .eq('user_id', userId),
    db
      .from('journal_entries')
      .select('entry_date')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .limit(1),
  ]);

  if (!profile) throw new Error(`No profile for user ${userId}`);

  const streaks: Record<string, number> = {};
  for (const row of streakRows ?? []) {
    streaks[row.scope] = row.current_count;
  }

  const habitCompletionsTotal = (habitLogs ?? []).length;
  const habitCompletionsByCategory: Record<string, number> = {};
  const habitCompletionsAfterHour: Record<number, number> = {};
  for (let h = 0; h < NIGHT_OWL_WINDOW_END_HOUR; h += 1) habitCompletionsAfterHour[h] = 0;

  for (const log of habitLogs ?? []) {
    const category = (log as { habits?: { category?: string } }).habits?.category;
    if (category) {
      habitCompletionsByCategory[category] = (habitCompletionsByCategory[category] ?? 0) + 1;
    }
    const hour = new Date(log.created_at as string).getUTCHours();
    if (hour < NIGHT_OWL_WINDOW_END_HOUR) {
      for (let h = 0; h <= hour; h += 1) habitCompletionsAfterHour[h] += 1;
    }
  }

  const daysSinceLastJournalEntry = journalEntries?.[0]
    ? Math.floor(
        (Date.now() - Date.parse(`${journalEntries[0].entry_date}T00:00:00Z`)) / 86_400_000,
      )
    : 0; // no entries ever logged -> treat as "not stale" (0), not "always stale"

  const profileFullyCustomized = PROFILE_COSMETIC_SLOTS.every(
    (slot) => (profile as Record<string, unknown>)[slot] != null,
  );

  const ctx = {
    level: profile.level,
    prestigeRank: profile.prestige_rank,
    streaks,
    habitCompletionsTotal,
    habitCompletionsByCategory,
    perfectDaysTotal: 0, // gap — see file header
    metricTotals: {}, // gap — see file header
    hasJoinedSquad: (squadMemberRows ?? []).length > 0,
    hasCreatedSquad: (createdSquads ?? []).length > 0,
    encouragementsSentTotal: 0, // gap — see file header
    hasWonChallenge: false, // gap — see file header
    cosmeticsOwnedTotal: userCosmeticsCount?.length ?? 0,
    allSectionsOpened: false, // gap — see file header
    profileFullyCustomized,
    habitCompletionsAfterHour,
    comebackStreakDays: 0, // gap — see file header
    arcCompletedWithoutSquad: false, // gap — see file header
    daysWithoutActivity: {
      journal_entry: daysSinceLastJournalEntry,
      social_reaction: 0, // gap — see file header
    },
    allClassesTried: false, // gap — see file header
  };

  const alreadyUnlocked = new Set((userAchievementRows ?? []).map((r) => r.achievement_id));
  const catalog = (allAchievements ?? []).map((a) => ({
    id: a.id as string,
    condition: a.condition as AchievementCondition,
  }));

  const newlyUnlockedIds = evaluateNewlyUnlockedAchievements(catalog, alreadyUnlocked, ctx);
  if (newlyUnlockedIds.length === 0) {
    return { newlyUnlockedIds: [], xpAwarded: 0, coinsAwarded: 0, cosmeticIdsGranted: [] };
  }

  const unlocked = (allAchievements ?? []).filter((a) => newlyUnlockedIds.includes(a.id as string));
  const xpAwarded = unlocked.reduce((sum, a) => sum + (a.xp_reward as number), 0);
  const coinsAwarded = unlocked.reduce((sum, a) => sum + (a.coins_reward as number), 0);
  const cosmeticIdsGranted = unlocked
    .map((a) => a.cosmetic_reward as string | null)
    .filter((id): id is string => id != null);

  await db
    .from('user_achievements')
    .insert(newlyUnlockedIds.map((id) => ({ user_id: userId, achievement_id: id })));

  if (cosmeticIdsGranted.length > 0) {
    await db.from('user_cosmetics').insert(
      cosmeticIdsGranted.map((cosmeticId) => ({
        user_id: userId,
        cosmetic_id: cosmeticId,
        unlock_source: 'achievement',
      })),
    );
  }

  if (xpAwarded > 0) {
    await db.from('xp_transactions').insert({
      user_id: userId,
      amount: xpAwarded,
      source: 'achievement',
      multiplier: 1.0,
    });
    const { data: current } = await db
      .from('profiles')
      .select('total_xp, lifetime_xp')
      .eq('user_id', userId)
      .single();
    const newTotalXp = (current?.total_xp ?? 0) + xpAwarded;
    const levelProgress = levelFromTotalXp(newTotalXp);
    await db
      .from('profiles')
      .update({
        total_xp: newTotalXp,
        lifetime_xp: (current?.lifetime_xp ?? 0) + xpAwarded, // CDC §23-24 — never reset by prestige
        level: levelProgress.level,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  if (coinsAwarded > 0) {
    const { data: currency } = await db
      .from('user_currency')
      .select('coins')
      .eq('user_id', userId)
      .single();
    await db
      .from('user_currency')
      .update({
        coins: (currency?.coins ?? 0) + coinsAwarded,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  return { newlyUnlockedIds, xpAwarded, coinsAwarded, cosmeticIdsGranted };
}
