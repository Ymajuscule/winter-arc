-- Rollback of 20260828083942_enable_cron_and_net.sql.
--
-- Dropping pg_cron destroys every scheduled job with it, including
-- `advance-streak-nightly`. Run 20260828084005_advance_streak_cron_down.sql
-- first if you want the job removed cleanly rather than cascaded away.

drop extension if exists pg_net;
drop extension if exists pg_cron;
