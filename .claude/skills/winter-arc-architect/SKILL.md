# winter-arc-architect

Load when making a stack, package-boundary, or dependency choice — anything CLAUDE.md §3 calls "locked" or that would otherwise need a `DECISION-NEEDED`.

## Package boundaries (current, 2026-08-28)

```
apps/mobile/            the only app — Expo, iOS + Android
packages/game-engine/   pure TS game logic — importable from mobile AND Deno Edge Functions
packages/ui-primitives/ design tokens + RN primitives — importable from mobile only
packages/shared-types/  not created yet — types shared between mobile and Edge Function payloads
packages/shared-utils/  not created yet — framework-free helpers (date math, formatters)
supabase/functions/     the "backend" — Deno Edge Functions, not a package under apps/ or packages/
supabase/migrations/    schema, .sql, Julien applies
```

Rules:
- `game-engine` has **zero** framework imports (no React, no React Native, no Deno-specific globals) — it must run unmodified in both a browser/RN JS engine and Deno. If a function needs `Deno.env` or `fetch`, it doesn't belong in `game-engine`; put the Deno-specific glue in the Edge Function itself and keep `game-engine` as the pure calculation core it calls into.
- `ui-primitives` never imports from `game-engine` or vice versa — one is presentation, one is domain logic. A component that needs both (e.g. an `XPBar` that both renders styled AND needs to know the level curve) takes computed values as props; it doesn't reach into `game-engine` to compute them itself.
- Nothing in `packages/` imports from `apps/mobile` or `supabase/functions/` — dependencies point one direction, app/functions depend on packages, never the reverse.

## Dependency discipline

- New dependency → justify it in the commit message: why not the standard library, why not an existing dependency already in the tree. This is a `TODO.md` standing guardrail, not optional.
- Don't add a dependency to solve a problem `game-engine` or `ui-primitives` should just implement in ~20 lines of TS (e.g. a date-diff helper, a simple condition evaluator) — see `achievements.ts` and `streaks.ts` for the existing bar.
- Version bumps: patch/minor within the CLAUDE.md §3 stack table is fine; a major version bump or a stack table change is a `DECISION-NEEDED`, not an autonomous call — the table exists precisely so nobody has to re-litigate "should we use X or Y" every session.

## ADRs

`docs/decisions/` — one file per decision that changes the stack table or a package boundary, not for routine implementation choices. The 2026-08-28 pivot (drop NestJS, drop the web companion) is exactly the kind of thing that warrants one; it's currently only documented as an amendment note in the CDC and CLAUDE.md rather than a standalone ADR file — writing `docs/decisions/0001-supabase-only-backend.md` to consolidate that rationale is a reasonable next task if the amendment notes start feeling scattered.

## When a task doesn't fit the current layout

If a task seems to need a new top-level package or app (e.g. an actual admin tool later, per CDC's deferred `apps/admin`), that's an architecture decision, not something to scaffold quietly mid-task. Flag it, propose the boundary, and get it into `CLAUDE.md §3-4` before building inside it.
