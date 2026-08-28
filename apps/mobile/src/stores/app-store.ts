import { zustandMmkvStorage } from '@/lib/mmkv-storage';
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
import type { PaletteId } from '@winterarc/ui-primitives';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * The local, offline-first mirror of a user's game state (CDC §110).
 * Supabase isn't linked yet (Julien wires the connector separately), so
 * there's no Edge Function to reconcile against — every write here is
 * genuinely optimistic-and-final for now, not "optimistic pending server
 * confirmation." When `services/api.ts` gets a real Supabase client, the
 * shape of `completeHabit` below is exactly what should become "compute
 * optimistically, call award-habit-xp, reconcile with its response" per
 * CDC §127 / the rpg-mechanics skill — the game-engine calls don't change,
 * only who has the last word.
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

interface XpEvent {
  amount: number;
  trigger: number;
}

interface AppState {
  onboarded: boolean;
  profile: Profile;
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
  completeHabit: (habitId: string) => void;
  acknowledgeLevelUp: () => void;
  claimDailyReward: () => void;
}

/** CDC §70 — flat daily-login bonus, distinct from per-habit coin gains. */
const DAILY_REWARD_COINS = 20;

const PERIODS: AppHabit['period'][] = ['morning', 'afternoon', 'evening'];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      profile: initialProfile,
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
        set({
          onboarded: true,
          profile: { ...initialProfile, username, avatarId, paletteId, classId, difficulty },
          habits: habits.map((h, i) => ({
            ...h,
            xpValue: 40, // CDC §18 — simple habit default; per-habit difficulty tiers not modeled in onboarding yet
            period: PERIODS[i % PERIODS.length] ?? 'morning',
            completedToday: false,
          })),
        });
      },

      completeHabit: (habitId) => {
        const state = get();
        const habit = state.habits.find((h) => h.id === habitId);
        if (!habit || habit.completedToday) return;

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
        const activeCount = state.habits.filter((h) => h.id === habitId || h.completedToday).length;
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

        set({
          habits: state.habits.map((h) => (h.id === habitId ? { ...h, completedToday: true } : h)),
          totalXp: newTotalXp,
          lifetimeXp: state.lifetimeXp + xpAwarded,
          coins: state.coins + 2, // CDC §70 — simple habit completion
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
