# TODO.md — Winter Arc Living Roadmap

> **How this file works.** Claude reads top-to-bottom, picks the first unblocked item under 🔥 Next Up, works, ships, strikes it. New sub-tasks discovered during the work go inline under their parent. Blockers move to 🚧. Done tasks move to ✅ Recently Shipped (keep last 30, prune older into `docs/changelog.md`).
>
> Full spec: `docs/cahier-des-charges.md` (CDC v2.0). Phase numbering below matches CDC §134-140.

Legend: `[ ]` open · `[~]` in progress · `[x]` done · `[!]` blocked

---

## 🚧 Blockers (address first, or route to DECISION-NEEDED)

- `[!]` **Supabase staging project creation blocked** — the account is at the 2-project free-tier limit across orgs where Julien is admin/owner. Need Julien to delete/pause/upgrade an existing project, or point us at an org with headroom, before `supabase/migrations/` can be applied anywhere. See SESSION-LOG 2026-08-27.
- `[!]` **`.claude/skills/` referenced but missing** — CLAUDE.md §6 and README-AUTOMATION.md describe 10 SKILL.md files (`cinematic-ui`, `supabase-ops`, `git-discipline`, etc.) that were never committed to this repo. Do not fabricate their contents — flag and either ask Julien for the originals or draft them from CDC sections as the domains are actually touched.

---

## 🔥 Next Up — Phase 0: Foundation (CDC §134)

### Monorepo & tooling

- [ ] **Init monorepo skeleton** — Turborepo + pnpm workspaces, `apps/{mobile,api,admin}`, `packages/{ui-primitives,game-engine,shared-types,shared-utils}`, root Biome config, root tsconfig (strict + path aliases), root `.gitignore`, GitHub Actions CI stub (typecheck + lint + test on push).
- [ ] **NestJS API boilerplate** (`apps/api`) — Nest 10+, TypeScript strict, module skeleton per CDC §107 (start with `auth`, `users`, `profiles` only — the rest of the 25+ modules get scaffolded as their features land), Prisma wired to the Supabase Postgres connection string, `/api/v1` versioning, Swagger/OpenAPI auto-gen, global validation pipe (class-validator).
- [ ] **Expo app bootstrap** (`apps/mobile`) — SDK 54, TS strict, Expo Router v4, absolute imports, dark-only theme lock, splash `#05070A`, bundle IDs `com.winterarc.app` / `com.winterarc.app.dev`.

### Design & domain

- [ ] **`packages/ui-primitives`** — `tokens.ts` (Frost palette + spacing + radii + type scale + motion presets), `<Text>`, `<Surface>`, `<Hairline>`, `<XPOrb>` placeholder.
- [ ] **`packages/game-engine`** — pure TS, no framework imports, importable from both `apps/api` and `apps/mobile` (offline-optimistic calc). `xp.ts` (CDC §20 formula: `round(500 × n^1.35)`), `levels.ts`, `prestige.ts` (CDC §23), `streaks.ts` (CDC §40-42), `achievements.ts` (condition evaluator, CDC §44), `classes.ts` (CDC §29 bonuses). 100% unit test coverage required — this is the game math, it cannot be wrong.

### Data & auth

- [ ] **Supabase staging project** — blocked, see 🚧 above.
- [ ] **Initial Prisma schema + migration** — core MVP tables per CDC §108 + Phase 1 scope: `profiles` (extends `auth.users`, holds progression state + equipped cosmetics), `arcs`, `habits`, `habit_logs`, `xp_transactions`, `user_currency`, `streaks`, `classes` (reference data), `cosmetics` (catalog), `user_cosmetics`, `loadouts`, `achievements`, `user_achievements`, `titles`, `quests` (daily/weekly/monthly/boss instances), `quest_progress`. RLS on every table (owner-only read/write on personal data). Rollback file required (repo git-discipline).
- [ ] **Auth flow** — Supabase Auth, magic link + Apple/Google (Apple mandatory for App Store). One screen: void background, mono `WINTER ARC` wordmark, single input, single button.
- [ ] **Typed API client** (`packages/shared-types` + mobile `services/`) — DTOs shared between `apps/api` and `apps/mobile`, generated or hand-typed from the Nest controllers; a hook per resource (`useProfile`, `useHabits`, `useXPLedger`...).

---

## Phase 1 — MVP core (CDC §135)

Goal: usable solo, full loop Arc → habits → XP → level → achievement. Ships as closed beta (TestFlight + Internal Testing).

- [ ] Onboarding — full 13-screen sequence (CDC §9): welcome, manifesto, avatar, palette, username, domains, goals, suggested habits, difficulty, class, Arc recap, permissions, first reward.
- [ ] Arc creation & lifecycle (default 90 days, difficulty tiers CDC §9 Écran 9)
- [ ] Habits — 5 types (boolean, numeric, duration, counter, distance), completion → XP grant (CDC §31-32)
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

- [ ] Squads — create/join, squad feed, squad leaderboard (CDC §78-79)
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

- [ ] AI Coach, full health integrations, companion web app
- [ ] Public Guilds (shipped), live events
- [ ] Coach-created programs marketplace, custom cosmetics (color picker, upload)

## Phase 5 — V3 (CDC §139)

- [ ] Full creator marketplace, signature cosmetics, IRL events, generative AI, 10+ language localization, program editor

---

## ✅ Recently Shipped

- **2026-08-27** — CDC v2.0 ingested into `docs/cahier-des-charges.md`; CLAUDE.md tech stack (§3) and repo layout (§4) updated to match (NestJS + Prisma backend added); this TODO rewritten around the CDC's phased roadmap.

---

## 📌 Standing Guardrails (never ignore)

- If a task would break the Design Law in `CLAUDE.md §5`, reshape the task before doing it.
- If a task changes the DB schema, it must ship with a rollback file.
- If a task adds a dependency, justify it in the commit message (why not stdlib / existing dep).
- If you're about to write your third `Modal` component, stop and refactor to a shared one first.
- Mobile never computes official XP — it sends events, `apps/api` computes and validates (CDC §127). This is non-negotiable, not a perf shortcut to revisit later.
