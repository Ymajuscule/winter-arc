# SESSION-LOG.md — Winter Arc Nightly Session History

> Newest at top. Each session appends one `## Session YYYY-MM-DD` block.
> See `.claude/skills/session-report/SKILL.md` for the entry format.

---

## Session 2026-08-28 (continuation 5, ad-hoc, same conversation as continuation 4 — Julien asked to actually wire the mobile app to the now-live backend rather than stop at "credentials configured")

### Done

- **Found and fixed the real missing piece**: nothing created a `profiles`/`user_currency`/`streaks` row for a new `auth.users` signup — every other Edge Function 404s on "Profile not found" without one. Wrote and deployed `bootstrap-profile` (idempotent per-table, grants the CDC §13 first reward directly: `title-awakened`, `frame-iron`, a new `day-zero` achievement added to both the live DB and `supabase/seed/003_achievements.sql`).
- **Fixed a catalog mismatch found in the same pass**: `apps/mobile`'s placeholder `AVATARS` used made-up ids that didn't match any seeded `cosmetics` row — would have been a foreign-key violation the first time `bootstrap-profile` tried to set `profiles.avatar_id`. Realigned to the 12 real seeded `avatar-*` ids.
- **Fixed a second real gap**: `award-habit-xp` never touched `user_currency` — Coins (CDC §70) would have silently stayed 0 forever through the real API. Added (easy/medium habit → +2, hard/extreme → +8), redeployed (v2, ACTIVE).
- **`packages/shared-types`**: request/response types for all 6 mobile-facing functions (not `advance-streak`, pg_cron-only; not `evaluate-achievements`, a shared helper). Reuses `LevelProgress`/`AdvanceStreakOutcome`/`ClassId` from `game-engine` rather than redefining them.
- **`apps/mobile/src/services/api.ts`**: typed client using `supabase.functions.invoke` (auth header automatic from the current session) with a fresh `Idempotency-Key` per call.
- **`stores/session-store.ts`**: Zustand mirror of Supabase Auth session state, started once from `_layout.tsx`.
- **`app/auth.tsx`**: real `signInWithOtp` call, replacing the old fake "sent" state.
- **`stores/app-store.ts`**: split into demo mode (unchanged local-only path, CDC §13) and cloud-synced mode (`isCloudSynced`), selected by whether a session existed when onboarding finished. Cloud mode's `completeHabit` calls the real `award-habit-xp` and takes the server's numbers as authoritative; a failed call falls back to the same local-optimistic math demo mode uses (logged, not queued — see below).
- **`onboarding/reward.tsx`**: ENTER calls `bootstrap-profile` first when signed in, seeds `app-store` from its response (real habit UUIDs), falls back to demo-mode init on any failure so a network hiccup can't strand Day Zero.
- `pnpm turbo run typecheck lint test` green across all 4 packages after every change in this pass — including two real bugs `deno check` caught before deployment (see `bootstrap-profile`'s commit: two branches returned a raw object instead of a `Response`) and one `tsc` caught in `api.ts` (a generic constraint that doesn't structurally match named interfaces, fixed with a narrow cast instead).

### Known gaps, explicitly not built this pass (scope calls, not oversights)

- **Deep-link handling**: `emailRedirectTo: 'winterarc://auth/callback'` is set, but nothing in the app parses an incoming `winterarc://` URL to exchange it for a session yet. `session-store.ts` will pick up a session once one exists (e.g. if Supabase's SDK handles the exchange internally via `detectSessionInUrl`-equivalent on native — needs verifying), but the redirect URL itself isn't registered in the dashboard either (see Decisions below).
- **No full CDC §110 offline sync queue** — the cloud-mode fallback on a failed `award-habit-xp` call is "apply the same local math, log a warning," not a persisted outbox with retry-on-reconnect. Real queue is a separate design (needs its own storage shape, retry policy, conflict resolution when the queued action's optimistic numbers disagree with what the server would have computed).
- **`bootstrap-profile` doesn't create an `arcs` row** — Arc creation/lifecycle is still an open Phase 1 gap (TODO.md), habits get `arc_id: null` (schema-supported "persistent habit").

### Decisions needed from Julien

- **DECISION-NEEDED (action)**: register `winterarc://auth/callback` as a valid redirect URL — Supabase dashboard → Authentication → URL Configuration → Redirect URLs. Magic links won't reopen the app without this.
- **DECISION-NEEDED (verification)**: confirm whether Supabase JS's native session handling actually completes the magic-link exchange automatically when the app reopens via the custom scheme, or whether `apps/mobile` needs an explicit `Linking` listener calling `supabase.auth.exchangeCodeForSession` / `setSession`. Not verified this session (no way to click a real email link from here).

### Metrics
- New Edge Function: `bootstrap-profile` (deployed, ACTIVE). `award-habit-xp` redeployed (v2).
- New package: `@winterarc/shared-types` (7 type files).
- Commits: 6 (bootstrap-profile, shared-types, award-habit-xp coin fix, mobile wiring, lockfile).

### Next session should
- Verify the magic-link round trip end-to-end once Julien registers the redirect URL — this needs a human clicking a real email link, can't be done from an agent session.
- Design the real CDC §110 sync queue if offline resilience matters before more Edge Functions get wired to mobile actions (claim-quest, open-chest, shop-purchase, apply-prestige aren't called from any UI yet — only award-habit-xp and bootstrap-profile are).
- `rotate-quests` (still nothing assigns quest instances, so `claim-quest` has nothing to claim yet even though it's deployed and correct).

---

## Session 2026-08-28 (continuation 4, ad-hoc — triggered directly by Julien: "tu as désormais accès à la base de données, fais le setup de la bdd et finis le setup de l'app")

### Done

Julien linked the Supabase MCP connector. This session did what the standing "Claude writes, Julien applies" workflow had deferred:

- **Created the Supabase project**: `winter-arc-staging`, org "Habits Tracker" (`jbnrisodvxvfuqlsogat`), region `eu-west-3`, project ref **`hexoluuqagxhplrgfsme`**. Confirmed $0/month (free tier) before creating, per the confirm_cost/get_cost flow.
- **Applied all 5 migrations** in order: `init_core_schema` (25 tables + RLS), `active_boosts`, `user_skills`, `idempotency_keys`, `profile_lifetime_xp`. `list_tables` confirms 28 tables, RLS enabled on every one.
- **Loaded all 3 seed files**: 7 classes, 57 cosmetics, 30 achievements (row counts verified by query). Applied via `execute_sql` (not `apply_migration` — these are data seeds, not schema).
- **Deployed all 6 Edge Functions**, all `ACTIVE`: `award-habit-xp`, `claim-quest`, `apply-prestige`, `open-chest`, `shop-purchase` (all `verify_jwt: true`), `advance-streak` (`verify_jwt: false` — it authenticates via `X-Cron-Secret`, not a user JWT, so Supabase's own JWT gate would have rejected pg_cron's call before our code ever ran).
  - **Real deployment gotcha, not present locally**: the repo's actual import paths (`../../../packages/game-engine/src/xp.ts` etc.) assume a monorepo layout. The `deploy_edge_function` tool bundles each function standalone — a `../../../` from `index.ts` walked *past* the bundle root and resolved to `file:///packages/...` (confirmed by the exact error), not into the bundle. Fix: repackaged each function's `files` array with a flattened `game-engine/*.ts` + `_shared/*.ts` layout and rewrote the import specifiers to match (`./game-engine/xp.ts`, `./_shared/cors.ts`) — purely a deployment-packaging concern, **the committed repo files are untouched**, still using the real monorepo-relative paths for local dev/`deno check`.
- **Enabled `pg_cron` + `pg_net`**, scheduled `advance-streak-nightly` (`0 3 * * *`, matches CDC §42's Grace Period cutoff window) via `net.http_post` to the deployed function URL. The shared secret it sends as `X-Cron-Secret` is generated with `gen_random_bytes` and stored in `vault` (`vault.decrypted_secrets`), not hard-coded into the cron job body.
- **Wrote real credentials into `apps/mobile/.env`** (gitignored, confirmed before writing) — `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`, so `services/supabase.ts`'s client is no longer `null`.
- Ran `get_advisors` (security) after the schema work: only the two expected `rls_enabled_no_policy` INFOs (`audit_logs`, `idempotency_keys` — both correct by design, no client access at all) plus one new WARN after enabling `pg_net`: it installs into the `public` schema and Postgres/pg_net doesn't support `ALTER EXTENSION ... SET SCHEMA` (confirmed by trying and getting `0A000`). This is a known, common Supabase limitation, not something wrong with this schema — accepted, not worth fighting further.

### Decisions needed from Julien

- **DECISION-NEEDED (action, not a design call)**: set the `CRON_SECRET` Edge Function secret to this exact value — not settable via the MCP tools available this session (no `set_secret`-equivalent):
  ```
  5bed7871e1363a42390a8be8e0a2fc088b8c6c96f87c73b4
  ```
  Via dashboard: Project Settings → Edge Functions → Secrets. Via CLI: `supabase secrets set CRON_SECRET=5bed7871e1363a42390a8be8e0a2fc088b8c6c96f87c73b4 --project-ref hexoluuqagxhplrgfsme`. Until this is set, `advance-streak`'s nightly cron call will get a 401 from the function itself (the cron job's side is already correctly configured and sending this same value).

### Metrics
- Migrations applied: 5. Seed rows: 7 + 57 + 30 = 94.
- Edge Functions deployed: 6/6 ACTIVE.
- Commits: 0 this leg — `apps/mobile/.env` is gitignored by design (real secrets stay out of git); TODO.md/SESSION-LOG.md updates land in the next commit.

### Next session should
- Confirm Julien set `CRON_SECRET`, then verify the cron actually fires (check `cron.job_run_details` after the next 03:00, or invoke `advance-streak` manually with the header to test sooner).
- Write `services/api.ts` (typed Edge Function client) now that real credentials exist — currently the mobile app still only writes to the local `app-store` (see that store's file header), never calls `award-habit-xp` for real. This is the actual "wire mobile to backend" work; today's session made the backend reachable, not the mobile app reach it.
- Wire `auth.tsx`'s "Send Link" button to `supabase.auth.signInWithOtp` — trivial now that the client is configured.
- Still open from prior sessions: `rotate-quests`, `spend-skill-point`, `packages/shared-types`, visual/runtime verification of the mobile UI (path-length issue in this sandbox, see continuation 3's entry).

---

## Session 2026-08-28 (continuation 3, ad-hoc — triggered directly by Julien: "à toi intègre tout ce qui manque !")

### Done

**Backend (Phase 0 gap-closing):**
- `packages/game-engine` gained 4 modules: `quests.ts` (the `quest_definitions.condition` DSL that TODO.md flagged as missing, evaluates to 0-100 progress not boolean — quests are period-tracked), `stats.ts` (7-stat computation from `habits.linked_stats` × `habit_logs`, saturating curve + 14-day decay per CDC §26), `skills.ts` (16-node Skill Point talent tree catalog, CDC §22), `chests.ts` (chest rarity rolls + Fragment values, CDC §74/§76, rarity odds decided directly since api-specifications.md flagged them as an open call). Also added `STREAK_THRESHOLD_BY_DIFFICULTY` to `streaks.ts`, closing a "hard-coded 60" TODO that had lived in `award-habit-xp`'s own file header since it was written. 71/71 tests green (was 43).
- 4 new migrations: `active_boosts`, `user_skills`, `idempotency_keys`, and `profiles.lifetime_xp` — the last one because implementing `apply-prestige` surfaced a real bug-in-waiting: the schema only had one `total_xp` column serving as both "cumulative XP" and "what `levelFromTotalXp` reads," so resetting level to 1 on prestige without a second counter would have made the very next XP grant immediately relevel the user back up. Not a guess — traced through the actual write path before deciding.
- 6 Edge Functions written: `evaluate-achievements` (as a shared helper called by other functions, not its own deployment — api-specifications.md's own words say "called internally"), `claim-quest`, `apply-prestige`, `open-chest`, `shop-purchase` (scoped to cosmetics only — CDC §72's non-cosmetic permanent purchases have no backing schema), `advance-streak` (pg_cron target, auth via a shared secret instead of a user JWT). `award-habit-xp` updated to call `evaluate-achievements`, wrapped in idempotency, and to read the streak threshold from `profiles.difficulty` instead of the hard-coded value.
- `_shared/idempotency.ts` — every mutating function above now accepts an optional `Idempotency-Key` header and replays the cached response for a repeat, instead of double-writing.
- **Installed the Deno CLI specifically to verify these** (`npm install -g deno`): every new/touched Edge Function was `deno check`'d — with `@ts-nocheck` stripped in a throwaway copy — against an isolated sandbox directory (never the real repo; a first attempt at `deno check` in-place mutated the root `package.json` by adding a `workspaces` field trying to read the pnpm workspace, immediately reverted). This caught one real bug: a dynamically-built `.select()` string in `evaluate-achievements.ts` defeated Supabase's column type inference.
- `apps/mobile`'s `lint` script was still the `create-expo-app` default (`expo lint`, which shells out to install ESLint at runtime) — contradicted CLAUDE.md §3's Biome-only rule and was actively failing in this sandbox. Fixed to `biome check .`, added a `typecheck` script so `turbo run typecheck` actually covers `apps/mobile` (it was silently skipping it before).

**Mobile (re-skinning the default Expo template into the real app):**
- Deleted the entire `create-expo-app` demo scaffold (tabs, themed-text/view, animated-icon, hint-row, web-badge, collapsible) and its assets. This also removed the 2 pre-existing typecheck errors TODO.md had flagged (they lived in files that are now gone, not fixed around).
- `packages/ui-primitives` gained the 9 components the `winter-arc-design-system` skill listed as missing (`XPOrb`, `Frame`, `Aura`, `StreakFlame`, `XPBar`, `LevelBadge`, `Nameplate`, `Emblem`, `Sigil`) plus 3 custom SVG icons (Flame/Check/Chevron — Design Law rule 3 forbids emoji as UI chrome). Frame/Aura are flat-color placeholders, not the Skia particle versions the CDC eventually wants — flagged in both files as needing `mobile-performance` coordination first, per the design-system skill's own note.
- Loaded real fonts (3 `@expo-google-fonts` packages) via `expo-font`, closing the other standing Design Law violation. `Text.tsx`'s `display` variant now renders in the Inter Tight fallback, not Neue Haas Grotesk — no license file exists for that; the component's comment says exactly what to flip if Julien gets one.
- Offline-first state: `zustandMmkvStorage` (one MMKV instance) backs `onboarding-store.ts` and `app-store.ts`. `app-store`'s `completeHabit` calls the same `game-engine` functions a real `award-habit-xp` call would (`calculateXpMultiplier`, `applyDailyXpCap`, `levelFromTotalXp`, `advanceStreak`) purely client-side, because no Supabase project is linked this session to reconcile against — the file header spells out exactly what changes once one exists.
- Built the full 13-screen onboarding (CDC §9) behind one shared `OnboardingShell`, plus Dashboard (CDC §14), Day Recap (CDC §16), a Level Up overlay, and an Auth screen stub (`services/supabase.ts`'s client is `null` until env vars exist). Every scope cut (no video asset, no live palette retheming, Daily Quests/Weekly Progress/Boss omitted as honest empty states rather than faked data, "Best moment" dropped from Day Recap for lack of real timestamps) is commented at its source, not hidden.
- `pnpm turbo run typecheck lint test` is green across all 3 packages (game-engine 71/71 tests, ui-primitives, apps/mobile).

### Blockers

- 🚧 **Could not get `expo start --web` running in this session's sandbox to visually verify the mobile UI.** Diagnosed at length, not given up on early: Metro fails resolving `@babel/types` -> `@babel/helper-validator-identifier` because pnpm creates that symlink with a mangled target (`/tmp/claude/...` instead of the real `C:\Users\...` path) — confirmed via `readlink`, reproduced across multiple full clean reinstalls, from both the Bash tool and PowerShell directly. `rmdir`/`Remove-Item` also silently fail to fully delete `node_modules` here. This smells like Windows MAX_PATH (260 char) friction compounding with this session's unusually deep scratchpad path, not a pnpm/repo config problem — `tsc`, `vitest`, and Biome all run clean because they don't walk the same symlink chain Metro's bundler does. Everything shipped tonight is typecheck+lint verified, matches the CDC/wireframes on a careful read-through, but is **not** confirmed to actually render/behave correctly on a device or in a browser.

### Decisions needed from Julien

_(none escalated — ambiguities were resolved directly and documented at their source per the standing "débrouille-toi" instruction, same as prior sessions. The one thing worth Julien's eyes specifically: `shop-purchase`'s scope (cosmetics only) and `apply-prestige`'s missing "choice of permanent bonus" both stem from real schema gaps, not oversights — see TODO.md's Phase 0 section for both.)_

### Metrics
- Commits: 31 (backend: game-engine modules/migrations/Edge Functions/docs sync; mobile: scaffold removal, fonts, stores, onboarding, dashboard, auth)
- Tests: 71/71 green (game-engine), was 43 at session start
- Files touched: ~90 (new + modified + deleted)

### Next session should
- **First**: open this repo on a normal-length path (or in Julien's own WSL2/Windows setup) and actually run `expo start` — click through onboarding end to end, confirm the dashboard renders, fix whatever a real Metro/simulator run surfaces that typecheck couldn't catch.
- Write `rotate-quests` (quest assignment) so the Dashboard's Daily Quests zone has something real to show instead of its current honest empty state.
- Wire `hasXpElixir`/`hasXpFeast` into `award-habit-xp` now that `active_boosts` exists as a table.
- `packages/shared-types` (Edge Function payload/response types) — still not started; `services/api.ts` on the mobile side is blocked on it (would mean hand-typing every payload twice otherwise).
- `spend-skill-point` Edge Function, now that `user_skills` + `game-engine/skills.ts` both exist.

---

## Session 2026-08-28 (continuation 2, ad-hoc — triggered directly by Julien: "débrouille-toi, intègre le reste et écris le cahier des charges manquant")

### Done
- **Resolved both standing blockers directly**, per Julien's explicit "handle it yourself" instruction rather than re-escalating:
  - `packages/game-engine/src/achievements.ts` — designed and implemented the achievement condition DSL the CDC never specified (discriminated union + `all_of`/`any_of`, 6 new tests, 43/43 total green).
  - `.claude/skills/` — drafted all 10 SKILL.md files referenced since the repo's first commit but never written (cinematic-ui, winter-arc-design-system, supabase-ops, rpg-mechanics, mobile-performance, test-then-ship, todo-manager, git-discipline, winter-arc-architect, session-report), grounded in the CDC and this repo's actual code/docs, not invented from nothing.
- **Wrote the 5 CDC Annexe C companion documents** Julien asked for ("le cahier des charges manquant"): `docs/architecture-technique.md`, `docs/schema-postgresql.md`, `docs/api-specifications.md`, `docs/design-system.md`, `docs/wireframes.md` (textual wireframes — no Figma access this session). Scoped to Phase 1; later phases get their docs when their phase starts.
- **Seed data**: `supabase/seed/001-003` — 7 classes, 57 cosmetics (12 avatars, 8 frames, 6 auras, 6 banners, 5 themes, 20 titles — titles are a `cosmetics` category, not a separate table), 30 achievements. Cross-referenced consistently (achievement `cosmetic_reward` ↔ title `unlock_method`).
- Writing the companion docs and seed data surfaced several real gaps that weren't visible before: no `evaluate-achievements` Edge Function (achievements can't unlock without it despite the catalog existing), no `quest_definitions.condition` DSL (unlike achievements, not yet designed), no active-boosts table, no `user_skills` table for the talent tree, no idempotency keys on mutating functions. All added to TODO.md rather than left implicit in the docs only.

### Blockers

_(none — see "Done" above; both standing ones from prior sessions are resolved)_

### Decisions needed from Julien

_(none escalated this session — per his own instruction, ambiguities were resolved directly and documented inline/in TODO.md instead. If any of the achievements.ts DSL, the skills content, or the companion docs' choices don't match his intent, that's feedback for next session, not a live blocker.)_

### Metrics
- Commits: 5 (achievements.ts, seed data, skills, companion docs, TODO.md update)
- Tests: 43/43 green (was 37 at end of prior session)
- Files touched: ~24 new files

### Next session should
- Write `evaluate-achievements` — highest-value next Edge Function, the seeded achievement catalog is otherwise inert.
- Design the `quest_definitions.condition` DSL (mirroring how `achievements.condition` got designed this session) before attempting `claim-quest` or quest rotation.
- Load real font files into `apps/mobile` via `expo-font` — `ui-primitives`' `Text` component references family names that don't resolve to anything yet, a live Design Law violation.
- Consider `supabase init` for a local dev stack — Edge Functions have been written but never actually run.

---

## Session 2026-08-28 (ad-hoc, continuation — triggered directly by Julien)

### Done
- **Architecture pivot** (Julien's explicit instruction): removed NestJS and the web companion from the CDC, CLAUDE.md, and TODO.md. Supabase (Postgres + Auth + Storage + Edge Functions + Realtime) is now the entire backend; Expo (iOS + Android) is the only client. Deleted the NestJS scaffold generated earlier the same night before it was ever committed.
- **Supabase workflow changed**: per Julien, Claude writes `.sql` migrations and Deno Edge Functions and stops — Julien applies/deploys them himself. Not blocked on Supabase project access anymore (yesterday's blocker is moot under this workflow).
- feat(mobile): bootstrapped `apps/mobile` via `create-expo-app` (SDK 57), rebranded (name/scheme/bundle id/splash/dark-lock), stripped the template's own redundant `AGENTS.md`/`CLAUDE.md`/`.claude/`.
- feat(game-engine): XP curve (CDC §20), multiplier stack (§19), streak lifecycle (§40-43), prestige (§23-24), class synergy (§29-30). 37 Vitest cases, all green, `tsc --noEmit` clean.
- feat(ui-primitives): tokens.ts (Frost palette + spacing/radii/type/motion from CLAUDE.md §5) + Surface/Hairline/Text primitives.
- feat(functions): scaffolded `supabase/functions/` — `_shared/` helpers + `award-habit-xp`, the function the whole MVP loop depends on. Written, not deployed.
- Fixed `tsconfig.base.json` (needed `baseUrl` for the `paths` map to be valid — TS5090) and cleaned up all Biome lint errors across the new code + the Expo template's own files (`biome check --write`, then a few manual non-null-assertion fixes).
- Root `pnpm install` succeeded; `packages/game-engine` and `packages/ui-primitives` both typecheck clean.

### Blockers

- 🚧 **`.claude/skills/` still missing** — unchanged from yesterday, still needs Julien's input (has originals, or wants them drafted from the CDC).
- 🚧 **`apps/mobile` doesn't fully typecheck yet** — two errors from the Expo template's own CSS-module usage (`animated-icon.web.tsx`, `theme.ts` → `global.css`), missing type declarations that are normally generated on first `expo start`/`prebuild`, which hasn't been run yet. Not a regression from tonight's work — pre-existing template state.

### Decisions needed from Julien

- Same two as 2026-08-27 (Supabase project limit is now moot given the new workflow — dropping that one; `.claude/skills/` origin is still open).
- **New**: `packages/game-engine/src/achievements.ts` was deliberately not written — the CDC gives achievements a `condition: JSON` field but never specifies its shape. Needs either the originals (if they exist) or a first concrete batch of achievement conditions to design the evaluator against.

### Metrics
- Commits: 5 (docs pivot, mobile bootstrap, game-engine, ui-primitives, edge functions)
- Tests: 37/37 green
- Files touched: ~90 (mostly Expo template scaffold)

### Next session should
- Wire `packages/game-engine` and `packages/ui-primitives` into an actual mobile screen (currently unconsumed — the packages exist but nothing imports them yet).
- Run `expo start` once to generate the missing `expo-env.d.ts`/CSS type declarations and get `apps/mobile` to a clean `tsc --noEmit`.
- Re-skin the default tab template into the real onboarding/dashboard screens (CDC §9, §14), or at minimum the Écran 1 splash, since that's the first thing anyone will see.
- Write the `classes` + starter `cosmetics`/`achievements` seed `.sql` (TODO.md Phase 0) so the schema Julien applies isn't empty tables.

---

## Session 2026-08-27 (ad-hoc, not the 02:30 cron — triggered directly by Julien)

### Done
- docs(cdc): ingest CDC v2.0 into `docs/cahier-des-charges.md` — full product spec, now the source of truth referenced by CLAUDE.md
- docs(claude): update CLAUDE.md §3 (tech stack) and §4 (repo layout) to match CDC v2.0 — NestJS + Prisma backend added, Redis/BullMQ, PostHog, Sentry+Datadog/Grafana, Cloudflare R2 fallback, Stripe/IAP; `packages/domain` renamed `game-engine`, `design-system` renamed `ui-primitives`, `shared-types`/`shared-utils` added, `apps/api` and `apps/admin` added
- docs(todo): rewrite TODO.md around the CDC's phased roadmap (§134-140), Phase 0 foundation tasks expanded with NestJS/Prisma specifics
- chore(repo): monorepo skeleton — root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `biome.json`, `.gitignore`, `.github/workflows/ci.yml`
- feat(db): initial Prisma-equivalent SQL schema for Supabase — 25 tables covering Phase 1 (MVP core) and the structural parts of Phase 2 (squads, chests, battle pass, journal, mood), RLS on every table, rollback file included. **Not yet applied** — see blocker below.

### In Progress

_(none — session paused on the Supabase blocker before any table could actually be created)_

### Blockers

- 🚧 **Supabase project creation blocked.** The account is at the 2-active-project limit on the free tier, across every org where Julien is admin/owner — even though the "Habit Tracker" org (the only one visible to this connector) shows 0 projects. The other project(s) counting against the limit live somewhere the connector can't see, or are paused-but-still-counted. Cost would have been €0/month (confirmed via `get_cost` before attempting). The full schema (`supabase/migrations/20260827000000_init_core_schema.sql` + its rollback) is written and ready to apply the moment a project exists.
- 🚧 **`.claude/skills/` is referenced everywhere but doesn't exist in this repo.** CLAUDE.md §6 and README-AUTOMATION.md both describe 10 SKILL.md files (cinematic-ui, supabase-ops, git-discipline, rpg-mechanics, etc.) that were apparently part of the original "kit" but never got committed. I did not fabricate their contents — CLAUDE.md is explicit that skills should be loaded, not guessed.
- 🚧 **No GitHub push credentials were available at session start** on this machine (no `gh`, no credential helper, no SSH key). Configured `git config --global credential.helper manager` (Git Credential Manager, bundled with Git for Windows) so the first `git push` triggers a one-time browser-based GitHub login for Julien — no token ever handled by Claude. Not yet exercised.

### Decisions needed from Julien

- **DECISION-NEEDED**: Which existing Supabase project should be deleted/paused/upgraded (or: is there another org with headroom) so `winter-arc-staging` can be created? Free tier is €0/month, no billing concern once unblocked.
- **DECISION-NEEDED**: Should the 10 missing SKILL.md files be reconstructed from the CDC (I can draft `supabase-ops`, `git-discipline`, `rpg-mechanics`, `cinematic-ui` etc. from the relevant CDC sections), or do the originals exist somewhere and just need to be copied in? Working without them for now — CLAUDE.md's top-level rules cover the essentials — but the finer domain guidance they were meant to carry (e.g. exact motion easing rules, RLS patterns) isn't enforced anywhere yet.

### Metrics
- Commits: (see this session's commits on `night/2026-08-27-1`)
- Tables designed: 25 (0 applied — blocked)
- Files touched: 12

### Next session should
- If the Supabase blocker is resolved: create `winter-arc-staging`, apply `20260827000000_init_core_schema.sql`, seed `classes` (7 rows) and a minimal `cosmetics`/`achievements` catalog so the MVP loop has something to unlock against.
- Bootstrap `apps/api` (NestJS) and `apps/mobile` (Expo) for real — this session only laid the root monorepo config, not the actual app packages.
- Start on `packages/game-engine` — XP formula, level curve, streak logic (CDC §17-25, §40-43) — pure TS, testable without any backend.
