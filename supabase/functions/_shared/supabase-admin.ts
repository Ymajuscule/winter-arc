// deno-lint-ignore-file no-explicit-any
// @ts-nocheck -- Deno-only module (npm: specifier, Deno.env), not resolved by the repo's Node/tsc typecheck.
import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * Admin client — service role key, bypasses RLS. Every write to a
 * game-state table (CDC §127) goes through a client built with this.
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the mobile app.
 */
function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function supabaseAdmin() {
  return createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Resolves the calling user from the request's Authorization bearer JWT. */
export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const jwt = authHeader.replace('Bearer ', '');
  const client = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_ANON_KEY'));
  const { data, error } = await client.auth.getUser(jwt);
  if (error || !data.user) return null;
  return data.user;
}
