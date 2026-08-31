import { ApiRequestError, api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { useAppStore } from '@/stores/app-store';
import { useOnboardingStore } from '@/stores/onboarding-store';

/**
 * The step every sign-in method shares: a Supabase session now exists, and
 * the app has to decide where the user lands.
 *
 * Until 2026-08-31 this assumed everyone reaching it was a *returning* user
 * (its own header said so, and flagged the assumption as something a future
 * session would have to remove). That held while only the splash's "Sign In"
 * reached it. It stopped holding the moment registration existed: a brand
 * new account has no profile, so calling `bootstrap-profile` immediately
 * created one named "wanderer" with no class, no avatar and no habits, and
 * dropped the user on an empty dashboard with onboarding permanently skipped.
 *
 * So: probe first, then route. `profiles` is read directly rather than
 * through an Edge Function — it has an `auth.uid() = user_id` select policy,
 * and the supabase-ops rule is that reads go direct while writes cross the
 * anti-cheat boundary (CDC §127). Probing via `bootstrap-profile` isn't an
 * option anyway: that function *creates* the row it would be reporting on.
 */

export type SignInDestination = '/dashboard' | '/onboarding/manifesto';

export type AuthFlowResult =
  | { ok: true; destination: SignInDestination }
  | { ok: false; message: string };

/** Does this account already have a profile row, i.e. has it finished onboarding before? */
export async function hasExistingProfile(): Promise<boolean> {
  if (!supabase) return false;
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return false;

  const { data } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data != null;
}

/**
 * Loads a returning user's real account into app-store. Only ever called
 * once `hasExistingProfile()` has said there is one — `bootstrap-profile`
 * ignores the onboarding-shaped fields below when a profile already exists
 * (that function's own header), which is why they can be placeholders here
 * and must never be relied on to create anything.
 */
async function loadExistingProfile(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await api.bootstrapProfile({
      username: 'wanderer', // ignored server-side for an existing profile
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
 * Where to send someone who just authenticated, by any method.
 *
 * A new account goes through onboarding rather than straight to the
 * dashboard: `onboarding/reward.tsx` is what calls `bootstrap-profile` with
 * the real username/class/avatar/habits, so skipping it is what produced the
 * junk "wanderer" profile described above. The onboarding store is reset
 * first so a half-finished run from a previous account can't bleed into the
 * new one.
 */
export async function resolvePostSignIn(): Promise<AuthFlowResult> {
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  let existing: boolean;
  try {
    existing = await hasExistingProfile();
  } catch {
    return { ok: false, message: 'Could not reach your account. Check your connection.' };
  }

  if (!existing) {
    useOnboardingStore.getState().reset();
    return { ok: true, destination: '/onboarding/manifesto' };
  }

  const loaded = await loadExistingProfile();
  if (!loaded.ok) return loaded;
  return { ok: true, destination: '/dashboard' };
}

/**
 * Exchanges a PKCE `code` for a session — the shared last step for the
 * magic-link email and the Google OAuth browser session, which both land on
 * `app/auth/callback.tsx` carrying the same kind of `?code=` param.
 */
export async function completeCodeSignIn(code: string): Promise<AuthFlowResult> {
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    return { ok: false, message: error?.message ?? 'Sign-in link is invalid or expired.' };
  }
  return resolvePostSignIn();
}

/**
 * Ends the session and drops every trace of the account from local state.
 *
 * Both stores have to go, not just the session: `app-store` is persisted to
 * MMKV, so leaving it would show the previous user's level, habits and
 * streak to whoever signs in next on the same device — and `onboarding-store`
 * would make a fresh account look half-onboarded.
 */
export async function signOutCompletely(): Promise<{ ok: true } | { ok: false; message: string }> {
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    // A failed sign-out is still worth clearing locally — the token is
    // already unusable to this device once the local copy is gone — but the
    // caller should know the server-side revoke didn't land.
    if (error) {
      useAppStore.getState().resetAccount();
      useOnboardingStore.getState().reset();
      return { ok: false, message: error.message };
    }
  }
  useAppStore.getState().resetAccount();
  useOnboardingStore.getState().reset();
  return { ok: true };
}
