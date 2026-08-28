import type { LevelProgress } from '@winterarc/game-engine';
import type { AchievementUnlockResult } from './evaluate-achievements.js';

export interface ClaimQuestRequest {
  userQuestId: string;
}

export interface ClaimQuestResponse {
  xpAwarded: number;
  coinsAwarded: number;
  cosmeticAwarded: string | null;
  level: LevelProgress;
  achievements: AchievementUnlockResult;
}

/** 409 body shape when progress < 100 — distinct from the plain `{ error }` most functions return. */
export interface ClaimQuestIncompleteError {
  error: string;
  progress: number;
}
