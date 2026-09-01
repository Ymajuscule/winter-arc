-- Rollback of 20260828084005_advance_streak_cron.sql.
--
-- Leaves the vault secrets in place: `cron_secret` is paired with the
-- `CRON_SECRET` Edge Function secret, and dropping one side silently breaks
-- the other if the job is ever rescheduled. Delete them explicitly if the
-- project is genuinely being torn down.

select cron.unschedule('advance-streak-nightly')
where exists (select 1 from cron.job where jobname = 'advance-streak-nightly');
