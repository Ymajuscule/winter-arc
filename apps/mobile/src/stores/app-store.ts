import { zustandMmkvStorage } from '@/lib/mmkv-storage';
import { ApiRequestError, api } from '@/services/api';
import {
  type ClassId,
  type Difficulty,
  STREAK_THRESHOLD_BY_DIFFICULTY,
  type StreakState,
  advanceStreak,
  applyDailyXpCap,
  calculateXpMultiplier,
  classSynergyBonus,
  levelFromTotalXp,
} from '@winterarc/game-engine';
import type { BootstrapProfileResponse } from '@winterarc/shared-types';
import type { PaletteId } from '@winterarc/ui-primitives';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * The local, offline-first mirror of a user's game state (CDC §110).
 *
 * Two modes, tracked by `isCloudSynced`:
 * - **Demo mode** (CDC §13): `initializeFromOnboarding` — no Supabase
 *   session, habit ids are client-generated strings, `completeHabit`
 *   computes everything locally via the same game-engine functions
 *   award-habit-xp uses server-side. Genuinely local-and-final, matching
 *   CDC §13's "3 jours sans compte" local trial.
 * - **Cloud-synced**: `initializeFromServer` (called after `bootstrap-
 *   profile`, 2026-08-28 continuation 4 — Supabase is linked) — habit ids
 *   are real `habits` table UUIDs, `completeHabit` calls the real
 *   `award-habit-xp` and takes the server's numbers as authoritative (CDC
 *   §127: mobile never computes *official* XP). On a network/API failure
 *   it falls back to the same local optimistic calculation demo mode uses,
 *   logs a warning, and leaves the habit marked complete locally — this is
 *   NOT the full CDC §110 sync-queue-with-retry (that needs its own
 *   design: a persisted outbox, replay on reconnect), just enough that one
 *   flaky request doesn't strand the UI mid-tap.
 */

export interface AppHabit {
  id: string;
  name: string;
  category: string;
  xpValue: number;
  period: 'morning' | 'afternoon' | 'evening';
  completedToday: boolean;
}

export interface Profile {
  username: string;
  avatarId: string | null;
  paletteId: PaletteId;
  classId: ClassId | null;
  difficulty: Difficulty;
  title: string | null;
}

/** CDC §134 — the 90-day progression container. Creation-only for now (no pause/complete/vacation actions yet, TODO.md). */
export interface AppArc {
  id: string;
  name: string;
  startsOn: string; // ISO date (yyyy-mm-dd)
  endsOn: string; // ISO date (yyyy-mm-dd)
  difficulty: Difficulty;
  status: 'active' | 'completed' | 'abandoned' | 'vacation';
}

interface XpEvent {
  amount: number;
  trigger: number;
}

interface AppState {
  onboarded: boolean;
  isCloudSynced: boolean;
  profile: Profile;
  arc: AppArc | null;
  totalXp: number;
  lifetimeXp: number;
  coins: number;
  habits: AppHabit[];
  streak: StreakState;
  xpEarnedToday: number;
  lastXpEvent: XpEvent;
  lastLevelUp: number; // level just reached, 0 = none pending
  dailyRewardClaimedOn: string | null;

  initializeFromOnboarding: (input: {
    username: string;
    avatarId: string | null;
    paletteId: PaletteId;
    classId: ClassId | null;
    difficulty: Difficulty;
    habits: Array<{ id: string; name: string; category: string }>;
  }) => void;
  initializeFromServer: (
    response: BootstrapProfileResponse,
    input: { paletteId: PaletteId; difficulty: Difficulty },
  ) => void;
  completeHabit: (habitId: string) => Promise<void>;
  acknowledgeLevelUp: () => void;
  claimDailyReward: () => void;
}

/** CDC §70 — flat daily-login bonus, distinct from per-habit coin gains. */
const DAILY_REWARD_COINS = 20;

const PERIODS: AppHabit['period'][] = ['morning', 'afternoon', 'evening'];

/** CDC §134 — default Arc length, mirrors bootstrap-profile's server-side constant. */
const ARC_LENGTH_DAYS = 90;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDatePlusDays(base: Date, days: number): string {
  return new Date(base.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

const initialProfile: Profile = {
  username: '',
  avatarId: null,
  paletteId: 'frost',
  classId: null,
  difficulty: 'normal',
  title: 'The Awakened', // CDC §13 — first onboarding reward
};

const freshStreak: StreakState = {
  currentCount: 0,
  longestCount: 0,
  lastCompletedOn: null,
  freezeUsedOn: null,
};

/** Local-optimistic path shared by demo mode and the cloud-sync error fallback. */
function computeLocalCompletion(state: AppState, habit: AppHabit) {
  const now = new Date();
  const isWeekend = now.getUTCDay() === 0 || now.getUTCDay() === 6;
  const isEarlyBird = now.getUTCHours() < 9;

  const multiplier = calculateXpMultiplier({
    streakDays: state.streak.currentCount,
    isPerfectDay: false,
    isClassSynergy: state.profile.classId
      ? classSynergyBonus(state.profile.classId, habit.category) > 0
      : false,
    isEarlyBird,
    isWeekend,
    hasXpElixir: false,
    hasXpFeast: false,
    isSeasonEvent: false,
    isComebackStreak: false,
  });

  const rawXp = Math.round(habit.xpValue * multiplier.multiplier);
  const { applied: xpAwarded } = applyDailyXpCap(state.xpEarnedToday, rawXp);

  const newTotalXp = state.totalXp + xpAwarded;
  const previousLevel = levelFromTotalXp(state.totalXp).level;
  const levelProgress = levelFromTotalXp(newTotalXp);

  const threshold = STREAK_THRESHOLD_BY_DIFFICULTY[state.profile.difficulty];
  const activeCount = state.habits.filter((h) => h.id === habit.id || h.completedToday).length;
  const completionPct = Math.round((activeCount / state.habits.length) * 100);

  const streakOutcome = advanceStreak({
    state: state.streak,
    today: todayIso(),
    completionPct,
    requiredThreshold: threshold,
    freezesAllowedThisMonth: 1,
    freezesUsedThisMonth: 0,
    wasActiveSixOfLastSeven: false,
  });

  return { xpAwarded, coinsAwarded: 2, newTotalXp, levelProgress, streakOutcome, previousLevel };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      isCloudSynced: false,
      profile: initialProfile,
      arc: null,
      totalXp: 0,
      lifetimeXp: 0,
      coins: 0,
      habits: [],
      streak: freshStreak,
      xpEarnedToday: 0,
      lastXpEvent: { amount: 0, trigger: 0 },
      lastLevelUp: 0,
      dailyRewardClaimedOn: null,

      initializeFromOnboarding: ({
        username,
        avatarId,
        paletteId,
        classId,
        difficulty,
        habits,
      }) => {
        const startsOn = new Date();
        set({
          onboarded: true,
          isCloudSynced: false,
          profile: { ...initialProfile, username, avatarId, paletteId, classId, difficulty },
          arc: {
            id: 'local-arc',
            name: 'Winter Arc',
            startsOn: todayIso(),
            endsOn: isoDatePlusDays(startsOn, ARC_LENGTH_DAYS),
            difficulty,
            status: 'active',
          },
          habits: habits.map((h, i) => ({
            ...h,
            xpValue: 40, // CDC §18 — simple habit default; per-habit difficulty tiers not modeled in onboarding yet
            period: PERIODS[i % PERIODS.length] ?? 'morning',
            completedToday: false,
          })),
        });
      },

      initializeFromServer: (response, { paletteId, difficulty }) => {
        const profileRow = response.profile as Record<string, unknown>;
        const currencyRow = response.currency as Record<string, unknown>;
        const streakRow = response.streak as Record<string, unknown>;
        const arcRow = response.arc as Record<string, unknown>;

        set({
          onboarded: true,
          isCloudSynced: true,
          profile: {
            username: (profileRow.username as string) ?? '',
            avatarId: (profileRow.avatar_id as string | null) ?? null,
            paletteId,
            classId: (profileRow.current_class_id as ClassId | null) ?? null,
            difficulty,
            title: 'The Awakened',
          },
          arc: {
            id: arcRow.id as string,
            name: arcRow.name as string,
            startsOn: arcRow.starts_on as string,
            endsOn: arcRow.ends_on as string,
            difficulty: (arcRow.difficulty as Difficulty) ?? difficulty,
            status: (arcRow.status as AppArc['status']) ?? 'active',
          },
          totalXp: (profileRow.total_xp as number) ?? 0,
          lifetimeXp: (profileRow.lifetime_xp as number) ?? 0,
          coins: (currencyRow.coins as number) ?? 0,
          streak: {
            currentCount: (streakRow.current_count as number) ?? 0,
            longestCount: (streakRow.longest_count as number) ?? 0,
            lastCompletedOn: (streakRow.last_completed_on as string | null) ?? null,
            freezeUsedOn: (streakRow.freeze_used_on as string | null) ?? null,
          },
          habits: response.habits.map((h, i) => {
            const row = h as Record<string, unknown>;
            return {
              id: row.id as string,
              name: row.name as string,
              category: row.category as string,
              xpValue: (row.xp_value as number) ?? 40,
              period: PERIODS[i % PERIODS.length] ?? 'morning',
              completedToday: false,
            };
          }),
        });
      },

      completeHabit: async (habitId) => {
        const state = get();
        const habit = state.habits.find((h) => h.id === habitId);
        if (!habit || habit.completedToday) return;

        if (state.isCloudSynced) {
          try {
            const response = await api.awardHabitXp({ habitId, loggedFor: todayIso() });
            const current = get();
            set({
              habits: current.habits.map((h) =>
                h.id === habitId ? { ...h, completedToday: true } : h,
              ),
              totalXp: response.level.totalXp,
              lifetimeXp: current.lifetimeXp + response.xpAwarded,
              coins: current.coins + response.coinsAwarded,
              xpEarnedToday: current.xpEarnedToday + response.xpAwarded,
              streak: response.streak.state,
              lastXpEvent: { amount: response.xpAwarded, trigger: current.lastXpEvent.trigger + 1 },
              lastLevelUp:
                response.level.level > levelFromTotalXp(current.totalXp).level
                  ? response.level.level
                  : current.lastLevelUp,
            });
            return;
          } catch (err) {
            // Falls through to the local path below — see file header on why
            // this isn't a full retry queue yet.
            console.warn(
              '[app-store] award-habit-xp failed, applying local-optimistic fallback:',
              err instanceof ApiRequestError ? err.message : err,
            );
          }
        }

        const { xpAwarded, coinsAwarded, newTotalXp, levelProgress, streakOutcome, previousLevel } =
          computeLocalCompletion(state, habit);

        set({
          habits: state.habits.map((h) => (h.id === habitId ? { ...h, completedToday: true } : h)),
          totalXp: newTotalXp,
          lifetimeXp: state.lifetimeXp + xpAwarded,
          coins: state.coins + coinsAwarded,
          xpEarnedToday: state.xpEarnedToday + xpAwarded,
          streak: streakOutcome.state,
          lastXpEvent: { amount: xpAwarded, trigger: state.lastXpEvent.trigger + 1 },
          lastLevelUp:
            levelProgress.level > previousLevel ? levelProgress.level : state.lastLevelUp,
        });
      },

      acknowledgeLevelUp: () => set({ lastLevelUp: 0 }),

      claimDailyReward: () => {
        const state = get();
        const today = todayIso();
        if (state.dailyRewardClaimedOn === today) return;
        set({ coins: state.coins + DAILY_REWARD_COINS, dailyRewardClaimedOn: today });
      },
    }),
    {
      name: 'winter-arc-app',
      storage: createJSONStorage(() => zustandMmkvStorage),
    },
  ),
);
