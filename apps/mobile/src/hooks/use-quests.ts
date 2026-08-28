import { ApiRequestError, api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { useAppStore } from '@/stores/app-store';
import { useSessionStore } from '@/stores/session-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Dashboard Zone 4/5 (CDC §14, §33-34) — daily + weekly quest instances.
 *
 * Reads go straight through the Supabase client rather than an Edge
 * Function: `user_quests`/`quest_definitions` both have an
 * `auth.uid() = user_id` (or public) select RLS policy already
 * (supabase-ops skill — reads are fine direct, writes go through Edge
 * Functions for the anti-cheat boundary). Assignment itself happens
 * server-side via the `rotate-quests` cron — this hook only ever reads
 * `user_quests` rows that already exist, never creates them.
 *
 * `useQuests` intentionally does NOT poll — `claimQuest`'s mutation
 * invalidates the query on success, and progress otherwise only updates
 * server-side when a claim is attempted (documented gap in
 * supabase/functions/_shared/quest-progress.ts: nothing refreshes progress
 * on an untouched active quest). A manual pull-to-refresh would re-fetch,
 * but pull-to-refresh itself isn't wired into the dashboard yet.
 */

export interface QuestInstance {
  id: string;
  type: string;
  name: string;
  description: string | null;
  xpReward: number;
  coinsReward: number;
  progress: number;
  status: 'active' | 'completed' | 'claimed' | 'expired';
}

interface UserQuestRow {
  id: string;
  progress: number;
  status: QuestInstance['status'];
  quest_definitions: {
    type: string;
    name: string;
    description: string | null;
    xp_reward: number;
    coins_reward: number;
  } | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Monday (inclusive, ISO date) of the current week, UTC. */
function currentWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getTime() + diffToMonday * 86_400_000);
  return monday.toISOString().slice(0, 10);
}

async function fetchQuestsForPeriod(
  userId: string,
  periodStart: string,
  periodEnd: string,
): Promise<QuestInstance[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('user_quests')
    .select('id, progress, status, quest_definitions(type, name, description, xp_reward, coins_reward)')
    .eq('user_id', userId)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd);
  if (error) throw error;

  return ((data ?? []) as unknown as UserQuestRow[])
    .filter((row) => row.quest_definitions !== null)
    .map((row) => ({
      id: row.id,
      type: row.quest_definitions?.type ?? 'daily',
      name: row.quest_definitions?.name ?? 'Quest',
      description: row.quest_definitions?.description ?? null,
      xpReward: row.quest_definitions?.xp_reward ?? 0,
      coinsReward: row.quest_definitions?.coins_reward ?? 0,
      progress: row.progress,
      status: row.status,
    }));
}

export function useDailyQuests() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const today = todayIso();

  return useQuery({
    queryKey: ['quests', 'daily', userId, today],
    queryFn: () => fetchQuestsForPeriod(userId as string, today, today),
    enabled: !!supabase && !!userId,
  });
}

export function useWeeklyQuests() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const weekStart = currentWeekStart();
  const weekEnd = new Date(
    new Date(`${weekStart}T00:00:00Z`).getTime() + 6 * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);

  return useQuery({
    queryKey: ['quests', 'weekly', userId, weekStart],
    queryFn: () => fetchQuestsForPeriod(userId as string, weekStart, weekEnd),
    enabled: !!supabase && !!userId,
  });
}

export function useClaimQuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userQuestId: string) => api.claimQuest({ userQuestId }),
    onSuccess: (response) => {
      // A successful claim grants XP/coins server-side (profiles.total_xp,
      // user_currency) that app-store's local mirror has no other way to
      // learn about — completeHabit's deltas only track habit completions.
      // totalXp is absolute here (level.totalXp), unlike enqueueAchievementUnlocks'
      // additive xp below, since claim-quest's own reward isn't reflected
      // anywhere else in the store yet.
      useAppStore.setState((state) => ({
        totalXp: response.level.totalXp,
        lifetimeXp: state.lifetimeXp + response.xpAwarded,
        coins: state.coins + response.coinsAwarded,
      }));
      if (response.achievements.newlyUnlockedIds.length > 0) {
        useAppStore
          .getState()
          .enqueueAchievementUnlocks(
            response.achievements.newlyUnlockedIds,
            response.achievements.xpAwarded,
            response.achievements.coinsAwarded,
          );
      }
      queryClient.invalidateQueries({ queryKey: ['quests'] });
    },
    onError: (err) => {
      // A 409 "not complete yet" is a normal outcome (server recomputed
      // progress and found it short) — not something to surface as a crash,
      // the invalidate below still refreshes the displayed progress.
      if (err instanceof ApiRequestError && err.status === 409) {
        queryClient.invalidateQueries({ queryKey: ['quests'] });
      }
    },
  });
}
