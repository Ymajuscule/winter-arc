import { supabase } from '@/services/supabase';
import { useQuery } from '@tanstack/react-query';

export interface AchievementDetails {
  id: string;
  name: string;
  description: string | null;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
}

async function fetchAchievement(id: string): Promise<AchievementDetails | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('achievements')
    .select('id, name, description, rarity')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as AchievementDetails | null;
}

/** `achievements` is a public-read catalog table (supabase-ops) — a plain client read, same as quest_definitions. */
export function useAchievementDetails(id: string | null) {
  return useQuery({
    queryKey: ['achievement', id],
    queryFn: () => fetchAchievement(id as string),
    enabled: !!supabase && !!id,
    staleTime: Number.POSITIVE_INFINITY, // catalog content, never changes under a client's feet
  });
}
