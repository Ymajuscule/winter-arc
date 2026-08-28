# TODO.md — Winter Arc Living Roadmap

> **How this file works.** Claude reads top-to-bottom, picks the first unblocked item under 🔥 Next Up, works, ships, strikes it. New sub-tasks discovered during the work go inline under their parent. Blockers move to 🚧. Done tasks move to ✅ Recently Shipped (keep last 30, prune older into `docs/changelog.md`).
>
> Full spec: `docs/cahier-des-charges.md` (CDC v2.1 — amended 2026-08-28: no NestJS, no web companion, Expo iOS/Android only, Supabase is the whole backend). Phase numbering below matches CDC §134-140. Companion docs required by CDC Annexe C now exist: `docs/architecture-technique.md`, `docs/schema-postgresql.md`, `docs/api-specifications.md`, `docs/design-system.md`, `docs/wireframes.md`.
>
> **Supabase workflow — amended 2026-08-28 (evening):** the Supabase connector is now linked. Project `winter-arc-staging` exists (org "Habits Tracker", eu-west-3, ref `hexoluuqagxhplrgfsme`) — all 5 migrations applied, all 3 seeds loaded (7 classes / 57 cosmetics / 30 achievements), all 6 Edge Functions deployed and ACTIVE, `pg_cron`+`pg_net` enabled with `advance-streak` scheduled nightly at 03:00 (secret in `vault`). The "Claude writes, Julien applies" rule still governs *new* migrations/functions going forward, but the current DB state is live, not "written, unapplied" — see SESSION-LOG.md for full detail (keys, project ref, the one accepted advisory).
>
> **On open gaps, per Julien's instruction (2026-08-28, "débrouille-toi"):** default to deciding and documenting the reasoning inline, rather than escalating every ambiguity as a blocker. Escalate only what's genuinely his call (money, external account limits, a product direction the CDC contradicts itself on). See the `todo-manager` skill.

Legend: `[ ]` open · `[~]` in progress · `[x]` done · `[!]` blocked

---

## 🚧 Blockers

_(none open right now — the two standing ones from 2026-08-27/28 are resolved: `.claude/skills/` is written, Supabase project access is moot under the "Julien applies it himself" workflow)_

---

## 🔥 Next Up — Phase 0: Foundation (CDC §134)

### Monorepo & tooling

- [x] **Init monorepo skeleton** *(2026-08-27)*
- [x] **Expo app bootstrap** (`apps/mobile`) — SDK 57, rebranded (name/scheme/bundle id/splash/dark-lock). *(2026-08-28)*
- [x] **Re-skin the default Expo tab screens into real Winter Arc screens.** *(2026-08-28)* Deleted the entire `create-expo-app` demo (tabs, themed-text/view, animated-icon, hint-row, web-badge, collapsible) and built the real thing: Splash (root `index.tsx`), the full 13-screen onboarding (CDC §9), Dashboard (CDC §14), Day Recap (CDC §16), a Level Up overlay, and an Auth screen stub. See SESSION-LOG.md for what's genuinely wired vs. scoped-out placeholders (documented at each cut's source, not hidden) — notably: no video/Skia assets (text-only Splash, flat-color Frame/Aura), palette selection doesn't live-retheme yet, Daily Quests/Weekly Progress/Boss are honest empty states rather than fabricated data (`rotate-quests` isn't written).
- [x] **`pnpm install` at root + `turbo run typecheck/lint/test` all green.** *(2026-08-28 — 71/71 tests, Biome clean, tsc clean across `game-engine`/`ui-primitives`/`apps/mobile`.)* The 2 pre-existing template typecheck errors are gone — they lived in files deleted in the re-skin above, not fixed around.
  - [!] **Could not visually verify the mobile UI in a browser/simulator this session** — `expo start --web` fails in this session's sandbox: pnpm creates symlinks in `node_modules/.pnpm` with a mangled `/tmp/...` target (confirmed via `readlink`, reproducible across multiple clean reinstalls, both from the Bash tool and PowerShell) that Node can't resolve on Windows, breaking Metro's dependency graph (`@babel/types` -> `@babel/helper-validator-identifier`). Root cause looks like Windows MAX_PATH (260 char) friction combined with this session's unusually deep scratchpad path (`rmdir`/`Remove-Item` also silently fail to fully delete `node_modules` here) — did not reproduce for `tsc`/`vitest`/Biome, which don't walk the same symlink chain. Everything shipped this session is typecheck+lint verified but **not** runtime/visually verified — next session (or Julien, on a normal-length path) should run `pnpm --filter @winterarc/mobile start --web` or `expo start` and actually click through the onboarding→dashboard flow before trusting it fully.

### Design & domain

- [x] **`packages/game-engine`** — xp/multipliers/streaks/prestige/classes, full Vitest suite. *(2026-08-28)*
  - [x] `achievements.ts` — condition evaluator DSL, decided directly per Julien's "débrouille-toi" (2026-08-28). 30-achievement seed catalog built against it (`supabase/seed/003_achievements.sql`).
  - [x] `quests.ts` — quest_definitions.condition progress DSL (0-100, not boolean — quests are period-tracked). *(2026-08-28)*
  - [x] `stats.ts` — 7-stat computation from `habits.linked_stats` × `habit_logs`, saturating curve + 14-day decay rule (CDC §26). *(2026-08-28)*
  - [x] `skills.ts` — 16-node Skill Point talent tree catalog (CDC §22), pairs with `user_skills` table. *(2026-08-28)*
  - [x] `chests.ts` — chest rarity rolls + Fragment values (CDC §74, §76), rarity odds decided directly (flagged as open in api-specifications.md). *(2026-08-28)*
  - [x] `STREAK_THRESHOLD_BY_DIFFICULTY` added to `streaks.ts` — closes the "hard-coded 60" TODO that lived in `award-habit-xp`'s own file header. *(2026-08-28)*
  - 71/71 tests green, 100% behavioral coverage maintained per the rpg-mechanics skill.
- [x] **`packages/ui-primitives`** — tokens.ts (Frost palette, spacing, radii, type, motion) + `Surface`/`Hairline`/`Text`. *(2026-08-28)*
  - [x] `XPOrb`, `Frame`, `Aura`, `StreakFlame`, `XPBar`, `LevelBadge`, `Nameplate`, `Emblem`, `Sigil` + 3 custom SVG icons. *(2026-08-28)* Frame/Aura are flat-color placeholders, not the Skia particle versions — documented in each file, needs `mobile-performance` coordination per the winter-arc-design-system skill before that upgrade.
  - [x] Fonts loaded via `expo-font` + 3 `@expo-google-fonts` packages (JetBrains Mono, Inter, Inter Tight). *(2026-08-28)* `display` variant renders in the Inter Tight fallback, not Neue Haas Grotesk (no license file available) — Text.tsx's comment says exactly what to change if Julien provides one.
- [x] **`packages/shared-types`** — payload/response types for each Edge Function (`docs/api-specifications.md`). *(2026-08-28)* `bootstrap-profile`'s response is still loosely typed (raw rows) — full row types from `supabase gen types typescript` are a follow-up now that a project exists to generate against.
- [ ] **`packages/shared-utils`** — extract `daysBetween` out of `game-engine/streaks.ts` into here once a second consumer needs it; don't extract preemptively for a single caller.

### Data & backend (Supabase-only, CDC §107)

- [x] **Core schema — `.sql` migration** — 25 tables, RLS, rollback file. *(2026-08-27, applied 2026-08-28 evening — `winter-arc-staging` project)*
- [x] **Seed data — `.sql`** — 7 classes, 12 avatars, 8 frames, 6 auras, 6 banners, 5 themes, 20 titles, 30 achievements. *(2026-08-28, `supabase/seed/001-003`, applied)*
- [x] **First Edge Function: `award-habit-xp`** — the MVP loop's core write path. *(2026-08-28, written and deployed, ACTIVE)*
- [x] **`evaluate-achievements`** — built as a shared helper (`_shared/evaluate-achievements.ts`), called internally by `award-habit-xp`/`claim-quest` rather than deployed as its own function (api-specifications.md says it's function-internal, not a public route — see the helper's file header for the reasoning). Several context fields are documented gaps defaulted to "never falsely unlocks" (no metric-tracking table, no encouragements/challenge-winner tables yet). *(2026-08-28, bundled into every function that calls it)*
- [x] **`claim-quest`, `apply-prestige`, `open-chest`, `shop-purchase`, `advance-streak` (pg_cron)** — all written and deployed, ACTIVE. *(2026-08-28)*
  - `shop-purchase` is scoped to cosmetics only — CDC §72's non-cosmetic permanent purchases (Recovery Day, habit slot, skill respec) have no backing schema yet, DECISION-NEEDED on where that lives.
  - `advance-streak` is scheduled: `pg_cron` job `advance-streak-nightly` runs `0 3 * * *`, secret stored in `vault` and passed as `X-Cron-Secret`. **The Edge Function's own `CRON_SECRET` secret still needs setting** (dashboard or `supabase secrets set`, not settable via MCP) — see SESSION-LOG.md for the exact value.
  - Found and fixed a real gap while building `apply-prestige`: added `profiles.lifetime_xp` (migration `20260828010300`) since the schema only had one `total_xp` column doing double duty as both "cumulative" and "what leveling reads" — prestige couldn't reset level without it disagreeing with total_xp on the very next XP grant.
- [x] **Idempotency on mutating Edge Functions** — `_shared/idempotency.ts`, wired into every function above via an optional `Idempotency-Key` header. Only caches success (<300) so a failed attempt can still retry. *(2026-08-28)*
- [~] **Auth flow** — Supabase Auth, magic link + Apple/Google. Screen UI built and now calls the real `signInWithOtp` (2026-08-28). Two things still needed, both noted in the file: (1) the `winterarc://` redirect URL must be registered in the Supabase dashboard's Auth → URL Configuration (not settable via the MCP tools this session has); (2) nothing in the app parses an incoming `winterarc://auth/callback` deep link yet to actually exchange it for a session — `session-store.ts` will pick the session up once one exists, but the link-handling itself isn't wired. Apple/Google buttons not added (need their own OAuth setup).
- [x] **`quest_definitions.condition` DSL** — `game-engine/quests.ts`, evaluates to 0-100 progress (not boolean, quests are period-tracked). `_shared/quest-progress.ts` builds the context from `habit_logs`. *(2026-08-28)*
- [x] **Active-boosts table** (XP Elixir/Feast, CDC §25) — `active_boosts` table exists and is applied (migration `20260828010000`). `award-habit-xp` still hard-codes `hasXpElixir`/`hasXpFeast` to `false` — the table exists but isn't queried yet, next pass.
- [x] **`user_skills` table** (Skill Point allocation, CDC §22) — migration `20260828010100`, applied, pairs with `game-engine/skills.ts`'s 16-node catalog. `spend-skill-point` Edge Function itself still not written.
- [ ] **`supabase init`** — no local Supabase dev stack yet. Deno CLI installed this session (used to `deno check` every new Edge Function against an isolated sandbox — see SESSION-LOG) but that's not the same as a running local Postgres to test SQL against.

---

## Phase 1 — MVP core (CDC §135)

Goal: usable solo, full loop Arc → habits → XP → level → achievement. Ships as closed beta (TestFlight + Internal Testing). Wireframes for every screen below: `docs/wireframes.md`.

- [x] Onboarding — full 13-screen sequence (CDC §9, wireframed) *(2026-08-28, UI built and typecheck/lint-verified, not yet visually verified — see the Foundation section's `[!]` note)*
- [~] Arc creation & lifecycle (default 90 days, difficulty tiers) — **creation now persisted** *(2026-08-28)*: `bootstrap-profile` creates a real `arcs` row (90 days from today, difficulty from onboarding), links newly-created habits to it via `arc_id`, and the mobile `app-store` stores it (real row when cloud-synced, a structurally-identical synthetic one in demo mode) — Dashboard shows "WINTER ARC · DAY X / 90". Full *lifecycle* (pause/complete/vacation mode, CDC §37) is still unbuilt — this closes creation only.
- [~] Habits — 5 types, completion → `award-habit-xp` call. Only `boolean`-shaped completion exists in the UI so far (tap-to-complete on the dashboard); numeric/duration/counter/distance input UIs aren't built. **Now actually calls the real `award-habit-xp`** when signed in (2026-08-28) — `app-store.ts`'s `completeHabit` branches on `isCloudSynced`; falls back to local-optimistic math on any API failure (not a full retry queue, see the store's file header)
- [x] Dashboard — header, today hero, habit list *(2026-08-28)*. Daily/weekly quests **now real** *(2026-08-28)*: `rotate-quests` cron written (assigns 3 daily + 3 weekly `user_quests` instances from `supabase/seed/004_quest_definitions.sql`'s pool), Dashboard reads them via TanStack Query (`hooks/use-quests.ts`, first real use of the stack's designated server-state library) and can attempt-claim inline. Weekly Progress bar / Boss card (CDC §14 Zones 5-6, distinct from the weekly quest list) still need per-day completion history this local-only store doesn't track — omitted rather than faked, same reasoning as before.
- [~] XP + Levels up to 50, level-up modal — level math (game-engine) and the level-up overlay both exist and are wired to the dashboard; not yet tested past level ~2-3 by hand since there's no way to fast-forward without a debug tool
- [ ] Streaks + Streak Freeze + Recovery Day + Comeback experience (wireframed) — streak *count* is real (advanceStreak wired into completeHabit), Freeze/Recovery Day/Comeback screen are not built
- [x] 30 achievements — catalog seeded (`supabase/seed/003`), `evaluate-achievements` wired into `award-habit-xp`/`claim-quest`, and now displayed *(2026-08-28)*: `AchievementUnlockGate` drains a FIFO queue on app-store (`pendingAchievementIds`) — Common/Uncommon get a bottom toast, Rare+ a full-screen overlay (wireframes.md's split), both fetched via a plain `achievements` table read (public RLS). Also fixed a real gap found while wiring this: `useClaimQuest` wasn't applying its own XP/coins reward to app-store at all (only invalidated the quests query) — it does now.
- [ ] Basic stats — 7-stat radar chart. Computation now exists (`game-engine/stats.ts`, 2026-08-28) and runs client-side (not an anti-cheat concern like XP, see the module's header) — no UI/chart built yet
- [ ] Notifications — habit reminders, streak alerts, level up, achievement unlocked
- [ ] Cosmetics essentials — catalog seeded (`supabase/seed/002`), profile editor UI + equip flow not built
- [ ] Coins (Embers deferred to Phase 2)
- [x] 3 daily quests + 3 weekly quests — full loop closed *(2026-08-28)*: condition DSL + `claim-quest` (written earlier) + `rotate-quests` (assigns from `supabase/seed/004_quest_definitions.sql`'s 5 daily/4 weekly pool, written this pass) + Dashboard UI (`hooks/use-quests.ts`). Selection is uniform-random over the generic pool, not CDC §33's fragile-habit/under-fed-stat personalization heuristic — decided directly (documented in `rotate-quests/index.ts`'s header) rather than block on building per-user habit-history analysis. `quest_definitions.class_id`-scoped rows aren't seeded yet either.
- [ ] 1 monthly boss
- [x] End-of-day recap (wireframed) *(2026-08-28)* — real numbers (habits/XP/streak/missed), "Best moment" dropped rather than faked (needs per-completion timestamps app-store doesn't track)

## Phase 2 — V1 (CDC §136)

- [ ] Squads — create/join, squad feed, squad leaderboard via Supabase Realtime
- [ ] Global challenges
- [ ] Achievements extended to 100+, cosmetics extended to 100+
- [ ] Shop, Chests (Wooden/Iron/Silver) — `open-chest`/`shop-purchase` now written (2026-08-28); shop UI + chest-opening ceremony (CDC §74) not built
- [ ] Custom Quests
- [ ] Journal + Mood tracking
- [ ] Advanced analytics + Insights engine
- [ ] Widgets iOS/Android
- [ ] Social share cards
- [ ] Referral system
- [ ] Prestige I-III, Skill Points + talent trees — `apply-prestige` written and `user_skills`/`skills.ts` catalog exist (2026-08-28); `spend-skill-point` Edge Function and both UIs still not built
- [ ] Premium subscription, Embers currency
- [ ] Battle Pass Season 1

## Phase 3 — V1.5 (CDC §137)

- [ ] Seasonal events, cosmetics to 300+, loadouts 5-10
- [ ] Full chest system + Fragments + Forge
- [ ] Squad Quests
- [ ] Public Guilds (draft), secret achievements, refined comeback experience
- [ ] Import: Habitica, Streaks, Apple/Google Health (draft)
- [ ] Sub-stats (CDC §27)

## Phase 4 — V2 (CDC §138)

- [ ] AI Coach, full health integrations
- [ ] Public Guilds (shipped), live events
- [ ] Coach-created programs marketplace, custom cosmetics (color picker, upload)

## Phase 5 — V3 (CDC §139)

- [ ] Full creator marketplace, signature cosmetics, IRL events, generative AI, 10+ language localization, program editor

---

## ✅ Recently Shipped

- **2026-08-28 (continuation 5)** — Julien asked to keep closing Phase 1 gaps. Fixed a real Metro bundling bug found while finally visually-verifying the app for the first time (`packages/*/src` barrels used `.js`-suffixed relative imports — fine for `tsc`/Deno, but Metro doesn't resolve them; stripped the extensions repo-wide) and upgraded local Node 20.18.0 → 22.23.2 (Supabase realtime needs native WebSocket). Then shipped two real Phase 1 features: Arc creation persistence (`bootstrap-profile` now creates a real `arcs` row and links habits to it) and the full daily/weekly quest loop (`rotate-quests` cron + a `quest_definitions` seed + `hooks/use-quests.ts` wiring the Dashboard to real quest data via TanStack Query — first real use of that designated-but-unused library). Verified live via `expo start --web` in the actual repo clone (not the sandbox), not just typecheck.
- **2026-08-28 (evening)** — Julien linked the Supabase connector and asked to finish the app/DB setup. Created `winter-arc-staging` (org "Habits Tracker", eu-west-3), applied all 5 migrations, loaded all 3 seeds, deployed all 6 Edge Functions (all ACTIVE), enabled `pg_cron`/`pg_net` and scheduled `advance-streak` nightly at 03:00 with its secret in `vault`. Wrote real credentials into `apps/mobile/.env` (gitignored). One accepted advisory: `pg_net` lives in the `public` schema and doesn't support `SET SCHEMA` (Postgres/Supabase packaging limitation, not fixable from here) — WARN-level, common across Supabase projects. **Still needed from Julien**: set the `CRON_SECRET` Edge Function secret (value in SESSION-LOG.md) — not settable via MCP.
- **2026-08-28** — Same session, continued into the mobile app: deleted the entire `create-expo-app` demo scaffold and built the real Winter Arc UI — fonts (3 Google Fonts packages), 9 new `ui-primitives` cosmetic components + 3 SVG icons, offline-first Zustand+MMKV stores, the full 13-screen onboarding, Dashboard, Day Recap, a Level Up overlay, and an Auth screen stub. `pnpm turbo run typecheck lint test` is green across all 3 packages (71/71 tests). **Not visually/runtime verified** — `expo start --web` couldn't run in this session's sandbox (Windows path-length issue breaking pnpm's symlinks under Metro specifically, unrelated to the code — see the Foundation section's `[!]` entry and SESSION-LOG.md for the full diagnosis). Next session should open this on a normal-length path and actually click through the flow before trusting it.
- **2026-08-28** — Julien asked directly to "intègre tout ce qui manque" — this pass closed nearly every open Phase 0 backend gap: `game-engine` gained `quests.ts`, `stats.ts`, `skills.ts`, `chests.ts` (4 new modules, 71/71 tests green); 4 new migrations (`active_boosts`, `user_skills`, `idempotency_keys`, `profiles.lifetime_xp`); 6 new/updated Edge Functions (`evaluate-achievements` as a shared helper, `claim-quest`, `apply-prestige`, `open-chest`, `shop-purchase`, `advance-streak`) plus idempotency wired into all of them. Also fixed `apps/mobile`'s `lint` script (was still `expo lint`, contradicting CLAUDE.md §3's Biome-only rule) and a pre-existing `@ts-nocheck` placement bug in `award-habit-xp`. Installed the Deno CLI this session specifically to `deno check` every new/touched Edge Function (with `@ts-nocheck` stripped in an isolated sandbox copy, never the real repo) instead of shipping them unverified — caught one real bug this way (a dynamically-built `.select()` string defeating Supabase's type inference). See SESSION-LOG.md for the full writeup, including the `lifetime_xp` schema gap found while implementing `apply-prestige`.
- **2026-08-28** — 5 CDC Annexe C companion docs written: `architecture-technique.md`, `schema-postgresql.md`, `api-specifications.md`, `design-system.md`, `wireframes.md`.
- **2026-08-28** — 10 `.claude/skills/` files drafted from the CDC/CLAUDE.md (cinematic-ui, winter-arc-design-system, supabase-ops, rpg-mechanics, mobile-performance, test-then-ship, todo-manager, git-discipline, winter-arc-architect, session-report), resolving the standing blocker.
- **2026-08-28** — `achievements.ts` condition DSL + 30-achievement / 20-title / 71-cosmetic seed catalog (`supabase/seed/`), decided directly rather than escalated.
- **2026-08-28** — Architecture pivot: dropped NestJS + web companion, Supabase-only backend, `.sql`/Edge Functions workflow where Julien applies/deploys himself.
- **2026-08-28** — `apps/mobile` bootstrapped (Expo SDK 57) and rebranded; `packages/game-engine` (XP/streaks/prestige/classes, 37 tests) and `packages/ui-primitives` (tokens + 3 primitives) built; first Edge Function `award-habit-xp` written.
- **2026-08-27** — CDC v2.0 ingested, CLAUDE.md/TODO aligned, monorepo skeleton, initial 25-table Supabase schema.

---

## 📌 Standing Guardrails (never ignore)

- If a task would break the Design Law in `CLAUDE.md §5`, reshape the task before doing it.
- If a task changes the DB schema, it must ship with a rollback file — and stays as an unapplied `.sql` file for Julien to run himself.
- If a task adds a dependency, justify it in the commit message.
- If you're about to write your third `Modal` component, stop and refactor to a shared one first.
- Mobile never computes official XP — it calls the relevant Edge Function, which computes and validates via `game-engine` (CDC §127).
- No NestJS, no web companion, no `apps/` entry besides `mobile/` — re-litigating this is a DECISION-NEEDED, not a default.
- When the CDC leaves something genuinely unspecified (a condition DSL, a probability table, a missing table), decide it yourself, document the reasoning where the decision lives (code comment, seed file header, or this file), and move on — per Julien's 2026-08-28 instruction. Only escalate categories 3/4 from `CLAUDE.md §8`.
