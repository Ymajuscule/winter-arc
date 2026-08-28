-- Active XP boosts — CDC §25 (XP Elixir 24h +50%, XP Feast 1h +100%).
-- Fills the gap award-habit-xp/index.ts's header flags: hasXpElixir/hasXpFeast
-- are hard-coded false because this table didn't exist.
--
-- Personal game-state table (CDC §127): select-own only, no authenticated
-- write policy — only an Edge Function (shop-purchase, open-chest, a future
-- gift-boost) using the service role inserts a row.
--
-- Monthly cap on the *shop-bought* "XP Boost" cosmetic specifically (CDC §19:
-- "cap 5/mois") is a business rule enforced by the granting Edge Function, not
-- a DB constraint here — same convention as the squad member-count cap
-- (schema-postgresql.md: "à valider côté Edge Function, pas en DB").
--
-- Rollback: 20260828010000_active_boosts_down.sql

create table public.active_boosts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('xp_elixir', 'xp_feast')),
  source text not null, -- 'quest' | 'shop' | 'chest' | 'gift' — free-form label, not a strict catalog
  activated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- The query award-habit-xp needs: "does this user have an unexpired boost of
-- this type right now" — covers both the lookup column and the range check.
create index active_boosts_user_id_expires_at_idx on public.active_boosts(user_id, expires_at desc);

alter table public.active_boosts enable row level security;

create policy "own active boosts" on public.active_boosts for select using (auth.uid() = user_id);
