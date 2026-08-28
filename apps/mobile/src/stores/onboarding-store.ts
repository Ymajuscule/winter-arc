import { zustandMmkvStorage } from '@/lib/mmkv-storage';
import type { ClassId } from '@winterarc/game-engine';
import type { PaletteId } from '@winterarc/ui-primitives';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'extreme';

export interface HabitDraft {
  id: string;
  name: string;
  category: string;
  included: boolean;
}

interface OnboardingState {
  avatarId: string | null;
  paletteId: PaletteId;
  firstName: string;
  username: string;
  domainIds: string[];
  goalIdsByDomain: Record<string, string[]>;
  habits: HabitDraft[];
  difficulty: Difficulty;
  classId: ClassId | null;
  notificationsResolved: boolean;
  completedAt: string | null;

  setAvatar: (id: string) => void;
  setPalette: (id: PaletteId) => void;
  setIdentity: (firstName: string, username: string) => void;
  toggleDomain: (id: string) => void;
  toggleGoal: (domainId: string, goalId: string) => void;
  setHabits: (habits: HabitDraft[]) => void;
  toggleHabit: (id: string) => void;
  addCustomHabit: (name: string, category: string) => void;
  setDifficulty: (d: Difficulty) => void;
  setClass: (id: ClassId) => void;
  setNotificationsResolved: () => void;
  complete: () => void;
  reset: () => void;
}

const initialState = {
  avatarId: null as string | null,
  paletteId: 'frost' as PaletteId,
  firstName: '',
  username: '',
  domainIds: [] as string[],
  goalIdsByDomain: {} as Record<string, string[]>,
  habits: [] as HabitDraft[],
  difficulty: 'normal' as Difficulty,
  classId: null as ClassId | null,
  notificationsResolved: false,
  completedAt: null as string | null,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,

      setAvatar: (id) => set({ avatarId: id }),
      setPalette: (id) => set({ paletteId: id }),
      setIdentity: (firstName, username) => set({ firstName, username }),
      toggleDomain: (id) =>
        set((state) => ({
          domainIds: state.domainIds.includes(id)
            ? state.domainIds.filter((d) => d !== id)
            : [...state.domainIds, id],
        })),
      toggleGoal: (domainId, goalId) =>
        set((state) => {
          const current = state.goalIdsByDomain[domainId] ?? [];
          const next = current.includes(goalId)
            ? current.filter((g) => g !== goalId)
            : [...current, goalId];
          return { goalIdsByDomain: { ...state.goalIdsByDomain, [domainId]: next } };
        }),
      setHabits: (habits) => set({ habits }),
      toggleHabit: (id) =>
        set((state) => ({
          habits: state.habits.map((h) => (h.id === id ? { ...h, included: !h.included } : h)),
        })),
      addCustomHabit: (name, category) =>
        set((state) => ({
          habits: [...state.habits, { id: `custom-${Date.now()}`, name, category, included: true }],
        })),
      setDifficulty: (difficulty) => set({ difficulty }),
      setClass: (classId) => set({ classId }),
      setNotificationsResolved: () => set({ notificationsResolved: true }),
      complete: () => set({ completedAt: new Date().toISOString() }),
      reset: () => set(initialState),
    }),
    {
      name: 'winter-arc-onboarding',
      storage: createJSONStorage(() => zustandMmkvStorage),
    },
  ),
);
