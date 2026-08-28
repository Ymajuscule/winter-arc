import { mmkv } from '@/lib/mmkv-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client — reads `EXPO_PUBLIC_SUPABASE_URL` /
 * `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Expo's convention: `EXPO_PUBLIC_*` env
 * vars get inlined at build time). Both are unset until Julien links the
 * project and adds them to `.env` — `supabase` is `null` until then, and
 * every call site must handle that (the app runs entirely on the local
 * app-store today, see its file header).
 *
 * `storage` reuses the app's single MMKV instance (lib/mmkv-storage.ts) —
 * without an explicit adapter, supabase-js's `persistSession: true`
 * silently falls back to `localStorage`, which doesn't exist in React
 * Native, so the session would never actually survive an app restart. Real
 * gap found closing out the auth flow (2026-08-28, continuation 6): sign-in
 * "worked" in the sense that `signInWithOtp` returned 200, but nobody would
 * have stayed signed in past killing the app.
 *
 * `flowType: 'pkce'` + `detectSessionInUrl: false` is the standard Supabase
 * React Native pattern — PKCE's magic-link confirmation URL carries a
 * `?code=` query param that `lib/auth-deep-link.ts` exchanges manually via
 * `exchangeCodeForSession`, instead of relying on a browser-only URL-hash
 * auto-detection that doesn't apply here.
 *
 * The try/catch in every method below is not defensive-programming
 * boilerplate — it's load-bearing. `createClient` runs at module scope
 * (this file's `export const supabase = ...`), and `session-store.ts`
 * calls `getSession()` at module scope too (not inside a `useEffect`),
 * so this storage gets touched during Expo Router web's SSR pass, before
 * any component has mounted. `react-native-mmkv` explicitly throws in that
 * context ("Tried to access storage on the server") — confirmed live: it
 * crashed the whole `expo start --web` dev server, not just one screen.
 * Native (Hermes on-device) never hits SSR at all, so this only ever
 * matters for the web dev-server smoke-test path (CLAUDE.md: no shipped
 * web target) — but treating the missing case as "no stored session" is
 * the correct fallback there regardless: nothing to read before hydration.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const mmkvAuthStorage = {
  getItem: (key: string) => {
    try {
      return mmkv.getString(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      mmkv.set(key, value);
    } catch {
      // SSR — nothing to persist to yet, see file header.
    }
  },
  removeItem: (key: string) => {
    try {
      mmkv.delete(key);
    } catch {
      // SSR — nothing to remove, see file header.
    }
  },
};

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: mmkvAuthStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;
