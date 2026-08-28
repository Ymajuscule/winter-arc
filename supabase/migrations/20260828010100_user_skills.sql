-- Skill Point allocation — CDC §22. Talent tree catalog lives in code
-- (packages/game-engine/src/skills.ts, SKILLS), not a DB catalog table — same
-- reasoning as achievements.condition needing packages/game-engine to make
-- sense of it: the 16 nodes are static content that ships with the app, not
-- data an admin tool edits. `skill_id` is therefore free text, validated
-- against SKILL_IDS at the Edge Function layer (spend-skill-point, not yet
-- written), not a DB check constraint — keeps this table from needing a
-- migration every time the talent tree gains a node.
--
-- Flat unlock model (own/don't-own), no per-node ranks — see skills.ts header
-- for why. `profiles.skill_points` already counts *available* points; this
-- table is *where* they've been spent.
--
-- Personal game-state table (CDC §127): select-own only, no authenticated
-- write policy — only spend-skill-point (service role) inserts/deletes rows.
--
-- Rollback: 20260828010100_user_skills_down.sql

create table public.user_skills (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id text not null,
  allocated_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

alter table public.user_skills enable row level security;

create policy "own skill allocations" on public.user_skills for select using (auth.uid() = user_id);
