-- profiles.lifetime_xp — CDC §23: "Son niveau redevient 1. Son XP totale est
-- conservée dans un compteur 'Lifetime XP'."
--
-- Real gap found while implementing apply-prestige: the original schema only
-- has `total_xp`, used both to store cumulative XP *and* to compute the
-- current level via levelFromTotalXp(total_xp) everywhere (award-habit-xp,
-- claim-quest, evaluate-achievements). If prestige reset `level` to 1 but
-- left `total_xp` as-is, the very next XP grant would immediately relevel
-- the user back to where they were — `total_xp` and `level` would silently
-- disagree with each other from that point on.
--
-- Fix: `total_xp` becomes "XP since last prestige" (what leveling reads,
-- reset to 0 by apply-prestige); `lifetime_xp` is the CDC's separate
-- never-reset counter (Hall of Fame / Legend status, CDC §24). Every XP grant
-- increments both by the same amount; only apply-prestige zeroes total_xp.
--
-- Rollback: 20260828010300_profile_lifetime_xp_down.sql

alter table public.profiles add column lifetime_xp bigint not null default 0;

-- Backfill: no rows exist yet in practice (schema unapplied), but if this
-- ever runs against a profiles table with data, lifetime_xp should start
-- equal to whatever total_xp already accumulated.
update public.profiles set lifetime_xp = total_xp where lifetime_xp = 0;
