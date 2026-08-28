import type { ClassId } from '@winterarc/game-engine';

export interface BootstrapProfileRequest {
  username: string;
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme';
  classId: ClassId | null;
  avatarId: string | null;
  habits: Array<{ name: string; category: string }>;
}

/** Loosely typed — these are raw Postgres rows (profiles/user_currency/streaks/habits), not a hand-maintained shape. Tighten once `supabase gen types typescript` has a project to generate against (TODO.md). */
export interface BootstrapProfileResponse {
  profile: Record<string, unknown>;
  currency: Record<string, unknown>;
  streak: Record<string, unknown>;
  arc: Record<string, unknown>;
  habits: Record<string, unknown>[];
  alreadyBootstrapped: boolean;
}
