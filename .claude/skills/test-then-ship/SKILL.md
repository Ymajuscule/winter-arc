# test-then-ship

Load before marking any TODO.md task done, and before every commit that isn't pure documentation. This is CLAUDE.md §7's Definition of Done, expanded.

## Definition of Done — a task in TODO.md is done only when ALL of these hold

- [ ] `pnpm typecheck` clean at the root (strict mode — no `any`, no `@ts-ignore`) for every affected package
- [ ] `pnpm lint` (Biome) clean
- [ ] Unit tests added or updated, `pnpm test` green. For `game-engine`: 100% behavioral coverage isn't a suggestion (`rpg-mechanics` skill) — every function needs cases for its boundary conditions, not just the happy path.
- [ ] For UI: a Maestro flow exists in `apps/mobile/.maestro/`, OR the task explicitly says "no E2E" and that's logged
- [ ] Design Law self-review passed (`cinematic-ui` skill's five questions) for anything user-facing
- [ ] Commit(s) pushed to the current `night/YYYY-MM-DD-N` branch
- [ ] `TODO.md` updated — task struck, any newly-discovered sub-tasks added inline
- [ ] If it touches the DB: `.sql` migration + rollback file (not applied — see `supabase-ops`), RLS policy reviewed against the pattern in `20260827000000_init_core_schema.sql`

Only strike the checkbox in TODO.md once every applicable line above is true — "the feature works when I tried it once" is not the bar.

## What counts as a test, here

- `game-engine`: Vitest, pure functions, no mocking needed — if a test needs a mock, the function probably has an untested side effect that should be extracted.
- Edge Functions: not yet wired with a test runner (Deno's own `deno test`, most likely — not decided). Until that exists, at minimum manually trace the function's logic against 2-3 concrete inputs and note it in the commit message; don't ship an Edge Function with zero verification of any kind.
- Mobile screens: Maestro E2E for the golden path of any new flow (onboarding step, habit completion, achievement unlock). Component-level tests (React Native Testing Library) for anything with non-trivial conditional rendering logic.

## Short cycles (CLAUDE.md §2)

Plan → implement → test → commit, and don't write more than ~200 lines without running the tests you have so far. A task that's ballooning past that is probably two tasks — split it in TODO.md rather than landing one giant commit.

## When tests go red

Per CLAUDE.md §11 (Failure Protocol): if the suite is red for more than ~30 minutes on the same failure, revert the last commit, log it in SESSION-LOG.md, and move to the next task rather than fighting it indefinitely. Don't disable or skip a test to make CI green — that's hiding the problem, not fixing it.
