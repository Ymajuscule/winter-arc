// @ts-nocheck -- Deno Edge Function (npm:/Deno.serve), not resolved by the repo's Node/tsc typecheck.
/**
 * apply-prestige — CDC §23-24, docs/api-specifications.md.
 *
 * Resets level to 1, keeps lifetime_xp (see
 * supabase/migrations/20260828010300_profile_lifetime_xp.sql — that
 * migration exists specifically so this function has something correct to
 * reset: total_xp is "since last prestige" and drives leveling, lifetime_xp
 * never resets), increments prestige_rank, logs to audit_logs (CDC §128,
 * sensitive action).
 *
 * Known gap, not guessed at: CDC §23 says each Prestige also comes with "un
 * choix de bonus permanent au moment du Prestige" (a *choice* the user
 * makes — habit slot bonus, exclusive aura, etc.) and CDC §51 ties specific
 * Prestige-rank frames to prestige. Neither is modeled yet: there's no
 * seeded catalog of prestige-rank cosmetics/bonus options to grant
 * automatically, and a user *choice* can't happen inside a single POST
 * with no payload for it. This function does the mechanically-unambiguous
 * part (rank/level/lifetime-xp/audit) and stops there — granting the
 * choice-based reward is a follow-up once that catalog exists.
 */
import {
  applyPrestige,
  canPrestige,
  isLegend,
} from '../../../packages/game-engine/src/prestige.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { withIdempotency } from '../_shared/idempotency.ts';
import { getUserFromRequest, supabaseAdmin } from '../_shared/supabase-admin.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const user = await getUserFromRequest(req);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

  return withIdempotency(req, user.id, 'apply-prestige', async () => {
    const db = supabaseAdmin();

    const { data: profile } = await db
      .from('profiles')
      .select('level, prestige_rank, lifetime_xp')
      .eq('user_id', user.id)
      .single();
    if (!profile) return { status: 404, body: { error: 'Profile not found' } };

    if (!canPrestige({ level: profile.level, prestigeRank: profile.prestige_rank })) {
      return { status: 409, body: { error: 'Not eligible to prestige' } };
    }

    const result = applyPrestige({
      level: profile.level,
      prestigeRank: profile.prestige_rank,
      lifetimeXp: profile.lifetime_xp,
    });

    await db
      .from('profiles')
      .update({
        level: result.level, // 1
        prestige_rank: result.prestigeRank,
        total_xp: 0, // the leveling counter resets; lifetime_xp is untouched by design
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    await db.from('audit_logs').insert({
      user_id: user.id,
      action: 'prestige',
      metadata: {
        fromRank: profile.prestige_rank,
        toRank: result.prestigeRank,
        lifetimeXp: result.lifetimeXp,
      },
    });

    return {
      status: 200,
      body: {
        prestigeRank: result.prestigeRank,
        lifetimeXp: result.lifetimeXp,
        isLegend: isLegend(result.prestigeRank),
      },
    };
  });
});
