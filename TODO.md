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
  - [x] **Mobile UI visually verified in a browser** *(2026-08-31)* — closed the long-standing blocker below. Ran `expo start --web` in this session's Linux container (the failure was Windows MAX_PATH friction with a deep scratchpad path, not the repo) and drove the app with Playwright/Chromium: splash → all 13 onboarding screens → dashboard → habit completion → profile → sign-out, **zero console errors**. Two real bugs surfaced that typecheck could never have caught — see the `fix(categories)` commit and the Phase 1 notes below.

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
- [x] **Streak/day-completion primitives** *(2026-08-31)* — `dayCompletionPct`, `isPerfectDay`, `isSameCalendarMonth`, `FREEZES_PER_MONTH_*` in `game-engine/streaks.ts`; `LINKED_STATS_BY_CATEGORY` / `linkedStatsForCategory` / `consistencyScore` in `stats.ts`; `CATEGORY_IDS` in `classes.ts` as the single habit-category vocabulary. 96/96 tests green (was 71).
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
- [x] **Auth flow** — Supabase Auth: magic link, email+password, Google. **Login *and* registration both real as of 2026-08-31** (see the Phase 1 note below for what registration was doing wrong until then). Apple sign-in is the one piece of §107's list still unbuilt. Magic link closed end-to-end *(2026-08-28)*: `app/auth/callback.tsx` (a real Expo Router route, so cold/warm-start deep links both work with no manual `Linking` listener) exchanges the PKCE `code` via `lib/auth-flow.ts`, then calls `bootstrap-profile` (relaxed to not require `username` for an already-existing profile — a genuine returning-user case) and lands on the dashboard with the real account. Also fixed two real bugs found closing this out: (1) the Supabase client had no `storage` option, so `persistSession: true` was silently falling back to `localStorage` (doesn't exist in RN) — sessions never actually survived an app restart; (2) the MMKV-backed fix for that crashed Expo Router's web SSR pass outright (`react-native-mmkv` throws when touched outside a client context, and `createClient`/`getSession()` both run at module scope) — wrapped in try/catch, verified live via direct `curl` + the browser once fixed. **Password + Google added** *(2026-08-28, continuation 7 — Julien asked directly)*: `auth.tsx` now has email+password (sign-in/sign-up toggle, handles Supabase's email-confirmation-required case) and a Google button (`expo-web-browser`'s `openAuthSessionAsync`, same `/auth/callback` route as magic link since both are PKCE `?code=` redirects) — turns out this wasn't actually a CDC deviation, see the screen's own file header: CDC §107 always listed "magic link + Apple/Google", "magic link only for now" was this codebase's own earlier scoping choice. Verified live: real `signInWithPassword` call against the actual Supabase project correctly surfaced "Invalid login credentials" with no crash. Still needed from Julien: (1) register `winterarc://` in the Supabase dashboard's Auth → URL Configuration → Redirect URLs; (2) a Google OAuth client (Google Cloud Console) wired into Auth → Providers → Google — neither reachable from this session's tools, and (2) can't be exercised end-to-end without it. Apple sign-in is the one piece of §107's original list still not built.
- [x] **`quest_definitions.condition` DSL** — `game-engine/quests.ts`, evaluates to 0-100 progress (not boolean, quests are period-tracked). `_shared/quest-progress.ts` builds the context from `habit_logs`. *(2026-08-28)*
- [x] **Active-boosts table** (XP Elixir/Feast, CDC §25) — `active_boosts` table exists and is applied (migration `20260828010000`). `award-habit-xp` still hard-codes `hasXpElixir`/`hasXpFeast` to `false` — the table exists but isn't queried yet, next pass.
- [x] **`user_skills` table** (Skill Point allocation, CDC §22) — migration `20260828010100`, applied, pairs with `game-engine/skills.ts`'s 16-node catalog. `spend-skill-point` Edge Function itself still not written.
- [~] **Local migration verification** *(2026-09-01)* — `scripts/verify-migrations.sh` spins up a throwaway Postgres 16, applies the whole chain + seeds, and asserts the data migrations, their rollbacks, idempotency, and that the SQL weight tables match the game-engine catalog. Not a full `supabase init` stack (RLS is created but never *enforced* — everything runs as superuser; `auth` is stubbed; pg_cron/pg_net are skipped), but it means migrations stop being handed over having never executed anywhere. A real local stack is still worth having.
- [ ] **`supabase init`** — no local Supabase dev stack yet. Deno CLI installed this session (used to `deno check` every new Edge Function against an isolated sandbox — see SESSION-LOG) but that's not the same as a running local Postgres to test SQL against.

---

## Phase 1 — MVP core (CDC §135)

Goal: usable solo, full loop Arc → habits → XP → level → achievement. Ships as closed beta (TestFlight + Internal Testing). Wireframes for every screen below: `docs/wireframes.md`.

- [x] Onboarding — full 13-screen sequence (CDC §9, wireframed) *(2026-08-28; visually verified end to end 2026-08-31 — clicks through splash → 13 screens → dashboard with no console errors)*
- [~] Arc creation & lifecycle (default 90 days, difficulty tiers) — **creation now persisted** *(2026-08-28)*: `bootstrap-profile` creates a real `arcs` row (90 days from today, difficulty from onboarding), links newly-created habits to it via `arc_id`, and the mobile `app-store` stores it (real row when cloud-synced, a structurally-identical synthetic one in demo mode) — Dashboard shows "WINTER ARC · DAY X / 90". Full *lifecycle* (pause/complete/vacation mode, CDC §37) is still unbuilt — this closes creation only.
- [~] Habits — 5 types, completion → `award-habit-xp` call. Only `boolean`-shaped completion exists in the UI so far (tap-to-complete on the dashboard); numeric/duration/counter/distance input UIs aren't built. **Now actually calls the real `award-habit-xp`** when signed in (2026-08-28) — `app-store.ts`'s `completeHabit` branches on `isCloudSynced`; falls back to local-optimistic math on any API failure (not a full retry queue, see the store's file header)
- [x] Dashboard — header, today hero, habit list *(2026-08-28)*. Daily/weekly quests **now real** *(2026-08-28)*: `rotate-quests` cron written (assigns 3 daily + 3 weekly `user_quests` instances from `supabase/seed/004_quest_definitions.sql`'s pool), Dashboard reads them via TanStack Query (`hooks/use-quests.ts`, first real use of the stack's designated server-state library) and can attempt-claim inline. Weekly Progress bar / Boss card (CDC §14 Zones 5-6, distinct from the weekly quest list) still need per-day completion history this local-only store doesn't track — omitted rather than faked, same reasoning as before.
- [~] XP + Levels up to 50, level-up modal — level math (game-engine) and the level-up overlay both exist and are wired to the dashboard; not yet tested past level ~2-3 by hand since there's no way to fast-forward without a debug tool
- [ ] Streaks + Streak Freeze + Recovery Day + Comeback experience (wireframed) — streak *count* is real (advanceStreak wired into completeHabit), Freeze/Recovery Day/Comeback screen are not built
- [x] 30 achievements — catalog seeded (`supabase/seed/003`), `evaluate-achievements` wired into `award-habit-xp`/`claim-quest`, and now displayed *(2026-08-28)*: `AchievementUnlockGate` drains a FIFO queue on app-store (`pendingAchievementIds`) — Common/Uncommon get a bottom toast, Rare+ a full-screen overlay (wireframes.md's split), both fetched via a plain `achievements` table read (public RLS). Also fixed a real gap found while wiring this: `useClaimQuest` wasn't applying its own XP/coins reward to app-store at all (only invalidated the quests query) — it does now.
- [x] **Basic stats — 7-stat radar chart** *(2026-08-31)* — `StatRadar`/`StatBar` in ui-primitives (SVG heptagon, hairline rings, out-expo grow-in) + `hooks/use-stats.ts` + `app/profile.tsx`, reached by tapping the dashboard nameplate. Cloud mode reads real `habit_logs` history with per-stat decay; demo mode shows today's local completions. §28's timeline and per-stat heatmap need day-by-day history this screen doesn't fetch — omitted, not approximated.
- [ ] Notifications — habit reminders, streak alerts, level up, achievement unlocked
- [~] Cosmetics essentials — catalog seeded (`supabase/seed/002`); the profile screen now *displays* the equipped identity (class, palette, title, arc) but the equip picker and an `equip-cosmetic` Edge Function are still unbuilt
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

- **2026-08-31** — Julien asked to pick the project up where it stood, then to finish login/register. Three things came out of it. (1) **First real visual verification** in the project's history: `expo start --web` runs fine on Linux (the old blocker was a Windows path-length problem, not the repo), and a Playwright drive-through of splash → 13 onboarding screens → dashboard → profile → sign-out reports zero console errors. (2) **Two silent bugs in `award-habit-xp`** — the `streaks` row was read snake_case into a camelCase type, so every streak count went to NaN on the first completion for every account, and `advanceStreak` was fed one habit's completion as the whole day's rate, so a single habit held even an `extreme` 95% streak. Both writers of that row now share `_shared/day-history.ts`. (3) **Three competing habit-category vocabularies** collapsed into one (`CATEGORY_IDS`): onboarding stored display labels, `classes.ts` stored stat names, `stats.ts` keyed on domain ids — so the Monk's and Ranger's +15% synergy could never fire on anything, and the 7-stat radar read flat. Also shipped the profile screen and radar itself, `linked_stats` population (the stat computation had no input at all), and real registration — every sign-in method used to funnel new accounts into a junk "wanderer" profile and skip onboarding. Plus sign-out, which existed nowhere, and password recovery. 96/96 tests, 2 migrations with rollbacks.

- **2026-08-28 (continuation 7)** — Julien asked for password + Google sign-in too. Checked the CDC first rather than assuming it was another deviation like the last auth ask — turns out §107's architecture always said "magic link + Apple/Google", so this closes a real gap rather than contradicting the spec. `auth.tsx` now offers all three (password primary with a sign-in/sign-up toggle, Google via `expo-web-browser`, magic link tucked behind a link), sharing the same `/auth/callback` PKCE-exchange route for both Google and magic link. Verified the password path live against the real Supabase project (a wrong-password attempt correctly surfaced "Invalid login credentials", no crash) — Google itself can't be exercised until Julien wires a Google OAuth client into the Supabase dashboard.
- **2026-08-28 (continuation 6)** — Julien asked to finish the auth flow: real login, DB storage, working end-to-end. Confirmed with him first that CDC §10's magic-link-only design (no password field) was still the intent, then closed both documented gaps from `auth.tsx`'s file header — the redirect deep link now lands on a real route (`app/auth/callback.tsx`) that exchanges the PKCE code and bootstraps the returning user's real profile onto the dashboard. Found two real bugs while wiring this: the Supabase client was persisting sessions to a storage backend (`localStorage`) that doesn't exist in React Native, and the MMKV-backed fix for that crashed the web dev server's SSR pass outright until guarded — both would have silently or loudly broken sign-in persistence. Verified live (direct `curl` against the Metro server plus the browser), not just typecheck.
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
