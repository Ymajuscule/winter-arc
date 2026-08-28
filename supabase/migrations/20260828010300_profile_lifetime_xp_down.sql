-- Rollback for 20260828010300_profile_lifetime_xp.sql
alter table public.profiles drop column if exists lifetime_xp;
