-- Winter Arc — seed: starter cosmetics catalog, Phase 1 MVP scope (TODO.md):
-- 12 avatars, 8 frames, 6 auras, 6 banners, 20 titles, 5 themes. Names and
-- unlock conditions are pulled from the CDC (§29, §50-58) wherever it names
-- one explicitly; everything else follows the same naming register.
--
-- unlock_method shape (not the same DSL as achievements.condition — cosmetics
-- unlock through the 9 channels in CDC §64, achievements are just one of them):
--   {"type": "onboarding"}
--   {"type": "level", "level": 5}
--   {"type": "streak", "days": 30, "scope": "global"}
--   {"type": "class", "classId": "ranger", "level": 10}
--   {"type": "achievement", "achievementId": "iron-discipline"}
--   {"type": "shop"}
--
-- image_url is left blank ('') — no asset pipeline yet (CDC §50-60 describe the
-- visual design, not the asset files). Fill in once packages/ui-primitives has
-- real art or Lottie sources.

-- Avatars (12) — CDC §50: "12 preset avatars, each with a brief description".
insert into public.cosmetics (id, category, name, description, rarity, image_url, unlock_method, is_purchasable) values
  ('avatar-warrior', 'avatar', 'The Warrior', 'Starter avatar, unlocks the Iron frame bundle.', 'common', '', '{"type":"onboarding"}', false),
  ('avatar-scholar', 'avatar', 'The Scholar', 'Starter avatar.', 'common', '', '{"type":"onboarding"}', false),
  ('avatar-monk', 'avatar', 'The Monk', 'Starter avatar.', 'common', '', '{"type":"onboarding"}', false),
  ('avatar-ranger', 'avatar', 'The Ranger', 'Starter avatar.', 'common', '', '{"type":"onboarding"}', false),
  ('avatar-artisan', 'avatar', 'The Artisan', 'Starter avatar.', 'common', '', '{"type":"onboarding"}', false),
  ('avatar-sage', 'avatar', 'The Sage', 'Starter avatar.', 'common', '', '{"type":"onboarding"}', false),
  ('avatar-wanderer', 'avatar', 'The Wanderer', 'Starter avatar.', 'common', '', '{"type":"onboarding"}', false),
  ('avatar-forger', 'avatar', 'The Forger', 'Starter avatar.', 'common', '', '{"type":"onboarding"}', false),
  ('avatar-voyager', 'avatar', 'The Voyager', 'Starter avatar.', 'common', '', '{"type":"onboarding"}', false),
  ('avatar-sentinel', 'avatar', 'The Sentinel', 'Starter avatar.', 'common', '', '{"type":"onboarding"}', false),
  ('avatar-oracle', 'avatar', 'The Oracle', 'Starter avatar.', 'common', '', '{"type":"onboarding"}', false),
  ('avatar-outrider', 'avatar', 'The Outrider', 'Starter avatar.', 'common', '', '{"type":"onboarding"}', false)
on conflict (id) do nothing;

-- Frames (8) — CDC §51: 7 level frames + the 30-day streak frame "Iron Will".
insert into public.cosmetics (id, category, name, description, rarity, image_url, unlock_method, is_purchasable) values
  ('frame-iron', 'frame', 'Iron', 'Grey, plain. Everyone starts here.', 'common', '', '{"type":"level","level":1}', false),
  ('frame-bronze', 'frame', 'Bronze', '', 'common', '', '{"type":"level","level":5}', false),
  ('frame-silver', 'frame', 'Silver', '', 'uncommon', '', '{"type":"level","level":10}', false),
  ('frame-gold', 'frame', 'Gold', '', 'rare', '', '{"type":"level","level":25}', false),
  ('frame-platinum', 'frame', 'Platinum', 'Animated, a slight reflective sheen.', 'epic', '', '{"type":"level","level":50}', false),
  ('frame-diamond', 'frame', 'Diamond', 'Particle effects.', 'legendary', '', '{"type":"level","level":75}', false),
  ('frame-obsidian', 'frame', 'Obsidian', 'Black with ice-blue shards.', 'legendary', '', '{"type":"level","level":100}', false),
  ('frame-iron-will', 'frame', 'Iron Will', 'A thin silver ring, earned the hard way.', 'rare', '', '{"type":"streak","days":30,"scope":"global"}', false)
on conflict (id) do nothing;

-- Auras (6 of the 8 named in CDC §52 — Zen and Legend held back for Phase 2/Prestige X).
insert into public.cosmetics (id, category, name, description, rarity, image_url, unlock_method, is_purchasable) values
  ('aura-ember', 'aura', 'Ember', 'Warm orange flame particles.', 'rare', '', '{"type":"shop"}', true),
  ('aura-frost', 'aura', 'Frost', 'Pale blue ice particles.', 'rare', '', '{"type":"level","level":40}', false),
  ('aura-void', 'aura', 'Void', 'Dark cloud with violet flecks.', 'epic', '', '{"type":"shop"}', true),
  ('aura-verdant', 'aura', 'Verdant', 'Slow-spinning leaves.', 'rare', '', '{"type":"shop"}', true),
  ('aura-solar', 'aura', 'Solar', 'Thin golden rays.', 'epic', '', '{"type":"shop"}', true),
  ('aura-storm', 'aura', 'Storm', 'Small, occasional discharges.', 'epic', '', '{"type":"shop"}', true)
on conflict (id) do nothing;

-- Banners (6 of the 10 named in CDC §53).
insert into public.cosmetics (id, category, name, description, rarity, image_url, unlock_method, is_purchasable) values
  ('banner-frozen-peaks', 'banner', 'Frozen Peaks', '', 'uncommon', '', '{"type":"shop"}', true),
  ('banner-neon-metropolis', 'banner', 'Neon Metropolis', '', 'uncommon', '', '{"type":"shop"}', true),
  ('banner-deep-forest', 'banner', 'Deep Forest', '', 'uncommon', '', '{"type":"shop"}', true),
  ('banner-desert-ascent', 'banner', 'Desert Ascent', '', 'uncommon', '', '{"type":"shop"}', true),
  ('banner-void-space', 'banner', 'Void Space', '', 'rare', '', '{"type":"shop"}', true),
  ('banner-golden-path', 'banner', 'Golden Path', '', 'rare', '', '{"type":"shop"}', true)
on conflict (id) do nothing;

-- Themes (5) — CDC §57, exactly the first 5 rows of that table (the rest are Phase 2+).
insert into public.cosmetics (id, category, name, description, rarity, image_url, unlock_method, is_purchasable) values
  ('theme-frost', 'theme', 'Frost', 'Ice blue. The default.', 'common', '', '{"type":"onboarding"}', false),
  ('theme-ember', 'theme', 'Ember', 'Orange-red.', 'uncommon', '', '{"type":"level","level":15}', false),
  ('theme-void', 'theme', 'Void', 'Deep violet.', 'rare', '', '{"type":"streak","days":30,"scope":"global"}', false),
  ('theme-forest', 'theme', 'Forest', 'Deep green.', 'rare', '', '{"type":"class","classId":"ranger","level":10}', false),
  ('theme-blood', 'theme', 'Blood', 'Dark red.', 'epic', '', '{"type":"achievement","achievementId":"iron-discipline"}', false)
on conflict (id) do nothing;

-- Titles (20) — CDC names 11 explicitly across §21/§47; the other 9 are drawn
-- from named §46 achievements strong enough to double as an equippable title.
insert into public.cosmetics (id, category, name, description, rarity, image_url, unlock_method, is_purchasable) values
  ('title-awakened', 'title', 'The Awakened', 'Day zero.', 'common', '', '{"type":"onboarding"}', false),
  ('title-initiate', 'title', 'Initiate', '', 'common', '', '{"type":"level","level":5}', false),
  ('title-committed', 'title', 'Committed', '', 'uncommon', '', '{"type":"level","level":20}', false),
  ('title-ironclad', 'title', 'Ironclad', '', 'rare', '', '{"type":"level","level":50}', false),
  ('title-the-constant', 'title', 'The Constant', '', 'epic', '', '{"type":"streak","days":100,"scope":"global"}', false),
  ('title-ascended', 'title', 'Ascended', '', 'legendary', '', '{"type":"level","level":100}', false),
  ('title-iron-willed', 'title', 'Iron Willed', 'Arc boss defeated.', 'rare', '', '{"type":"boss_defeated","scope":"arc"}', false),
  ('title-winter-soldier', 'title', 'Winter Soldier', 'Winter Arc completed at 90%+.', 'legendary', '', '{"type":"arc_completed","minCompletionPct":90}', false),
  ('title-legend', 'title', 'Legend', 'Prestige X.', 'mythic', '', '{"type":"level","level":100}', false),
  ('title-phoenix', 'title', 'Phoenix', '30-day Comeback Streak.', 'epic', '', '{"type":"achievement","achievementId":"the-comeback"}', false),
  ('title-the-explorer', 'title', 'The Explorer', 'Tried every class.', 'rare', '', '{"type":"achievement","achievementId":"all-classes-tried"}', false),
  ('title-void-walker', 'title', 'Void Walker', 'Secret.', 'legendary', '', '{"type":"achievement","achievementId":"solo-path"}', false),
  ('title-rising', 'title', 'Rising', '', 'uncommon', '', '{"type":"achievement","achievementId":"rising"}', false),
  ('title-iron-discipline', 'title', 'Iron Discipline', '', 'rare', '', '{"type":"achievement","achievementId":"iron-discipline"}', false),
  ('title-zen-master', 'title', 'Zen Master', '100 meditation sessions.', 'epic', '', '{"type":"achievement","achievementId":"zen-master"}', false),
  ('title-the-motivator', 'title', 'The Motivator', '50 encouragements sent.', 'rare', '', '{"type":"achievement","achievementId":"the-motivator"}', false),
  ('title-champion', 'title', 'Champion', 'Won a global challenge.', 'legendary', '', '{"type":"achievement","achievementId":"champion"}', false),
  ('title-trendsetter', 'title', 'Trendsetter', 'Fully customized profile.', 'rare', '', '{"type":"achievement","achievementId":"trendsetter"}', false),
  ('title-night-owl', 'title', 'Night Owl', 'Secret.', 'rare', '', '{"type":"achievement","achievementId":"night-owl"}', false),
  ('title-the-comeback', 'title', 'The Comeback', 'Secret.', 'epic', '', '{"type":"achievement","achievementId":"the-comeback"}', false)
on conflict (id) do nothing;
