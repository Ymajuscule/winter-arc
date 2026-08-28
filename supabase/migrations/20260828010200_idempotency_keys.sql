-- Idempotency keys — TODO.md Phase 0 gap: "a retried network call shouldn't
-- double-award XP" once the mobile sync queue (CDC §110) is real. The mobile
-- client generates a UUID per logical action (e.g. one habit completion) and
-- resends it unchanged on retry; every mutating Edge Function checks this
-- table first (see supabase/functions/_shared/idempotency.ts) and replays the
-- cached response instead of re-executing on a repeat key.
--
-- No client access at all (service role only) — same pattern as audit_logs:
-- RLS enabled, zero policies. This table is a write-path implementation
-- detail, never something the client queries directly.
--
-- Rollback: 20260828010200_idempotency_keys_down.sql

create table public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null, -- e.g. 'award-habit-xp'
  key text not null, -- client-generated UUID, one per logical action
  status_code int not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint, key)
);

-- Old rows are safe to prune (e.g. via a scheduled job past a retention
-- window) since a network retry only needs the key to survive as long as the
-- client's own retry logic might resend it — not modeled as a migration
-- concern here.
create index idempotency_keys_created_at_idx on public.idempotency_keys(created_at);

alter table public.idempotency_keys enable row level security;
