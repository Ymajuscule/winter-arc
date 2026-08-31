import { ApiRequestError, api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { useAppStore } from '@/stores/app-store';

/**
 * Shared by every sign-in method `app/auth.tsx` offers (password, Google,
 * magic link) — once a Supabase session exists by whatever means, getting
 * into the app is identical: fetch the real account via `bootstrap-profile`
 * (ignores its onboarding-shaped placeholder fields once a profile already
 * exists, 2026-08-28 fix, that function's own file header) and populate
 * app-store from the response.
 *
 * `winterarc://auth/callback` today is only ever reached by a *returning*
 * user (splash "Sign In", or the Google/magic-link buttons on `auth.tsx` —
 * nothing routes onboarding -> /auth mid-flow). If a future session wires
 * that up, this needs to stop assuming "always returning user".
 */
export async function bootstrapAndEnterDashboard(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  try {
    const response = await api.bootstrapProfile({
      username: 'wanderer', // ignored server-side for an existing profile — see file header
      difficulty: 'normal',
      classId: null,
      avatarId: null,
      habits: [],
    });
    useAppStore
      .getState()
      .initializeFromServer(response, { paletteId: 'frost', difficulty: 'normal' });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof ApiRequestError ? err.message : 'Could not load your profile.',
    };
  }
}

/**
 * Exchanges a PKCE `code` for a session — the shared last step for both the
 * magic-link email and the Google OAuth browser session, which both land on
 * `app/auth/callback.tsx` carrying the same kind of `?code=` param.
 */
export async function completeCodeSignIn(
  code: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return { ok: false, message: error?.message ?? 'Sign-in link is invalid or expired.' };
  }
  return bootstrapAndEnterDashboard();
}
