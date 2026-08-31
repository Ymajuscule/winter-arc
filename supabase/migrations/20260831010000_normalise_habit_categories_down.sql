-- Rollback of 20260831010000_normalise_habit_categories.sql.
--
-- Restores the display-label vocabulary for `habits.category` and the
-- achievement condition. It does NOT restore `linked_stats` — the up
-- migration recomputed those from the canonical categories, and the values it
-- replaced were the wrong ones (every habit on the discipline default). Run
-- 20260831000000_backfill_habit_linked_stats_down.sql after this one if the
-- column genuinely needs clearing.
--
-- Restoring labels re-breaks class synergy and the stat radar by design: this
-- rollback exists to undo a migration, not to be a supported state.
--
-- One known lossiness, confirmed by scripts/verify-migrations.sh: the up
-- migration lowercases categories outside the 12 domains (a habit the user
-- named themselves, previously written as 'Custom'), and nothing records the
-- original casing, so those come back lowercased. The value is still the
-- user's own string and nothing matches on it, so this costs nothing but is
-- worth stating rather than discovering.

update public.habits
set category = case category
    when 'fitness' then 'Fitness'
    when 'mind' then 'Mind'
    when 'knowledge' then 'Knowledge'
    when 'career' then 'Career'
    when 'finance' then 'Finance'
    when 'sleep' then 'Sleep'
    when 'nutrition' then 'Nutrition'
    when 'energy' then 'Energy'
    when 'digital' then 'Digital Discipline'
    when 'mental' then 'Mental Wellness'
    when 'creativity' then 'Creativity'
    when 'relationships' then 'Relationships'
    else category
  end,
  updated_at = now()
where category in (
  'fitness','mind','knowledge','career','finance','sleep',
  'nutrition','energy','digital','mental','creativity','relationships'
);

update public.achievements
set condition = jsonb_set(condition, '{category}', '"Fitness"')
where id = 'hundred-workouts'
  and condition ->> 'category' = 'fitness';
