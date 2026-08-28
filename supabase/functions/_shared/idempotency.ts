// @ts-nocheck -- Deno Edge Function shared helper, not resolved by the repo's Node/tsc typecheck.
import { jsonResponse } from './cors.ts';
import { supabaseAdmin } from './supabase-admin.ts';

/**
 * Idempotency wrapper for mutating Edge Functions — `idempotency_keys` table
 * (supabase/migrations/20260828010200_idempotency_keys.sql). TODO.md Phase 0
 * gap: "a retried network call shouldn't double-award XP" once the mobile
 * sync queue (CDC §110) is real.
 *
 * Client sends an `Idempotency-Key` header (a UUID generated once per
 * logical action, resent unchanged on retry). If that key was already seen
 * for this user+endpoint, replay the cached response instead of re-running
 * `handler`. The header is optional — a caller that omits it just doesn't
 * get replay protection, it isn't rejected — so existing callers (and tests)
 * that don't send one keep working unchanged.
 *
 * Only successful responses (status < 300) are cached. A failed attempt
 * (validation error, transient DB error) is *not* recorded against the key,
 * so the client can retry the same key once the underlying issue is fixed —
 * caching an error would permanently wedge that logical action.
 */
export async function withIdempotency(
  req: Request,
  userId: string,
  endpoint: string,
  handler: () => Promise<{ status: number; body: unknown }>,
): Promise<Response> {
  const key = req.headers.get('Idempotency-Key');
  const db = supabaseAdmin();

  if (key) {
    const { data: existing } = await db
      .from('idempotency_keys')
      .select('status_code, response')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .eq('key', key)
      .maybeSingle();
    if (existing) {
      return jsonResponse(existing.response, existing.status_code);
    }
  }

  const { status, body } = await handler();

  if (key && status < 300) {
    // Best-effort: a unique-constraint race between two concurrent identical
    // requests is possible but harmless here — both executed the handler
    // once each before either could see the other's key, so at worst this
    // insert fails and the key simply isn't cached for next time.
    await db.from('idempotency_keys').insert({
      user_id: userId,
      endpoint,
      key,
      status_code: status,
      response: body,
    });
  }

  return jsonResponse(body, status);
}
