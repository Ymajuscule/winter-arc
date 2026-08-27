-- Winter Arc — initial core schema (CDC v2.0)
-- Covers Phase 1 (MVP core, CDC §135) + the structural parts of Phase 2 (CDC §136)
-- that are cheap to have in place early: squads, chests, battle pass, journal, mood.
-- Deferred on purpose: sub-stats (V1.5 §27), guilds (V2 §138), AI coach tables (V2),
-- creator marketplace (V3 §139) — not in scope yet, add when their phase starts.
--
-- Architecture note (CDC §127, anti-cheat): the NestJS API (apps/api) is the only
-- writer for game-state tables (xp, currency, achievements, cosmetics unlocks, chests,
-- battle pass, quest progress) — it uses the service role key, which bypasses RLS by
-- design. RLS below therefore grants the `authenticated` role SELECT on its own rows
-- only, and no INSERT/UPDATE/DELETE — those happen exclusively through the API.
-- Preference-only tables (habits, journal, mood, loadouts) still route through the API
-- in this schema for consistency; revisit if direct client writes are ever desired.
--
-- Rollback: supabase/migrations/20260827000000_init_core_schema_down.sql

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============================================================================
-- Reference / catalog tables (public read, backend-only write)
-- ============================================================================

create table public.classes (
  id text primary key,
  name text not null,
  icon text,
  focus text,
  bonus_description text,
  xp_bonus_pct numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.seasons (
  id text primary key,
  name text not null,
  theme text,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now()
);

create table public.cosmetics (
  id text primary key,
  category text not null check (category in (
    'avatar','frame','aura','banner','nameplate','title',
    'emblem','sigil','theme','streak_flame','xp_bar_style','level_badge'
  )),
  name text not null,
  description text,
  rarity text not null check (rarity in ('common','uncommon','rare','epic','legendary','mythic')),
  image_url text,
  animated_url text,
  season_id text references public.seasons(id),
  unlock_method jsonb not null default '{}',
  is_purchasable boolean not null default false,
  coin_price int,
  ember_price int,
  is_limited boolean not null default false,
  available_from timestamptz,
  available_until timestamptz,
  created_at timestamptz not null default now()
);

create table public.achievements (
  id text primary key,
  name text not null,
  description text,
  icon text,
  rarity text not null check (rarity in ('common','uncommon','rare','epic','legendary','mythic')),
  category text not null check (category in ('progression','consistency','social','exploration','prestige')),
  condition jsonb not null default '{}',
  xp_reward int not null default 0,
  coins_reward int not null default 0,
  cosmetic_reward text references public.cosmetics(id),
  hidden boolean not null default false,
  progress_tracking boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.quest_definitions (
  id text primary key,
  type text not null check (type in ('daily','weekly','monthly','boss','arc_boss','class')),
  name text not null,
  description text,
  xp_reward int not null default 0,
  coins_reward int not null default 0,
  cosmetic_reward text references public.cosmetics(id),
  condition jsonb not null default '{}',
  class_id text references public.classes(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Profile & progression
-- ============================================================================

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  bio text,
  level int not null default 1,
  total_xp bigint not null default 0,
  prestige_rank int not null default 0,
  skill_points int not null default 0,
  current_class_id text references public.classes(id),
  difficulty text not null default 'normal' check (difficulty in ('easy','normal','hard','extreme')),
  avatar_id text references public.cosmetics(id),
  frame_id text references public.cosmetics(id),
  aura_id text references public.cosmetics(id),
  banner_id text references public.cosmetics(id),
  nameplate_id text references public.cosmetics(id),
  title_id text references public.cosmetics(id),
  emblem_id text references public.cosmetics(id),
  sigil_id text references public.cosmetics(id),
  theme_id text references public.cosmetics(id),
  flame_style_id text references public.cosmetics(id),
  xp_bar_style_id text references public.cosmetics(id),
  level_badge_id text references public.cosmetics(id),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_currency (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coins int not null default 0,
  embers int not null default 0,
  fragments jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount int not null,
  source text not null check (source in (
    'habit','daily_quest','weekly_quest','monthly_quest','boss','arc_boss',
    'achievement','streak_milestone','level_milestone','journal','mood',
    'squad','challenge','xp_boost'
  )),
  source_id uuid,
  multiplier numeric not null default 1.0,
  created_at timestamptz not null default now()
);
create index xp_transactions_user_id_idx on public.xp_transactions(user_id, created_at desc);

create table public.user_cosmetics (
  user_id uuid not null references auth.users(id) on delete cascade,
  cosmetic_id text not null references public.cosmetics(id),
  unlocked_at timestamptz not null default now(),
  unlock_source text not null,
  primary key (user_id, cosmetic_id)
);

create table public.loadouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  configuration jsonb not null default '{}',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievements(id),
  unlocked_at timestamptz not null default now(),
  progress numeric not null default 0,
  primary key (user_id, achievement_id)
);

-- ============================================================================
-- Arcs, habits, streaks
-- ============================================================================

create table public.arcs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  difficulty text not null check (difficulty in ('easy','normal','hard','extreme')),
  status text not null default 'active' check (status in ('active','completed','abandoned','vacation')),
  completion_pct numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index arcs_user_id_idx on public.arcs(user_id);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  arc_id uuid references public.arcs(id) on delete set null,
  name text not null,
  description text,
  icon text,
  color text,
  category text not null,
  type text not null check (type in ('boolean','numeric','duration','counter','distance','time_based','photo')),
  target_value numeric,
  unit text,
  difficulty text not null check (difficulty in ('easy','medium','hard','extreme')),
  xp_value int not null,
  linked_stats jsonb not null default '[]',
  schedule jsonb not null default '{}',
  reminder_time time,
  is_active boolean not null default true,
  is_paused boolean not null default false,
  paused_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index habits_user_id_idx on public.habits(user_id);
create index habits_arc_id_idx on public.habits(arc_id);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_for date not null,
  value numeric,
  completion_pct numeric not null default 100,
  xp_awarded int not null default 0,
  source text not null default 'app',
  created_at timestamptz not null default now(),
  unique (habit_id, logged_for)
);
create index habit_logs_user_id_idx on public.habit_logs(user_id, logged_for desc);

create table public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('global','habit','category','perfect','quest')),
  scope_ref text,
  current_count int not null default 0,
  longest_count int not null default 0,
  last_completed_on date,
  freeze_used_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, scope, scope_ref)
);

-- ============================================================================
-- Quests (rotated instances per user, definitions above)
-- ============================================================================

create table public.user_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_definition_id text not null references public.quest_definitions(id),
  period_start date not null,
  period_end date not null,
  status text not null default 'active' check (status in ('active','completed','claimed','expired')),
  progress numeric not null default 0,
  completed_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
create index user_quests_user_id_idx on public.user_quests(user_id, period_end desc);

-- ============================================================================
-- Chests & battle pass
-- ============================================================================

create table public.chests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('wooden','iron','silver','gold','obsidian')),
  is_opened boolean not null default false,
  contents jsonb,
  obtained_at timestamptz not null default now(),
  opened_at timestamptz
);
create index chests_user_id_idx on public.chests(user_id);

create table public.battle_passes (
  id uuid primary key default gen_random_uuid(),
  season_id text not null references public.seasons(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  is_premium boolean not null default false,
  current_tier int not null default 0,
  season_xp int not null default 0,
  claimed_tiers jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, user_id)
);

-- ============================================================================
-- Social: squads & challenges
-- ============================================================================

create table public.squads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  avatar_url text,
  banner_id text references public.cosmetics(id),
  emblem_id text references public.cosmetics(id),
  created_by uuid not null references auth.users(id),
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.squad_members (
  squad_id uuid not null references public.squads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('leader','officer','member')),
  joined_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  scope text not null check (scope in ('global','community','class','friend')),
  starts_on timestamptz not null,
  ends_on timestamptz not null,
  condition jsonb not null default '{}',
  reward jsonb not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.challenge_participants (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  progress numeric not null default 0,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

-- ============================================================================
-- Journal & mood
-- ============================================================================

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  prompt text,
  note text,
  photo_url text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table public.mood_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  mood smallint not null check (mood between 1 and 5),
  energy smallint not null check (energy between 1 and 5),
  motivation smallint not null check (motivation between 1 and 5),
  stress smallint not null check (stress between 1 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

-- ============================================================================
-- Audit trail (CDC §128 — immutable, backend-only)
-- ============================================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_user_id_idx on public.audit_logs(user_id, created_at desc);

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Public catalogs: anyone can read, only service role writes.
alter table public.classes enable row level security;
alter table public.seasons enable row level security;
alter table public.cosmetics enable row level security;
alter table public.achievements enable row level security;
alter table public.quest_definitions enable row level security;

create policy "classes are public" on public.classes for select using (true);
create policy "seasons are public" on public.seasons for select using (true);
create policy "cosmetics are public" on public.cosmetics for select using (true);
create policy "achievements are public" on public.achievements for select using (true);
create policy "quest definitions are public" on public.quest_definitions for select using (true);

-- Personal tables: owner can SELECT their own rows only. No authenticated-role
-- INSERT/UPDATE/DELETE — all writes happen through apps/api using the service role.
alter table public.profiles enable row level security;
alter table public.user_currency enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.user_cosmetics enable row level security;
alter table public.loadouts enable row level security;
alter table public.user_achievements enable row level security;
alter table public.arcs enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.streaks enable row level security;
alter table public.user_quests enable row level security;
alter table public.chests enable row level security;
alter table public.battle_passes enable row level security;
alter table public.journal_entries enable row level security;
alter table public.mood_checkins enable row level security;

create policy "own profile" on public.profiles for select using (auth.uid() = user_id);
create policy "public profiles readable" on public.profiles for select using (is_public = true);
create policy "own currency" on public.user_currency for select using (auth.uid() = user_id);
create policy "own xp transactions" on public.xp_transactions for select using (auth.uid() = user_id);
create policy "own cosmetics" on public.user_cosmetics for select using (auth.uid() = user_id);
create policy "own loadouts" on public.loadouts for select using (auth.uid() = user_id);
create policy "own achievements" on public.user_achievements for select using (auth.uid() = user_id);
create policy "own arcs" on public.arcs for select using (auth.uid() = user_id);
create policy "own habits" on public.habits for select using (auth.uid() = user_id);
create policy "own habit logs" on public.habit_logs for select using (auth.uid() = user_id);
create policy "own streaks" on public.streaks for select using (auth.uid() = user_id);
create policy "own quests" on public.user_quests for select using (auth.uid() = user_id);
create policy "own chests" on public.chests for select using (auth.uid() = user_id);
create policy "own battle pass" on public.battle_passes for select using (auth.uid() = user_id);
create policy "own journal" on public.journal_entries for select using (auth.uid() = user_id);
create policy "own mood" on public.mood_checkins for select using (auth.uid() = user_id);

-- Squads: members can see their squad, its roster, and its challenges/participants.
alter table public.squads enable row level security;
alter table public.squad_members enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;

create policy "members can view their squad" on public.squads for select using (
  exists (select 1 from public.squad_members sm where sm.squad_id = squads.id and sm.user_id = auth.uid())
);
create policy "members can view squad roster" on public.squad_members for select using (
  exists (select 1 from public.squad_members sm where sm.squad_id = squad_members.squad_id and sm.user_id = auth.uid())
);
create policy "challenges are public" on public.challenges for select using (true);
create policy "own challenge participation" on public.challenge_participants for select using (auth.uid() = user_id);

-- audit_logs: no client access at all (service role only, RLS with no policies blocks all).
alter table public.audit_logs enable row level security;
