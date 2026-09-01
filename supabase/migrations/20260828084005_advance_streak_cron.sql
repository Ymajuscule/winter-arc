-- Schedule the nightly Grace Period cutoff — CDC §42.
--
-- `advance-streak` closes out yesterday for every user who didn't open the
-- app, so it has to be driven by the database, not by a client. 03:00 sits
-- inside CDC §42's 00:00-03:00 cutoff window.
--
-- RECONSTRUCTED 2026-08-31, and deliberately NOT a byte-for-byte replay of
-- what is live. The job was created ad hoc against the project on
-- 2026-08-28 (remote migration `20260828084005`) with no file committed, and
-- the session log records the shape but not the vault secret's name or the
-- exact job body — so reproducing it exactly is guesswork, and guessing here
-- would risk leaving two subtly different jobs behind. This is instead a
-- self-contained, idempotent definition that converges the project onto a
-- known state: it unschedules any existing job of the same name first.
--
-- Both the function URL and the shared secret come from `vault`, so this
-- file carries no project ref and no credential and can be applied to any
-- environment. Create the two secrets first (once per project):
--
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret(encode(gen_random_bytes(24), 'hex'), 'cron_secret');
--
-- The `cron_secret` value must ALSO be set as the `CRON_SECRET` Edge
-- Function secret, or `advance-streak` rejects the call with 401 — it
-- authenticates on that header rather than a user JWT, since pg_cron has no
-- user to present. That secret was still unset as of 2026-08-31; the cron
-- side has been correct and the function side has been rejecting it.
--
-- Rollback: 20260828084005_advance_streak_cron_down.sql

do $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';

  if v_url is null or v_secret is null then
    raise exception
      'Missing vault secrets. Create `project_url` and `cron_secret` first — see this file''s header.';
  end if;

  -- Idempotent: drop any previous definition, including the ad-hoc one.
  perform cron.unschedule('advance-streak-nightly')
  where exists (select 1 from cron.job where jobname = 'advance-streak-nightly');

  perform cron.schedule(
    'advance-streak-nightly',
    '0 3 * * *',
    format(
      $job$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-Cron-Secret', %L
        ),
        body := '{}'::jsonb
      );
      $job$,
      v_url || '/functions/v1/advance-streak',
      v_secret
    )
  );
end
$$;
