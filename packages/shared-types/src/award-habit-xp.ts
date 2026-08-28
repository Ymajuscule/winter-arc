import type { AdvanceStreakOutcome, LevelProgress } from '@winterarc/game-engine';
import type { AchievementUnlockResult } from './evaluate-achievements.js';

export interface AwardHabitXpRequest {
  habitId: string;
  loggedFor: string; // "YYYY-MM-DD"
  value?: number;
}

export interface AwardHabitXpResponse {
  xpAwarded: number;
  completionPct: number;
  multiplier: number;
  dailyXpCap: number;
  level: LevelProgress;
  streak: AdvanceStreakOutcome;
  achievements: AchievementUnlockResult;
}
