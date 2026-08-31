-- Backfill habits.linked_stats — CDC §26.
--
-- Every habit created by bootstrap-profile before 2026-08-31 was inserted
-- with linked_stats at its '[]' default, because the insert wrote `category`
-- and nothing else. The result: game-engine/stats.ts had no contributions to
-- read, so all 7 stats scored 0 for every user forever. bootstrap-profile now
-- derives them via `linkedStatsForCategory`; this fills in the rows that
-- predate that.
--
-- The weights below MUST match LINKED_STATS_BY_CATEGORY in
-- packages/game-engine/src/stats.ts. This is a one-shot backfill, not a second
-- source of truth — SQL can't import the TS catalog, and duplicating it here
-- once is preferable to leaving live rows empty. If the catalog is retuned
-- later, nothing needs re-running: stats are recomputed from habit_logs on
-- every read, and new habits get the current weights at insert time.
--
-- Only touches rows that are still empty, so it is safe to re-run.
--
-- Rollback: 20260831000000_backfill_habit_linked_stats_down.sql

update public.habits
set
  linked_stats = case category
    when 'fitness' then '[{"stat":"strength","weight":1},{"stat":"energy","weight":0.4},{"stat":"discipline","weight":0.2}]'::jsonb
    when 'mind' then '[{"stat":"focus","weight":0.8},{"stat":"discipline","weight":0.4}]'::jsonb
    when 'knowledge' then '[{"stat":"knowledge","weight":1},{"stat":"focus","weight":0.3}]'::jsonb
    when 'career' then '[{"stat":"knowledge","weight":0.5},{"stat":"focus","weight":0.5},{"stat":"discipline","weight":0.3}]'::jsonb
    when 'finance' then '[{"stat":"discipline","weight":0.8},{"stat":"knowledge","weight":0.3}]'::jsonb
    when 'sleep' then '[{"stat":"health","weight":0.8},{"stat":"energy","weight":0.8}]'::jsonb
    when 'nutrition' then '[{"stat":"health","weight":1},{"stat":"energy","weight":0.4}]'::jsonb
    when 'energy' then '[{"stat":"energy","weight":1},{"stat":"health","weight":0.3}]'::jsonb
    when 'digital' then '[{"stat":"discipline","weight":0.8},{"stat":"focus","weight":0.6}]'::jsonb
    when 'mental' then '[{"stat":"health","weight":0.5},{"stat":"focus","weight":0.5},{"stat":"energy","weight":0.3}]'::jsonb
    when 'creativity' then '[{"stat":"knowledge","weight":0.4},{"stat":"focus","weight":0.4}]'::jsonb
    when 'relationships' then '[{"stat":"health","weight":0.4},{"stat":"energy","weight":0.3}]'::jsonb
    -- DEFAULT_LINKED_STATS — a category the user typed themselves still has
    -- to feed something, or the habit is invisible on the radar.
    else '[{"stat":"discipline","weight":0.5}]'::jsonb
  end,
  updated_at = now()
where linked_stats = '[]'::jsonb or linked_stats is null;
