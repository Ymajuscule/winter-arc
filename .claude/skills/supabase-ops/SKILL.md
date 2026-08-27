# supabase-ops

Load before touching SQL, RLS, or `supabase/functions/`. Backend architecture reference: CDC §104-118 (amended 2026-08-28 — Supabase-only, no NestJS).

## The one rule that overrides everything else here

**Claude writes `.sql` migrations and Deno Edge Functions and stops.** Per Julien's instruction (2026-08-28), Claude does not create Supabase projects, does not run `apply_migration` against a live project, and does not `supabase functions deploy`. Julien applies/deploys everything himself. Every task in this domain ends at "the file is written and correct," not "it's live." If you're about to reach for a Supabase MCP tool to touch a real project, stop — that's not the workflow anymore.

## Migrations

- Location: `supabase/migrations/<timestamp>_<description>.sql`, paired with `<timestamp>_<description>_down.sql` (CLAUDE.md's git-discipline: rollback for every up).
- Timestamp format: `YYYYMMDDHHmmss`. Never reuse or backdate one — if you need to amend an applied migration, write a new one, don't edit history.
- Every table gets RLS enabled. See the pattern in `20260827000000_init_core_schema.sql`:
  - **Catalog tables** (classes, cosmetics, achievements, quest_definitions, seasons): public `select` policy, no write policy for `authenticated` — only the service role writes (i.e. Julien, or a future admin tool).
  - **Personal game-state tables** (xp_transactions, user_currency, user_cosmetics, achievements-earned, streaks, chests, battle_passes, quests-in-progress): `select` policy scoped to `auth.uid() = user_id`, **no** `insert`/`update`/`delete` policy for `authenticated` at all. Writes only happen through an Edge Function using the service role key. This is the anti-cheat boundary (CDC §127) — don't ever add a write policy to one of these tables "to make testing easier." If local testing needs writes, do them with the service role key locally, not by loosening RLS.
  - **Preference-only personal tables** (habits, journal_entries, mood_checkins, loadouts): currently also select-only for consistency with the rest, routed through Edge Functions. Revisit only with a DECISION-NEEDED if direct client writes turn out to be worth the RLS complexity for these specifically.
- New tables always extend the pattern above — don't invent a new access model per feature.

## Edge Functions

- Location: `supabase/functions/<name>/index.ts`, one function per narrow responsibility (see the list in CDC §107). Shared code in `supabase/functions/_shared/`.
- Deno, not Node. `Deno.serve(...)`, `npm:` specifiers for npm packages (`npm:@supabase/supabase-js@2`), `Deno.env.get(...)` for secrets — never hardcode a key.
- **Import `packages/game-engine` by the specific `.ts` file, not through `index.ts`.** The barrel file re-exports via `.js`-suffixed specifiers (correct for Node/tsc's NodeNext resolution, which the mobile app and its bundler need) — whether Deno's module loader remaps those to the sibling `.ts` file is untested. Importing `../../../packages/game-engine/src/xp.ts` directly sidesteps the question entirely. See `award-habit-xp/index.ts` for the pattern.
- Every function that writes a game-state table uses `supabaseAdmin()` from `_shared/supabase-admin.ts` (service role, bypasses RLS by design) and reads the caller's identity via `getUserFromRequest()` (verifies the JWT, never trust a `user_id` passed in the request body).
- Mark real gaps with a `// TODO:` comment and a one-line reason, don't guess and move on silently. `award-habit-xp/index.ts`'s file header is the template — it lists exactly which multiplier inputs are stubbed and why (missing active-boosts table, missing timezone storage, etc.).
- `// @ts-nocheck` at the top of every Edge Function file is intentional and required — the repo's root `tsc`/Biome don't understand Deno's `npm:`/`Deno.*` globals, and Deno's own type-checking happens when Julien actually runs/deploys it, not in this repo's CI.

## Seed data

`supabase/seed/`, numbered files (`001_`, `002_`, ...) applied in order, `on conflict (id) do nothing` so re-runs are safe. Not migrations — this is demo/starter content (classes, starter cosmetics catalog, starter achievements), not schema. See `supabase/seed/README.md` for the apply order and why it matters (achievements reference cosmetic ids as rewards, so cosmetics must seed first).

## Local dev

`supabase init` / `supabase start` gives a local Postgres to develop and test migrations against before Julien applies them to staging — use this instead of guessing whether SQL is valid. Not yet set up in this repo; if you need it, that's a Phase 0 task, not something to skip.
