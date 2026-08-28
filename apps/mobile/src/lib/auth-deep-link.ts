import { ApiRequestError, api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { useAppStore } from '@/stores/app-store';

/**
 * Shared by `app/auth/callback.tsx` — the screen Expo Router lands on when
 * the magic-link email reopens the app at `winterarc://auth/callback?code=...`
 * (CDC §10 / `app/auth.tsx`'s `signInWithOtp` call). File-based routing
 * handles both cold-start and warm-start deep links on its own here, so
 * there's no separate global `Linking` listener to maintain.
 *
 * `winterarc://auth/callback` today is only ever reached from the splash
 * screen's "Sign In" link (`app/index.tsx`) — a *returning* user restoring
 * an existing account on a fresh install/device, not someone mid-onboarding
 * (nothing currently routes onboarding -> /auth). So a successful exchange
 * always calls `bootstrap-profile` with placeholder onboarding fields and
 * jumps straight to the dashboard — bootstrap-profile ignores all of them
 * once a profile already exists (2026-08-28 fix, its own file header) and
 * just returns the real one. If a future session wires onboarding -> /auth
 * mid-flow (reward.tsx's file header floats this as a possibility), this
 * needs to stop assuming "always returning user" and let reward.tsx's own
 * bootstrap-profile call (which has the real onboarding answers) win
 * instead.
 *
 * Still needed from Julien, unchanged from before this pass: the
 * `winterarc://` redirect URL must be registered in the Supabase dashboard's
 * Auth -> URL Configuration -> Redirect URLs, not settable via this
 * session's tools.
 */
export async function completeMagicLinkSignIn(
  code: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return { ok: false, message: error?.message ?? 'Sign-in link is invalid or expired.' };
  }

  try {
    const response = await api.bootstrapProfile({
      username: 'wanderer', // ignored server-side for an existing profile — see file header
      difficulty: 'normal',
      classId: null,
      avatarId: null,
      habits: [],
    });
    useAppStore.getState().initializeFromServer(response, { paletteId: 'frost', difficulty: 'normal' });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof ApiRequestError ? err.message : 'Could not load your profile.',
    };
  }
}
