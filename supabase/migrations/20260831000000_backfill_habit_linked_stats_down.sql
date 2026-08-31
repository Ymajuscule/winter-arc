-- Rollback of 20260831000000_backfill_habit_linked_stats.sql.
--
-- Caveat worth stating plainly: the up-migration left no marker on the rows it
-- touched, so this cannot distinguish "backfilled by that migration" from
-- "written by bootstrap-profile at insert time with the same catalog values".
-- It therefore clears linked_stats for every habit whose value is exactly one
-- of the catalog defaults, which is a superset of what the up-migration wrote.
--
-- That is acceptable because linked_stats is derived, not authored: it is
-- recomputed on the next habit insert and can be refilled by re-running the up
-- migration. No user-entered data is lost. Habits with hand-edited weights
-- (nothing writes those today) would be spared, since they wouldn't match.

update public.habits
set
  linked_stats = '[]'::jsonb,
  updated_at = now()
where linked_stats in (
  '[{"stat":"strength","weight":1},{"stat":"energy","weight":0.4},{"stat":"discipline","weight":0.2}]'::jsonb,
  '[{"stat":"focus","weight":0.8},{"stat":"discipline","weight":0.4}]'::jsonb,
  '[{"stat":"knowledge","weight":1},{"stat":"focus","weight":0.3}]'::jsonb,
  '[{"stat":"knowledge","weight":0.5},{"stat":"focus","weight":0.5},{"stat":"discipline","weight":0.3}]'::jsonb,
  '[{"stat":"discipline","weight":0.8},{"stat":"knowledge","weight":0.3}]'::jsonb,
  '[{"stat":"health","weight":0.8},{"stat":"energy","weight":0.8}]'::jsonb,
  '[{"stat":"health","weight":1},{"stat":"energy","weight":0.4}]'::jsonb,
  '[{"stat":"energy","weight":1},{"stat":"health","weight":0.3}]'::jsonb,
  '[{"stat":"discipline","weight":0.8},{"stat":"focus","weight":0.6}]'::jsonb,
  '[{"stat":"health","weight":0.5},{"stat":"focus","weight":0.5},{"stat":"energy","weight":0.3}]'::jsonb,
  '[{"stat":"knowledge","weight":0.4},{"stat":"focus","weight":0.4}]'::jsonb,
  '[{"stat":"health","weight":0.4},{"stat":"energy","weight":0.3}]'::jsonb,
  '[{"stat":"discipline","weight":0.5}]'::jsonb
);
