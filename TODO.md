# TODO.md — Winter Arc Living Roadmap

> **How this file works.** Claude reads top-to-bottom, picks the first unblocked item under 🔥 Next Up, works, ships, strikes it. New sub-tasks discovered during the work go inline under their parent. Blockers move to 🚧. Done tasks move to ✅ Recently Shipped (keep last 30, prune older into `docs/changelog.md`).
>
> Full spec: `docs/cahier-des-charges.md` (CDC v2.1 — amended 2026-08-28: no NestJS, no web companion, Expo iOS/Android only, Supabase is the whole backend). Phase numbering below matches CDC §134-140.
>
> **Supabase workflow, per Julien's instruction (2026-08-28):** Claude writes `.sql` migration files under `supabase/migrations/` and stops there. Julien applies them himself (Supabase dashboard / CLI / MCP on his side) — Claude does not create projects or apply migrations. Every DB-touching task below ends at "write the .sql", not "run it".

Legend: `[ ]` open · `[~]` in progress · `[x]` done · `[!]` blocked

---

## 🚧 Blockers (address first, or route to DECISION-NEEDED)

- `[!]` **`.claude/skills/` referenced but missing** — CLAUDE.md §6 and README-AUTOMATION.md describe 10 SKILL.md files (`cinematic-ui`, `supabase-ops`, `git-discipline`, etc.) that were never committed to this repo. Do not fabricate their contents — flag and either ask Julien for the originals or draft them from CDC sections as the domains are actually touched.

---

## 🔥 Next Up — Phase 0: Foundation (CDC §134)

### Monorepo & tooling

- [x] **Init monorepo skeleton** — Turborepo + pnpm workspaces, root Biome config, root tsconfig (strict + path aliases), root `.gitignore`, GitHub Actions CI stub (typecheck + lint + test on push). *(2026-08-27)*
- [x] **Expo app bootstrap** (`apps/mobile`) — SDK 57, TS strict, Expo Router, `expo-router/entry`. *(2026-08-28, via `create-expo-app`)*
- [ ] **Re-brand the Expo scaffold** — the default template ships generic tab-nav screens (`explore.tsx`, `index.tsx`), its own `AGENTS.md`/`CLAUDE.md`/`.claude/` (Expo's generic agent boilerplate, not ours — remove or fold into root docs so there's one source of truth), placeholder icons/splash. Needs: `app.json` → name "Winter Arc", slug `winter-arc`, scheme `winterarc` (CDC §95 deep links), bundle IDs `com.winterarc.app` / `com.winterarc.app.dev`, splash `#05070A`, `userInterfaceStyle: "dark"` (no system theme switch, CDC/CLAUDE.md Design Law).
- [ ] **`pnpm install` at root + verify `turbo run typecheck/lint/test` all green** before building on top of the skeleton.

### Design & domain

- [x] **`packages/game-engine`** — pure TS, no framework imports. `xp.ts` (CDC §20 formula, literally: `round(500 × n^1.35)` — the CDC's own illustrative table doesn't reconcile with its own formula, see code comment), `multipliers.ts` (CDC §19 XP bonus stack), `streaks.ts` (CDC §40-42: extend/break/freeze/comeback), `prestige.ts` (CDC §23-24), `classes.ts` (CDC §29 synergy bonuses). Full Vitest suite. *(2026-08-28)*
  - [ ] `achievements.ts` — condition evaluator. Deferred: the CDC gives achievements a `condition: JSON` field but never specifies its shape. Needs a DECISION-NEEDED or a concrete first batch of conditions to design against, not a guessed DSL.
- [ ] **`packages/ui-primitives`** — `tokens.ts` (Frost palette + spacing + radii + type scale + motion presets, straight from `CLAUDE.md §5`), `<Text>`, `<Surface>`, `<Hairline>`, `<XPOrb>` placeholder.
- [ ] **`packages/shared-types`** — payload/response types for each Edge Function in CDC §107, plus row types re-exported from `supabase gen types typescript` once a project exists.
- [ ] **`packages/shared-utils`** — date helpers (Arc day math, streak date-diffing — `game-engine/streaks.ts` already needs this, extract it), formatters.

### Data & backend (Supabase-only, CDC §107)

- [x] **Core schema — `.sql` migration** — 25 tables (profiles, arcs, habits, habit_logs, xp_transactions, user_currency, streaks, classes, cosmetics, user_cosmetics, loadouts, achievements, user_achievements, quest_definitions, user_quests, chests, battle_passes, seasons, squads, squad_members, challenges, challenge_participants, journal_entries, mood_checkins, audit_logs), RLS on every table, rollback file. *(2026-08-27, `supabase/migrations/20260827000000_init_core_schema.sql` — written, not applied; Julien applies it himself)*
- [ ] **Seed data — `.sql`** — the 7 `classes` rows (CDC §29 table) and a small starter `cosmetics`/`achievements`/`titles` catalog (CDC §135 Phase 1 scope: 12 avatars, 8 frames, 6 auras, 6 banners, 20 titles, 5 themes, 30 achievements) so the MVP loop has something to unlock against. Write as `supabase/seed/`, not a migration.
- [ ] **First Edge Functions** (`supabase/functions/`, CDC §107) — scaffold `_shared/` (Supabase admin client, auth helpers, JSON response helpers) then `award-habit-xp` (the one the whole MVP loop depends on: habit completion → `game-engine` XP calc → `xp_transactions` + `habit_logs` + `streaks` write). Write as plain Deno/TS files; Julien deploys (`supabase functions deploy`) himself, same as the migrations.
- [ ] **Auth flow** — Supabase Auth, magic link + Apple/Google (Apple mandatory for App Store). One screen: void background, mono `WINTER ARC` wordmark, single input, single button.

---

## Phase 1 — MVP core (CDC §135)

Goal: usable solo, full loop Arc → habits → XP → level → achievement. Ships as closed beta (TestFlight + Internal Testing).

- [ ] Onboarding — full 13-screen sequence (CDC §9): welcome, manifesto, avatar, palette, username, domains, goals, suggested habits, difficulty, class, Arc recap, permissions, first reward.
- [ ] Arc creation & lifecycle (default 90 days, difficulty tiers CDC §9 Écran 9)
- [ ] Habits — 5 types (boolean, numeric, duration, counter, distance), completion → `award-habit-xp` Edge Function call (CDC §31-32)
- [ ] Dashboard — header, today progress hero, habit list by time-of-day, daily quests, weekly progress, boss card (CDC §14)
- [ ] XP + Levels up to 50, level-up modal (CDC §17-21)
- [ ] Streaks + Streak Freeze + Recovery Day + Comeback experience (CDC §40-43)
- [ ] 30 achievements across categories (CDC §46)
- [ ] Basic stats — 7-stat radar chart, no sub-stats yet (CDC §26, §28)
- [ ] Notifications — habit reminders, streak alerts, level up, achievement unlocked (CDC §93)
- [ ] Cosmetics essentials — 12 avatars, 8 frames, 6 auras, 6 banners, 20 titles, 5 themes, 3 loadouts, basic profile editor (CDC §49-63, scoped)
- [ ] Coins (Embers deferred to Phase 2)
- [ ] 3 daily quests + 3 weekly quests (CDC §33-34)
- [ ] 1 monthly boss (CDC §35)
- [ ] End-of-day recap (CDC §16)

## Phase 2 — V1 (CDC §136)

Goal: public launch.

- [ ] Squads — create/join, squad feed, squad leaderboard via Supabase Realtime (CDC §78-79)
- [ ] Global challenges (CDC §83)
- [ ] Achievements extended to 100+, cosmetics extended to 100+
- [ ] Shop (rotating weekly/daily, permanent store) (CDC §72-73)
- [ ] Chests — Wooden, Iron, Silver (CDC §74)
- [ ] Custom Quests (CDC §37)
- [ ] Journal + Mood tracking (CDC §86-87)
- [ ] Advanced analytics + Insights engine (CDC §88-90)
- [ ] Widgets iOS/Android (CDC §94)
- [ ] Social share cards (CDC §96)
- [ ] Referral system (CDC §97)
- [ ] Prestige I-III (CDC §23), Skill Points + talent trees (CDC §22)
- [ ] Premium subscription (Free vs Premium, CDC §120), Embers currency (CDC §69-71)
- [ ] Battle Pass Season 1 (CDC §101)

## Phase 3 — V1.5 (CDC §137)

- [ ] Seasonal events, cosmetics to 300+, loadouts 5-10
- [ ] Full chest system + Fragments + Forge (CDC §76)
- [ ] Squad Quests (CDC §80)
- [ ] Public Guilds (draft), secret achievements, refined comeback experience
- [ ] Import: Habitica, Streaks, Apple/Google Health (draft) (CDC §12)

## Phase 4 — V2 (CDC §138)

- [ ] AI Coach, full health integrations
- [ ] Public Guilds (shipped), live events
- [ ] Coach-created programs marketplace, custom cosmetics (color picker, upload)

## Phase 5 — V3 (CDC §139)

- [ ] Full creator marketplace, signature cosmetics, IRL events, generative AI, 10+ language localization, program editor

---

## ✅ Recently Shipped

- **2026-08-28** — Architecture pivot per Julien: dropped NestJS + web companion from the CDC, CLAUDE.md, and TODO. Backend is Supabase-only (Postgres + Edge Functions + Realtime) from here on; DB work is `.sql` files Julien applies himself, Claude doesn't touch the Supabase project directly.
- **2026-08-28** — `apps/mobile` bootstrapped via `create-expo-app` (SDK 57). `apps/api` (NestJS scaffold) generated then deleted the same session, superseded by the pivot above.
- **2026-08-28** — `packages/game-engine` implemented: XP/level curve, multiplier stack, streak lifecycle, prestige, class synergy — full Vitest coverage.
- **2026-08-27** — CDC v2.0 ingested into `docs/cahier-des-charges.md`; CLAUDE.md tech stack (§3) and repo layout (§4) updated to match; this TODO rewritten around the CDC's phased roadmap; root monorepo config (Turborepo, pnpm, Biome, CI); initial 25-table Supabase schema written (unapplied).

---

## 📌 Standing Guardrails (never ignore)

- If a task would break the Design Law in `CLAUDE.md §5`, reshape the task before doing it.
- If a task changes the DB schema, it must ship with a rollback file — and stays as an unapplied `.sql` file for Julien to run himself, per his 2026-08-28 instruction.
- If a task adds a dependency, justify it in the commit message (why not stdlib / existing dep).
- If you're about to write your third `Modal` component, stop and refactor to a shared one first.
- Mobile never computes official XP — it calls the relevant Edge Function, which computes and validates via `game-engine` (CDC §127). This is non-negotiable, not a perf shortcut to revisit later.
- No NestJS, no web companion, no `apps/` entry besides `mobile/` — re-litigating this is a DECISION-NEEDED, not a default.
