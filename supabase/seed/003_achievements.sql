-- Winter Arc — seed: 30 achievements, Phase 1 MVP scope (TODO.md).
-- 24 are named verbatim in CDC §46; 6 extra (quarter-century, the-streak-keeper,
-- habit-century, first-signal, the-devoted, all-classes-tried) fill gaps in the
-- same categories using the same tone. `condition` matches the
-- AchievementCondition union in packages/game-engine/src/achievements.ts —
-- keep them in sync if that union changes.
--
-- `category` is constrained to the 5 CDC §44 values (progression, consistency,
-- social, exploration, prestige) — the "domain-specific" and "secret" groupings
-- in §46 aren't separate DB categories: domain-specific ones are filed under
-- progression, secret ones use hidden=true with whatever category fits.

insert into public.achievements (id, name, description, rarity, category, condition, xp_reward, coins_reward, hidden) values
  -- Progression
  ('first-step', 'First Step', 'Complete your first habit.', 'common', 'progression', '{"type":"habit_completions_total","count":1}', 50, 25, false),
  ('rising', 'Rising', 'Reach Level 10.', 'uncommon', 'progression', '{"type":"level_reaches","level":10}', 150, 75, false),
  ('quarter-century', 'Quarter Century', 'Reach Level 25.', 'uncommon', 'progression', '{"type":"level_reaches","level":25}', 250, 100, false),
  ('the-ascension', 'The Ascension', 'Reach Level 50.', 'epic', 'progression', '{"type":"level_reaches","level":50}', 800, 300, false),
  ('beyond-limits', 'Beyond Limits', 'Reach Prestige I.', 'legendary', 'progression', '{"type":"prestige_reaches","rank":1}', 2000, 500, false),

  -- Consistency
  ('week-warrior', 'Week Warrior', '7-day streak.', 'common', 'consistency', '{"type":"streak_reaches","days":7,"scope":"global"}', 100, 50, false),
  ('the-streak-keeper', 'The Streak Keeper', '14-day streak.', 'uncommon', 'consistency', '{"type":"streak_reaches","days":14,"scope":"global"}', 200, 80, false),
  ('iron-discipline', 'Iron Discipline', '30-day streak.', 'rare', 'consistency', '{"type":"streak_reaches","days":30,"scope":"global"}', 400, 150, false),
  ('the-constant', 'The Constant', '100-day streak.', 'epic', 'consistency', '{"type":"streak_reaches","days":100,"scope":"global"}', 1000, 400, false),
  ('year-of-iron', 'Year of Iron', '365-day streak.', 'legendary', 'consistency', '{"type":"streak_reaches","days":365,"scope":"global"}', 2000, 800, false),
  ('the-devoted', 'The Devoted', '10 Perfect Days (100% habit completion).', 'rare', 'consistency', '{"type":"perfect_days_total","count":10}', 350, 120, false),

  -- Domain-specific (filed under progression per CDC §44's 5-category struct)
  ('hundred-workouts', '100 Workouts', '100 Fitness-category habit completions.', 'rare', 'progression', '{"type":"habit_completions_total","count":100,"category":"Fitness"}', 350, 120, false),
  ('thousand-book-pages', '1 000 Book Pages', '1 000 pages logged via a reading habit.', 'uncommon', 'progression', '{"type":"metric_total_at_least","metric":"book_pages_read","amount":1000}', 250, 100, false),
  ('fifty-hours-deep-work', '50h Deep Work', '3 000 minutes of logged deep work.', 'rare', 'progression', '{"type":"metric_total_at_least","metric":"deep_work_minutes","amount":3000}', 350, 120, false),
  ('zen-master', 'Zen Master', '100 meditation sessions.', 'epic', 'progression', '{"type":"metric_total_at_least","metric":"meditation_sessions","amount":100}', 700, 250, false),
  ('the-hydra', 'The Hydra', '30 days of hitting the hydration goal.', 'common', 'progression', '{"type":"metric_total_at_least","metric":"hydration_goal_days","amount":30}', 120, 60, false),
  ('habit-century', 'Habit Century', '100 total habit completions, any category.', 'uncommon', 'progression', '{"type":"habit_completions_total","count":100}', 200, 90, false),

  -- Social
  ('first-squad', 'First Squad', 'Join a squad.', 'common', 'social', '{"type":"squad_joined"}', 80, 40, false),
  ('squad-leader', 'Squad Leader', 'Create a squad.', 'uncommon', 'social', '{"type":"squad_created"}', 150, 70, false),
  ('the-motivator', 'The Motivator', 'Send 50 encouragements.', 'rare', 'social', '{"type":"encouragements_sent_total","count":50}', 350, 120, false),
  ('champion', 'Champion', 'Win a global challenge.', 'legendary', 'social', '{"type":"challenge_won"}', 1500, 500, false),
  ('first-signal', 'First Signal', 'Send your first encouragement.', 'common', 'social', '{"type":"encouragements_sent_total","count":1}', 40, 20, false),

  -- Exploration
  ('curious', 'Curious', 'Open every section of the app.', 'common', 'exploration', '{"type":"all_sections_opened"}', 80, 40, false),
  ('trendsetter', 'Trendsetter', 'Fully customize your profile.', 'rare', 'exploration', '{"type":"profile_fully_customized"}', 350, 120, false),
  ('collector', 'Collector', 'Own 50 cosmetics.', 'epic', 'exploration', '{"type":"cosmetics_owned_total","count":50}', 700, 250, false),
  ('all-classes-tried', 'All Classes Tried', 'Play every class at least once.', 'rare', 'exploration', '{"type":"all_classes_tried"}', 350, 120, false),

  -- Secret (hidden=true, category is best-fit per CDC §44's 5 values)
  ('night-owl', 'Night Owl', 'Complete 20 habits after midnight.', 'rare', 'exploration', '{"type":"habit_completions_after_hour","hour":0,"count":20}', 350, 120, true),
  ('the-comeback', 'The Comeback', 'Return after 30+ days away and build a new 30-day streak.', 'epic', 'consistency', '{"type":"comeback_streak_reaches","days":30}', 700, 250, true),
  ('solo-path', 'Solo Path', 'Complete an Arc without ever joining a squad.', 'legendary', 'exploration', '{"type":"arc_completed_without_squad"}', 1500, 500, true),
  ('the-silent-one', 'The Silent One', '90 days without the journal or a social reaction.', 'mythic', 'consistency', '{"type":"all_of","conditions":[{"type":"days_without_activity","activity":"journal_entry","days":90},{"type":"days_without_activity","activity":"social_reaction","days":90}]}', 3000, 1000, true)
on conflict (id) do nothing;

-- Wire the two titles whose CDC description explicitly ties them to one of these
-- (Phoenix ← The Comeback), now that the achievement rows exist.
update public.cosmetics set unlock_method = '{"type":"achievement","achievementId":"the-comeback"}'
  where id = 'title-phoenix';

update public.achievements set cosmetic_reward = 'title-phoenix' where id = 'the-comeback';
update public.achievements set cosmetic_reward = 'title-void-walker' where id = 'solo-path';
update public.achievements set cosmetic_reward = 'title-the-explorer' where id = 'all-classes-tried';
update public.achievements set cosmetic_reward = 'title-rising' where id = 'rising';
update public.achievements set cosmetic_reward = 'title-iron-discipline' where id = 'iron-discipline';
update public.achievements set cosmetic_reward = 'title-zen-master' where id = 'zen-master';
update public.achievements set cosmetic_reward = 'title-the-motivator' where id = 'the-motivator';
update public.achievements set cosmetic_reward = 'title-champion' where id = 'champion';
update public.achievements set cosmetic_reward = 'title-trendsetter' where id = 'trendsetter';
update public.achievements set cosmetic_reward = 'title-night-owl' where id = 'night-owl';
