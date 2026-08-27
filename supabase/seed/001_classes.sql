-- Winter Arc — seed: classes (CDC §29). Matches packages/game-engine/src/classes.ts exactly —
-- if you change one, change the other. Not applied automatically; Julien runs this after
-- the core schema migration.

insert into public.classes (id, name, icon, focus, bonus_description, xp_bonus_pct) values
  ('warrior', 'Warrior', '⚔️', 'Fitness', '+15% XP on physical habits', 0.15),
  ('scholar', 'Scholar', '📖', 'Knowledge', '+15% XP on reading/learning habits', 0.15),
  ('monk', 'Monk', '🧘', 'Focus, Discipline', '+15% XP on meditation and deep work', 0.15),
  ('ranger', 'Ranger', '🏹', 'Health, Energy', '+15% XP on sleep and nutrition habits', 0.15),
  ('artisan', 'Artisan', '🎨', 'Creativity', '+15% XP on creative habits', 0.15),
  ('sage', 'Sage', '🔮', 'Balanced', '+5% XP on everything', 0.05),
  ('wanderer', 'Wanderer', '🌫️', 'None', 'No bonus, but total freedom', 0)
on conflict (id) do nothing;
