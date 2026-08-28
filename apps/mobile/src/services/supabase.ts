import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client — reads `EXPO_PUBLIC_SUPABASE_URL` /
 * `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Expo's convention: `EXPO_PUBLIC_*` env
 * vars get inlined at build time). Both are unset until Julien links the
 * project and adds them to `.env` — `supabase` is `null` until then, and
 * every call site must handle that (the app runs entirely on the local
 * app-store today, see its file header).
 *
 * Once linked: this is also where an Edge Function client wrapper
 * (`services/api.ts`, calling award-habit-xp/claim-quest/etc. with an
 * `Authorization: Bearer` from this client's session and an
 * `Idempotency-Key`) belongs — not written yet, waiting on
 * `packages/shared-types` (TODO.md) so the request/response shapes aren't
 * hand-typed twice.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;
