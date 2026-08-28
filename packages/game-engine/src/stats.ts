/**
 * The 7 character stats — CDC v2.1 §26.
 *
 * The CDC specifies the 7 stats, their 0-100 range, and two behavioral rules
 * (no decrease on failure, slow decay after 14 days of inactivity) but no
 * formula for turning habit completions into a score. `schema-postgresql.md`
 * notes the stats aren't materialized in a table — they derive from
 * `habits.linked_stats` × `habit_logs` — and flags the computation as an open
 * gap. This is that computation, decided directly (CLAUDE.md §8 category 2:
 * pure engineering choice, no user-visible-spec impact beyond "some curve").
 *
 * Design: each habit log contributes `weight × (completionPct / 100)` raw
 * points to each of its linked stats. Raw points accumulate unboundedly (more
 * history = more points), then get mapped into 0-100 via a saturating curve
 * so early progress feels fast and the last few points feel earned — the same
 * shape problem the XP curve solves differently. `STAT_SATURATION_K` is the
 * tunable constant (CDC's own precedent for `xp.ts`'s curve: "a parameter the
 * backend can retune").
 *
 * Not official game-state the way XP is (CDC §127's anti-cheat boundary is
 * about XP/currency/cosmetics specifically) — stats are a read-only display
 * derived from data the mobile client already legitimately reads via RLS
 * (its own `habits`/`habit_logs`), so this runs client-side too, not just in
 * an Edge Function. If stats ever feed a leaderboard or reward, revisit.
 */

export type StatId =
  | 'strength'
  | 'discipline'
  | 'health'
  | 'knowledge'
  | 'focus'
  | 'energy'
  | 'consistency';

export const STAT_IDS: readonly StatId[] = [
  'strength',
  'discipline',
  'health',
  'knowledge',
  'focus',
  'energy',
  'consistency',
];

export interface LinkedStat {
  stat: StatId;
  weight: number;
}

export interface StatContribution {
  linkedStats: readonly LinkedStat[];
  /** 0-100, same completion percentage `award-habit-xp` computes for XP (CDC §32). */
  completionPct: number;
}

/** Higher = slower to saturate, i.e. more history needed to approach 100. */
const STAT_SATURATION_K = 40;

/** Maps unbounded accumulated raw points to a 0-100 score, asymptotic to 100. */
export function statScoreFromRawPoints(rawPoints: number): number {
  if (rawPoints <= 0) return 0;
  return Math.round(100 * (1 - Math.exp(-rawPoints / STAT_SATURATION_K)));
}

/** Accumulates raw points per stat from a set of habit-log contributions. */
export function calculateStatRawPoints(
  contributions: readonly StatContribution[],
): Record<StatId, number> {
  const totals = Object.fromEntries(STAT_IDS.map((id) => [id, 0])) as Record<StatId, number>;
  for (const contribution of contributions) {
    for (const linked of contribution.linkedStats) {
      totals[linked.stat] += linked.weight * (contribution.completionPct / 100);
    }
  }
  return totals;
}

/** Full pipeline: contributions -> 0-100 score per stat. */
export function calculateStatScores(
  contributions: readonly StatContribution[],
): Record<StatId, number> {
  const raw = calculateStatRawPoints(contributions);
  return Object.fromEntries(STAT_IDS.map((id) => [id, statScoreFromRawPoints(raw[id])])) as Record<
    StatId,
    number
  >;
}

/** Decay-start threshold and rate — CDC §26: "> 14 jours... max -1/jour". */
export const STAT_DECAY_GRACE_DAYS = 14;
export const STAT_DECAY_MAX_PER_DAY = 1;

/**
 * Applies inactivity decay to a single stat value. Stats never drop from a
 * *failed* day (CDC §26) — only from `daysSinceLastContribution` exceeding
 * the grace period, and only down to 0.
 */
export function applyStatDecay(value: number, daysSinceLastContribution: number): number {
  const decayableDays = Math.max(0, daysSinceLastContribution - STAT_DECAY_GRACE_DAYS);
  const decay = decayableDays * STAT_DECAY_MAX_PER_DAY;
  return Math.max(0, Math.round(value - decay));
}
