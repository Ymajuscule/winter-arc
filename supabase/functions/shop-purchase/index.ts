// @ts-nocheck -- Deno Edge Function (npm:/Deno.serve), not resolved by the repo's Node/tsc typecheck.
/**
 * shop-purchase — CDC §72-73.
 *
 * api-specifications.md describes this function only at the level of
 * "débite coins/embers, crédite user_cosmetics ou l'item permanent acheté"
 * — no request/response shape was pinned down, unlike claim-quest or
 * open-chest. Scoped here to the fully-modeled case: buying a `cosmetics`
 * row with Coins or Embers (CDC §72's "Permanent Store" — Recovery Day,
 * extra habit slot, Skill Point respec, loadout slots — has no backing
 * table/column anywhere in the schema yet, so there's nothing for a
 * purchase of one of those to credit; implementing that would mean
 * inventing schema, not writing the function the schema already supports).
 * Extending this to non-cosmetic purchases needs those columns/tables
 * first — a DECISION-NEEDED on where they live (a counter on `profiles`?
 * a generic `permanent_purchases` table?), not a default to guess here.
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { withIdempotency } from '../_shared/idempotency.ts';
import { getUserFromRequest, supabaseAdmin } from '../_shared/supabase-admin.ts';

interface ShopPurchaseBody {
  cosmeticId: string;
  currency: 'coins' | 'embers';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const user = await getUserFromRequest(req);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

  const body = (await req.json()) as ShopPurchaseBody;
  if (!body.cosmeticId || (body.currency !== 'coins' && body.currency !== 'embers')) {
    return jsonResponse(
      { error: 'cosmeticId and currency ("coins" | "embers") are required' },
      400,
    );
  }

  return withIdempotency(req, user.id, 'shop-purchase', async () => {
    const db = supabaseAdmin();

    const { data: cosmetic, error: cosmeticError } = await db
      .from('cosmetics')
      .select('id, is_purchasable, coin_price, ember_price')
      .eq('id', body.cosmeticId)
      .single();
    if (cosmeticError || !cosmetic) return { status: 404, body: { error: 'Cosmetic not found' } };
    if (!cosmetic.is_purchasable) {
      return { status: 400, body: { error: 'This cosmetic is not purchasable in the shop' } };
    }

    const price = body.currency === 'coins' ? cosmetic.coin_price : cosmetic.ember_price;
    if (price == null) {
      return { status: 400, body: { error: `This cosmetic has no ${body.currency} price` } };
    }

    const { data: existing } = await db
      .from('user_cosmetics')
      .select('cosmetic_id')
      .eq('user_id', user.id)
      .eq('cosmetic_id', body.cosmeticId)
      .maybeSingle();
    if (existing) return { status: 409, body: { error: 'Already owned' } };

    const { data: userCurrency } = await db
      .from('user_currency')
      .select('coins, embers')
      .eq('user_id', user.id)
      .single();
    if (!userCurrency) return { status: 404, body: { error: 'Currency wallet not found' } };

    const balance = body.currency === 'coins' ? userCurrency.coins : userCurrency.embers;
    if (balance < price) {
      return { status: 409, body: { error: 'Insufficient balance', balance, price } };
    }

    const remainingBalance = balance - price;
    await db
      .from('user_currency')
      .update({
        [body.currency]: remainingBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    await db.from('user_cosmetics').insert({
      user_id: user.id,
      cosmetic_id: body.cosmeticId,
      unlock_source: 'shop',
    });

    return {
      status: 200,
      body: {
        cosmeticId: body.cosmeticId,
        currencySpent: body.currency,
        amountSpent: price,
        remainingBalance,
      },
    };
  });
});
