import { supabase } from '@/services/supabase';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

/**
 * Thin Zustand mirror of Supabase Auth's session state — components read
 * this instead of calling `supabase.auth.getSession()` themselves.
 * `initializing` stays true until the first `getSession()` resolves, so a
 * cold app launch doesn't flash "signed out" before Supabase has had a
 * chance to restore a persisted session.
 */
interface SessionState {
  session: Session | null;
  initializing: boolean;
  setSession: (session: Session | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  initializing: supabase !== null, // no client at all -> nothing to wait for
  setSession: (session) => set({ session, initializing: false }),
}));

let listenerStarted = false;

/** Call once, from the root layout. No-op if Supabase isn't configured or already started. */
export function initSessionListener() {
  if (listenerStarted || !supabase) return;
  listenerStarted = true;

  supabase.auth.getSession().then(({ data }) => {
    useSessionStore.getState().setSession(data.session);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    useSessionStore.getState().setSession(session);
  });
}
