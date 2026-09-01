-- Enable pg_cron + pg_net — the scheduling pair CDC §107's "scheduled jobs"
-- line depends on (quest rotation, Grace Period cutoff, daily reset).
--
-- RECONSTRUCTED 2026-08-31. These extensions were enabled directly against
-- the live project on 2026-08-28 (remote migration `20260828083942`) and no
-- file was ever committed, so the repo did not describe its own database:
-- rebuilding from `supabase/migrations/` produced a schema with no scheduler
-- at all, and `advance-streak` would simply never have run. The version
-- number matches the one recorded remotely so the histories line up.
--
-- Safe to re-run: both statements are `if not exists`.
--
-- Note on pg_net's schema: it installs into `public` and Postgres rejects
-- `ALTER EXTENSION ... SET SCHEMA` for it (error 0A000 — confirmed on
-- 2026-08-28). Supabase's own linter raises a WARN for this on essentially
-- every project that uses pg_net; it is a packaging limitation, not
-- something this schema chose.
--
-- Rollback: 20260828083942_enable_cron_and_net_down.sql

create extension if not exists pg_cron;
create extension if not exists pg_net;
