-- Normalise habits.category onto the canonical id vocabulary — CDC §26/§29.
--
-- Onboarding persisted the *display label* of a domain ("Fitness", "Digital
-- Discipline") as `habits.category` instead of its id ("fitness", "digital").
-- Two things broke silently as a result, both found on 2026-08-31 while
-- running the app in a browser for the first time:
--
--   1. Class synergy (CDC §19/§29) matched `focusCategories`, which held a
--      third vocabulary again — stat names like 'Focus'/'Discipline'. The
--      Monk's and Ranger's +15% could never fire on any habit.
--   2. The stat catalog (game-engine/stats.ts) keys on the ids, so every
--      habit fell through to the default and all seven stats collapsed onto
--      Discipline.
--
-- game-engine now uses `CATEGORY_IDS` everywhere and a unit test asserts the
-- three sources agree. This migration brings the rows already written by
-- bootstrap-profile onto that vocabulary, and re-derives `linked_stats` for
-- them, since the previous backfill filed every mismatched row under the
-- discipline default.
--
-- Case-insensitive on purpose: it should not matter whether a row was written
-- as "Fitness" or "fitness".
--
-- Rollback: 20260831010000_normalise_habit_categories_down.sql

update public.habits
set category = case lower(category)
    when 'fitness' then 'fitness'
    when 'mind' then 'mind'
    when 'knowledge' then 'knowledge'
    when 'career' then 'career'
    when 'finance' then 'finance'
    when 'sleep' then 'sleep'
    when 'nutrition' then 'nutrition'
    when 'energy' then 'energy'
    when 'digital discipline' then 'digital'
    when 'digital' then 'digital'
    when 'mental wellness' then 'mental'
    when 'mental' then 'mental'
    when 'creativity' then 'creativity'
    when 'relationships' then 'relationships'
    -- Anything else (a habit the user named themselves, previously filed as
    -- 'Custom') keeps its own value lowercased. It won't match a class focus
    -- or a stat mapping, which is correct — it isn't one of the 12 domains.
    else lower(category)
  end,
  updated_at = now()
where category <> lower(category)
   or lower(category) in ('digital discipline', 'mental wellness');

-- Re-derive linked_stats for every habit now that the category is canonical.
-- The previous backfill (20260831000000) ran against label-shaped categories
-- and therefore wrote the discipline default for all of them.
update public.habits
set linked_stats = case category
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
    else '[{"stat":"discipline","weight":0.5}]'::jsonb
  end,
  updated_at = now();

-- The one seeded achievement whose condition matches on a category.
-- "100 Fitness-category habit completions" could never progress once habits
-- started storing ids.
update public.achievements
set condition = jsonb_set(condition, '{category}', '"fitness"')
where id = 'hundred-workouts'
  and condition ->> 'category' = 'Fitness';
