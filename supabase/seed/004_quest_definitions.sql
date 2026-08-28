-- Winter Arc — seed: daily + weekly quest_definitions, Phase 1 MVP scope (TODO.md).
--
-- `condition` matches the QuestCondition union in packages/game-engine/src/quests.ts.
-- Deliberately sticks to `habit_completions_in_period` / `completion_pct_days_in_period`
-- / `consecutive_days_at_least_pct` only — `metric_total_in_period` conditions
-- (minutes meditated, pages read, etc.) would never progress past 0 today since
-- no metric-tagged logging exists yet (documented gap in
-- supabase/functions/_shared/quest-progress.ts). Not seeding a quest that can
-- never complete.
--
-- `class_id` is left null on every row — CDC §30 class-specific quests are a
-- real feature but a separate scope cut than this pass (rotate-quests only
-- assigns from the generic pool for now, see that function's header).
--
-- 5 daily defs (rotate-quests picks DAILY_QUEST_SLOTS=3), 4 weekly defs
-- (picks WEEKLY_QUEST_SLOTS_MIN=3) — game-engine/quests.ts's slot constants.

insert into public.quest_definitions (id, type, name, description, xp_reward, coins_reward, condition) values
  -- Daily
  ('daily-first-step', 'daily', 'First Step', 'Complete 1 habit today.', 40, 5, '{"type":"habit_completions_in_period","count":1}'),
  ('daily-momentum', 'daily', 'Momentum', 'Complete 2 habits today.', 70, 8, '{"type":"habit_completions_in_period","count":2}'),
  ('daily-triple-threat', 'daily', 'Triple Threat', 'Complete 3 habits today.', 100, 10, '{"type":"habit_completions_in_period","count":3}'),
  ('daily-full-sweep', 'daily', 'Full Sweep', 'Complete 5 habits today.', 180, 20, '{"type":"habit_completions_in_period","count":5}'),
  ('daily-perfect-day', 'daily', 'Perfect Day', 'Complete 100% of your habits today.', 150, 15, '{"type":"completion_pct_days_in_period","minPct":100,"days":1}'),

  -- Weekly (period_start/end set by rotate-quests to the current Mon-Sun window)
  ('weekly-building-blocks', 'weekly', 'Building Blocks', 'Complete 10 habit check-ins this week.', 220, 20, '{"type":"habit_completions_in_period","count":10}'),
  ('weekly-consistent-effort', 'weekly', 'Consistent Effort', 'Complete 15 habit check-ins this week.', 300, 30, '{"type":"habit_completions_in_period","count":15}'),
  ('weekly-steady-hand', 'weekly', 'Steady Hand', 'Hit 80%+ completion on 5 days this week.', 350, 35, '{"type":"completion_pct_days_in_period","minPct":80,"days":5}'),
  ('weekly-no-days-off', 'weekly', 'No Days Off', 'Hit 80%+ completion on 3 consecutive days.', 250, 25, '{"type":"consecutive_days_at_least_pct","minPct":80,"days":3}')
on conflict (id) do nothing;
