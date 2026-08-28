import { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

/**
 * Offline-first local store (CDC §110) — a single MMKV instance backs every
 * Zustand store in the app via `zustandMmkvStorage`. Optimistic local writes
 * happen here immediately; the Edge Function response (once Supabase is
 * linked) reconciles it, never the other way around for anything CDC §127
 * covers (XP/level/currency/cosmetics).
 */
export const mmkv = new MMKV({ id: 'winter-arc' });

export const zustandMmkvStorage: StateStorage = {
  setItem: (name, value) => mmkv.set(name, value),
  getItem: (name) => mmkv.getString(name) ?? null,
  removeItem: (name) => mmkv.delete(name),
};
