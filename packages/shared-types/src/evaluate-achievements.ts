/** Not a request/response pair — evaluateAndUnlockAchievements is a shared helper, not a route (see its file header). This is the shape it returns, embedded in the responses of the functions that call it. */
export interface AchievementUnlockResult {
  newlyUnlockedIds: string[];
  xpAwarded: number;
  coinsAwarded: number;
  cosmeticIdsGranted: string[];
}
