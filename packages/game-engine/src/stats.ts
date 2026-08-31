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

// ---------------------------------------------------------------------------
// Category -> stat mapping
// ---------------------------------------------------------------------------

/**
 * Which stats a habit feeds, derived from its category — CDC §26's
 * "Alimentée par" column, turned into weights.
 *
 * This exists because `habits.linked_stats` was never populated: onboarding
 * collects a domain per habit and `bootstrap-profile` wrote the category
 * through but left `linked_stats` at its `'[]'` default, so every stat scored
 * 0 for every user no matter how much they logged. The catalog keys are the
 * 12 onboarding domain ids (`onboarding-content.ts`'s DOMAINS), which is what
 * `habits.category` actually holds.
 *
 * Weights are relative, not absolute: 1.0 is "this is what the habit is for",
 * 0.3-0.5 is "this benefits too". They only need to be consistent with each
 * other — `statScoreFromRawPoints` maps the accumulated total onto 0-100.
 * The CDC gives the direction of each arrow but no magnitudes, so these are
 * decided here (CLAUDE.md §8 category 2) and are safe to retune later:
 * nothing persists a raw score, every stat is recomputed from `habit_logs`.
 *
 * Note the absence of `consistency` — see `consistencyScore` below.
 */
export const LINKED_STATS_BY_CATEGORY: Record<string, readonly LinkedStat[]> = {
  fitness: [
    { stat: 'strength', weight: 1 },
    { stat: 'energy', weight: 0.4 },
    { stat: 'discipline', weight: 0.2 },
  ],
  mind: [
    { stat: 'focus', weight: 0.8 },
    { stat: 'discipline', weight: 0.4 },
  ],
  knowledge: [
    { stat: 'knowledge', weight: 1 },
    { stat: 'focus', weight: 0.3 },
  ],
  career: [
    { stat: 'knowledge', weight: 0.5 },
    { stat: 'focus', weight: 0.5 },
    { stat: 'discipline', weight: 0.3 },
  ],
  finance: [
    { stat: 'discipline', weight: 0.8 },
    { stat: 'knowledge', weight: 0.3 },
  ],
  sleep: [
    { stat: 'health', weight: 0.8 },
    { stat: 'energy', weight: 0.8 },
  ],
  nutrition: [
    { stat: 'health', weight: 1 },
    { stat: 'energy', weight: 0.4 },
  ],
  energy: [
    { stat: 'energy', weight: 1 },
    { stat: 'health', weight: 0.3 },
  ],
  digital: [
    { stat: 'discipline', weight: 0.8 },
    { stat: 'focus', weight: 0.6 },
  ],
  mental: [
    { stat: 'health', weight: 0.5 },
    { stat: 'focus', weight: 0.5 },
    { stat: 'energy', weight: 0.3 },
  ],
  creativity: [
    { stat: 'knowledge', weight: 0.4 },
    { stat: 'focus', weight: 0.4 },
  ],
  relationships: [
    { stat: 'health', weight: 0.4 },
    { stat: 'energy', weight: 0.3 },
  ],
};

/**
 * Fallback for a category outside the catalog — a habit the user typed
 * themselves, or a category added to onboarding before this map. It still
 * feeds `discipline`, because showing up for something you chose is the one
 * thing every habit has in common. Never returns an empty list: a habit that
 * feeds nothing is invisible on the radar, which reads as a bug to the user.
 */
export const DEFAULT_LINKED_STATS: readonly LinkedStat[] = [{ stat: 'discipline', weight: 0.5 }];

export function linkedStatsForCategory(category: string): readonly LinkedStat[] {
  return LINKED_STATS_BY_CATEGORY[category] ?? DEFAULT_LINKED_STATS;
}

/**
 * Consistency is the one stat CDC §26 doesn't feed from a habit category —
 * its source column reads "streaks longs, absence d'échecs". So it has no
 * entry in the catalog above and is computed from the streak instead, on the
 * same saturating curve as every other stat so all seven axes of the radar
 * stay comparable.
 *
 * The longest streak keeps contributing after it breaks, on purpose: CDC §26
 * is explicit that stats stagnate on failure rather than dropping. A user who
 * held 60 days and lost it keeps most of the consistency they built.
 */
export function consistencyScore(input: {
  currentStreak: number;
  longestStreak: number;
}): number {
  const raw = Math.max(0, input.currentStreak) + Math.max(0, input.longestStreak) * 0.5;
  return statScoreFromRawPoints(raw);
}
