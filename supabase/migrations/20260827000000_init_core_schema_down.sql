-- Rollback for 20260827000000_init_core_schema.sql
-- Not auto-applied by Supabase — run manually via `apply_migration` / psql if the
-- forward migration needs to be reverted. Drops in dependency-safe reverse order.

drop table if exists public.audit_logs cascade;
drop table if exists public.challenge_participants cascade;
drop table if exists public.challenges cascade;
drop table if exists public.squad_members cascade;
drop table if exists public.squads cascade;
drop table if exists public.mood_checkins cascade;
drop table if exists public.journal_entries cascade;
drop table if exists public.battle_passes cascade;
drop table if exists public.chests cascade;
drop table if exists public.user_quests cascade;
drop table if exists public.streaks cascade;
drop table if exists public.habit_logs cascade;
drop table if exists public.habits cascade;
drop table if exists public.arcs cascade;
drop table if exists public.user_achievements cascade;
drop table if exists public.loadouts cascade;
drop table if exists public.user_cosmetics cascade;
drop table if exists public.xp_transactions cascade;
drop table if exists public.user_currency cascade;
drop table if exists public.profiles cascade;
drop table if exists public.quest_definitions cascade;
drop table if exists public.achievements cascade;
drop table if exists public.cosmetics cascade;
drop table if exists public.seasons cascade;
drop table if exists public.classes cascade;
