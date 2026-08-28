export type ApplyPrestigeRequest = Record<string, never>; // no payload — acts on the authenticated user

export interface ApplyPrestigeResponse {
  prestigeRank: number;
  lifetimeXp: number;
  isLegend: boolean;
}
