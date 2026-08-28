// @ts-nocheck -- Deno Edge Function (npm:/Deno.serve), not resolved by the repo's Node/tsc typecheck.
/**
 * open-chest — CDC §74, docs/api-specifications.md.
 *
 * Rolls rarities via game-engine/chests.ts (rollChestRarities), then for
 * each rolled rarity picks a random cosmetic of that rarity from the
 * catalog. Anti-duplicate rule (CDC §74): if the user already owns the
 * rolled cosmetic, convert it to Fragments (user_currency.fragments, CDC
 * §76) instead of granting a second copy.
 *
 * Known gap: if a rarity's cosmetic pool is empty in the catalog (e.g. no
 * seeded Mythic items yet), that roll is silently skipped rather than
 * erroring the whole chest open — logged in the response as a shorter
 * `items` array than the roll count, not hidden. Once the catalog has full
 * rarity coverage this never triggers.
 */
import {
  FRAGMENT_VALUE_BY_RARITY,
  type Rarity,
  rollChestRarities,
} from '../../../packages/game-engine/src/chests.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { withIdempotency } from '../_shared/idempotency.ts';
import { getUserFromRequest, supabaseAdmin } from '../_shared/supabase-admin.ts';

interface OpenChestBody {
  chestId: string;
}

interface RolledItem {
  cosmeticId: string;
  isDuplicate: boolean;
  fragmentsAwarded?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const user = await getUserFromRequest(req);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

  const body = (await req.json()) as OpenChestBody;
  if (!body.chestId) return jsonResponse({ error: 'chestId is required' }, 400);

  return withIdempotency(req, user.id, 'open-chest', async () => {
    const db = supabaseAdmin();

    const { data: chest, error: chestError } = await db
      .from('chests')
      .select('*')
      .eq('id', body.chestId)
      .eq('user_id', user.id)
      .single();
    if (chestError || !chest) return { status: 404, body: { error: 'Chest not found' } };
    if (chest.is_opened) return { status: 409, body: { error: 'Chest already opened' } };

    const { data: ownedRows } = await db
      .from('user_cosmetics')
      .select('cosmetic_id')
      .eq('user_id', user.id);
    const owned = new Set((ownedRows ?? []).map((r) => r.cosmetic_id as string));

    const { data: currency } = await db
      .from('user_currency')
      .select('fragments')
      .eq('user_id', user.id)
      .single();
    const fragments = { ...(currency?.fragments ?? {}) } as Record<string, number>;

    const rarities = rollChestRarities(chest.type as Parameters<typeof rollChestRarities>[0]);
    const items: RolledItem[] = [];
    const newlyOwnedCosmeticIds: string[] = [];

    for (const rarity of rarities) {
      const { data: candidates } = await db
        .from('cosmetics')
        .select('id')
        .eq('rarity', rarity)
        .limit(50);
      if (!candidates || candidates.length === 0) continue; // see file header gap note

      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      const cosmeticId = picked.id as string;
      const isDuplicate = owned.has(cosmeticId) || newlyOwnedCosmeticIds.includes(cosmeticId);

      if (isDuplicate) {
        const fragmentsAwarded = FRAGMENT_VALUE_BY_RARITY[rarity as Rarity];
        fragments[rarity] = (fragments[rarity] ?? 0) + fragmentsAwarded;
        items.push({ cosmeticId, isDuplicate: true, fragmentsAwarded });
      } else {
        newlyOwnedCosmeticIds.push(cosmeticId);
        items.push({ cosmeticId, isDuplicate: false });
      }
    }

    if (newlyOwnedCosmeticIds.length > 0) {
      await db.from('user_cosmetics').insert(
        newlyOwnedCosmeticIds.map((cosmeticId) => ({
          user_id: user.id,
          cosmetic_id: cosmeticId,
          unlock_source: 'chest',
        })),
      );
    }

    await db
      .from('user_currency')
      .update({ fragments, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    await db
      .from('chests')
      .update({ is_opened: true, contents: items, opened_at: new Date().toISOString() })
      .eq('id', chest.id);

    return { status: 200, body: { items } };
  });
});
