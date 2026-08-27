# todo-manager

Load when reading/writing `TODO.md`, at the start of a session (to pick a task) and whenever a task's scope turns out to be wrong.

## Picking a task

1. Read top-to-bottom. First unblocked item under `🔥 Next Up` wins, unless something in `🚧 Blockers` needs addressing first.
2. "Unblocked" means: no unresolved `DECISION-NEEDED` gating it, and its prerequisites (listed or implied by phase ordering) are actually done. Don't start a Phase 1 task if a Phase 0 item it depends on (e.g. `packages/ui-primitives` before any screen that renders cosmetics) is still open — check, don't assume.
3. Prefer a task you can actually finish and ship in the current session over starting three in parallel. `SESSION-LOG.md`'s "In Progress" section exists for genuine multi-session work, not as a place to park five half-started things.

## Breaking a task down

If a `TODO.md` line is really 3+ days of work in disguise (e.g. "Onboarding — full 13-screen sequence"), split it into sub-bullets under the parent the first time you touch it, and strike sub-bullets individually as they land. Don't wait for someone else to have pre-split it — the file explicitly says new sub-tasks discovered during work go inline.

## Handling blockers

- A blocker that's Julien's call (money, an external account limit, a missing asset, a genuine product ambiguity the CDC doesn't resolve) → `🚧 Blockers` section + a `DECISION-NEEDED` entry in `SESSION-LOG.md`, per CLAUDE.md §8's escalation categories 3 and 4. Move to the next task, don't stall the session on it.
- A blocker that's actually just "this needs a decision I'm equipped to make" → per Julien's 2026-08-28 instruction ("débrouille-toi"), make the call, document *why* inline (a code comment or a SESSION-LOG one-liner), and keep going. The `achievements.ts` condition DSL and the `.claude/skills/` files themselves are the precedent for this — both were flagged as gaps, then resolved directly rather than left open.
- Don't leave a blocker in the file indefinitely without a next step attached — either it has a concrete unblock condition ("needs Julien to X") or it shouldn't still be listed as a blocker.

## Keeping the file honest

- Phase numbering matches `docs/cahier-des-charges.md` §134-140 — if the CDC's roadmap changes, `TODO.md` changes with it in the same commit, not later.
- `✅ Recently Shipped` keeps the last 30 entries; prune older ones into `docs/changelog.md` when it gets long (that file doesn't exist yet — create it when the prune is actually needed, not preemptively).
- Every "Standing Guardrail" at the bottom exists because something would otherwise recur — if you're about to violate one "just this once," that's a signal to either follow it or get Julien to explicitly override it (and then update the guardrail itself if it's now wrong).
