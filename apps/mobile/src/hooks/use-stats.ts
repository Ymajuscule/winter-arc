import { supabase } from '@/services/supabase';
import { useAppStore } from '@/stores/app-store';
import { useSessionStore } from '@/stores/session-store';
import { useQuery } from '@tanstack/react-query';
import {
  type LinkedStat,
  STAT_IDS,
  type StatContribution,
  type StatId,
  applyStatDecay,
  calculateStatScores,
  consistencyScore,
  linkedStatsForCategory,
} from '@winterarc/game-engine';

/**
 * The 7-stat scores behind the profile radar (CDC §26-28).
 *
 * Computed client-side on purpose, unlike XP. `game-engine/stats.ts`'s own
 * header spells out why: stats are a read-only display derived from rows the
 * client already legitimately reads under RLS (its own `habits` /
 * `habit_logs`), and they don't gate a reward or a leaderboard, so CDC §127's
 * anti-cheat boundary doesn't apply. If a stat ever unlocks something,
 * this moves into an Edge Function.
 *
 * Two sources, mirroring `app-store`'s two modes:
 * - **cloud**: the real `habit_logs` history, so the radar reflects the whole
 *   Arc, decay included.
 * - **local (demo mode)**: the app-store's habits and today's completions.
 *   There is no local log history to read, so the radar shows one day. That
 *   is honest rather than impressive, and it matches CDC §13's demo scope.
 */

/** How far back the cloud query looks. An Arc is 90 days; 180 covers a prestige-era profile without unbounded growth. */
const HISTORY_WINDOW_DAYS = 180;

export interface StatsSnapshot {
  scores: Record<StatId, number>;
  source: 'cloud' | 'local';
  /** Number of habit completions the scores are built from — drives the empty state. */
  contributionCount: number;
}

interface HabitRow {
  id: string;
  category: string;
  linked_stats: LinkedStat[] | null;
}

interface LogRow {
  habit_id: string;
  completion_pct: number;
  logged_for: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/**
 * A habit's stats, falling back to its category when the column is empty.
 * Habits created before the `linked_stats` backfill migration have `'[]'`
 * there — deriving from the category means the radar is correct whether or
 * not that migration has been applied yet, instead of showing a flat zero.
 */
function statsForHabit(habit: HabitRow): readonly LinkedStat[] {
  const stored = habit.linked_stats;
  if (Array.isArray(stored) && stored.length > 0) return stored;
  return linkedStatsForCategory(habit.category);
}

/** Applies CDC §26's inactivity decay per stat, from that stat's own last contribution. */
function withDecay(
  scores: Record<StatId, number>,
  lastContributionByStat: Partial<Record<StatId, string>>,
  today: string,
): Record<StatId, number> {
  const out = { ...scores };
  for (const id of STAT_IDS) {
    const last = lastContributionByStat[id];
    // A stat that never scored has nothing to decay — it is already 0.
    if (!last) continue;
    out[id] = applyStatDecay(out[id], daysBetween(last, today));
  }
  return out;
}

export function useStats() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const isCloudSynced = useAppStore((s) => s.isCloudSynced);
  const localHabits = useAppStore((s) => s.habits);
  const streak = useAppStore((s) => s.streak);

  const cloud = useQuery<StatsSnapshot>({
    queryKey: ['stats', userId],
    enabled: Boolean(supabase && userId && isCloudSynced),
    queryFn: async () => {
      if (!supabase || !userId) throw new Error('Not signed in');
      const today = todayIso();
      const since = new Date(Date.now() - HISTORY_WINDOW_DAYS * 86_400_000)
        .toISOString()
        .slice(0, 10);

      const [{ data: habits }, { data: logs }] = await Promise.all([
        supabase.from('habits').select('id, category, linked_stats').eq('user_id', userId),
        supabase
          .from('habit_logs')
          .select('habit_id, completion_pct, logged_for')
          .eq('user_id', userId)
          .gte('logged_for', since),
      ]);

      const statsByHabit = new Map<string, readonly LinkedStat[]>(
        ((habits ?? []) as HabitRow[]).map((h) => [h.id, statsForHabit(h)]),
      );

      const contributions: StatContribution[] = [];
      const lastContributionByStat: Partial<Record<StatId, string>> = {};

      for (const log of (logs ?? []) as LogRow[]) {
        const linkedStats = statsByHabit.get(log.habit_id);
        // A log whose habit was deleted contributes nothing — there is no
        // category left to derive stats from, and guessing one would be worse
        // than the small under-count.
        if (!linkedStats) continue;
        contributions.push({ linkedStats, completionPct: Number(log.completion_pct) });
        for (const linked of linkedStats) {
          const known = lastContributionByStat[linked.stat];
          if (!known || log.logged_for > known)
            lastContributionByStat[linked.stat] = log.logged_for;
        }
      }

      const scores = withDecay(calculateStatScores(contributions), lastContributionByStat, today);
      scores.consistency = consistencyScore({
        currentStreak: streak.currentCount,
        longestStreak: streak.longestCount,
      });

      return { scores, source: 'cloud', contributionCount: contributions.length };
    },
  });

  if (cloud.data) return { ...cloud, data: cloud.data };

  // Demo mode (or cloud still loading on first paint): what the local store knows.
  const contributions: StatContribution[] = localHabits
    .filter((h) => h.completedToday)
    .map((h) => ({ linkedStats: linkedStatsForCategory(h.category), completionPct: 100 }));

  const scores = calculateStatScores(contributions);
  scores.consistency = consistencyScore({
    currentStreak: streak.currentCount,
    longestStreak: streak.longestCount,
  });

  return {
    ...cloud,
    data: {
      scores,
      source: 'local',
      contributionCount: contributions.length,
    } satisfies StatsSnapshot,
  };
}

/** Display order around the radar — CDC §26's own table order. */
export const STAT_LABELS: Record<StatId, string> = {
  strength: 'STR',
  discipline: 'DSC',
  health: 'HLT',
  knowledge: 'KNW',
  focus: 'FCS',
  energy: 'NRG',
  consistency: 'CNS',
};

export const STAT_FULL_LABELS: Record<StatId, string> = {
  strength: 'STRENGTH',
  discipline: 'DISCIPLINE',
  health: 'HEALTH',
  knowledge: 'KNOWLEDGE',
  focus: 'FOCUS',
  energy: 'ENERGY',
  consistency: 'CONSISTENCY',
};
