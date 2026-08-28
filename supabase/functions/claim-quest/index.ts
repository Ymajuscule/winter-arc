// @ts-nocheck -- Deno Edge Function (npm:/Deno.serve), not resolved by the repo's Node/tsc typecheck.
/**
 * claim-quest — CDC §33-36, docs/api-specifications.md.
 *
 * Recomputes progress server-side before paying out (never trusts a client
 * claim that the quest is done) via `_shared/quest-progress.ts`, then grants
 * xp_reward/coins_reward/cosmetic_reward the same way award-habit-xp grants
 * a habit's — separate xp_transactions row, profile total_xp/level update,
 * user_currency update, user_cosmetics insert if there's a reward.
 *
 * Known gap: `class` quest type (CDC §30) has no dedicated
 * `xp_transactions.source` value in the schema's check constraint — mapped
 * to `weekly_quest` since class quests are weekly-cadence per the CDC. If a
 * dedicated bucket is ever wanted, that's a migration, not a code fix here.
 */
import { levelFromTotalXp } from '../../../packages/game-engine/src/xp.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { evaluateAndUnlockAchievements } from '../_shared/evaluate-achievements.ts';
import { withIdempotency } from '../_shared/idempotency.ts';
import { computeQuestProgress } from '../_shared/quest-progress.ts';
import { getUserFromRequest, supabaseAdmin } from '../_shared/supabase-admin.ts';

interface ClaimQuestBody {
  userQuestId: string;
}

function xpSourceForQuestType(type: string): string {
  switch (type) {
    case 'daily':
      return 'daily_quest';
    case 'weekly':
      return 'weekly_quest';
    case 'monthly':
      return 'monthly_quest';
    case 'boss':
      return 'boss';
    case 'arc_boss':
      return 'arc_boss';
    case 'class':
      return 'weekly_quest'; // see file header
    default:
      throw new Error(`Unknown quest type: ${type}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const user = await getUserFromRequest(req);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

  const body = (await req.json()) as ClaimQuestBody;
  if (!body.userQuestId) return jsonResponse({ error: 'userQuestId is required' }, 400);

  return withIdempotency(req, user.id, 'claim-quest', async () => {
    const db = supabaseAdmin();

    const { data: userQuest, error: questError } = await db
      .from('user_quests')
      .select('*, quest_definitions(*)')
      .eq('id', body.userQuestId)
      .eq('user_id', user.id)
      .single();
    if (questError || !userQuest) return { status: 404, body: { error: 'Quest not found' } };
    if (userQuest.status === 'claimed') {
      return { status: 409, body: { error: 'Already claimed' } };
    }

    const definition = userQuest.quest_definitions as {
      id: string;
      type: string;
      condition: Parameters<typeof computeQuestProgress>[3];
      xp_reward: number;
      coins_reward: number;
      cosmetic_reward: string | null;
    } | null;
    if (!definition) return { status: 404, body: { error: 'Quest definition not found' } };

    const progress = await computeQuestProgress(
      user.id,
      userQuest.period_start,
      userQuest.period_end,
      definition.condition,
    );

    if (progress < 100) {
      await db.from('user_quests').update({ progress, status: 'active' }).eq('id', userQuest.id);
      return { status: 409, body: { error: 'Quest not complete', progress } };
    }

    const { data: profile } = await db
      .from('profiles')
      .select('total_xp, lifetime_xp')
      .eq('user_id', user.id)
      .single();
    if (!profile) return { status: 404, body: { error: 'Profile not found' } };

    const xpAwarded = definition.xp_reward;
    const coinsAwarded = definition.coins_reward;
    const cosmeticAwarded = definition.cosmetic_reward;

    if (xpAwarded > 0) {
      await db.from('xp_transactions').insert({
        user_id: user.id,
        amount: xpAwarded,
        source: xpSourceForQuestType(definition.type),
        source_id: definition.id,
        multiplier: 1.0,
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

    if (cosmeticAwarded) {
      await db.from('user_cosmetics').insert({
        user_id: user.id,
        cosmetic_id: cosmeticAwarded,
        unlock_source: 'quest',
      });
    }

    await db
      .from('user_quests')
      .update({
        status: 'claimed',
        progress: 100,
        completed_at: new Date().toISOString(),
        claimed_at: new Date().toISOString(),
      })
      .eq('id', userQuest.id);

    const achievements = await evaluateAndUnlockAchievements(user.id);

    return {
      status: 200,
      body: { xpAwarded, coinsAwarded, cosmeticAwarded, level: levelProgress, achievements },
    };
  });
});
