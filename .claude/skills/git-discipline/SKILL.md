# git-discipline

Load before any commit, branch, or push. CLAUDE.md §2 and §11 are the source rules; this is the working playbook.

## Branching

- One branch per session (or per day if a session spans midnight): `night/YYYY-MM-DD`, incrementing to `night/YYYY-MM-DD-2`, `-3`... if there's more than one session the same calendar day. Check `git branch -a` / the remote before assuming `-1` is free.
- **Never commit to `main`.** Not even a one-line fix. Not even if it feels safe. This is absolute, not a default that yields to convenience.
- Never merge to `main` autonomously — Julien reviews and merges (README-AUTOMATION.md's morning routine: pull the branch, test, then merge if good).

## Commits

- Conventional Commits format: `type(scope): summary` — `feat`, `fix`, `docs`, `chore`, `test`, `refactor`. Scope is usually the package/app touched (`mobile`, `game-engine`, `functions`, or omitted for repo-wide docs changes).
- One coherent change per commit. A docs pivot, a new package, and a schema change are three commits, not one — even in the same session, even about the same feature. This session's own history is the reference pattern: architecture-pivot docs, mobile bootstrap, game-engine, ui-primitives, and edge-functions all landed separately even though they happened back-to-back.
- Commit early, commit often — don't accumulate a giant diff and split it retroactively; it's harder to get right than committing in order as you go.
- Commit messages explain *why*, not just *what* — the diff already shows what changed. "Fixes tsconfig.base.json: `paths` needs `baseUrl`" is a why; "update tsconfig.base.json" is not.

## Pushing

- Push at the end of every logical unit of work, not just at session end — per the "Session end contract" in CLAUDE.md, every session ends with a *pushed* branch, but there's no reason to batch pushes until then.
- If `git push` needs auth and none is configured, that's a real blocker to surface, not something to route around (e.g. don't try to email a diff instead). See `SESSION-LOG.md` 2026-08-27 for how the actual credential gap in this repo got resolved (Git Credential Manager, browser-based login Julien completes himself — Claude never handles the token).

## Recovery

- Merge conflict on your own `night/*` branch: your bug, resolve it — most likely caused by two sessions using the same branch name, or a rebase gone wrong. Investigate before force-pushing anything.
- Merge conflict on `main`: hard stop, `DECISION-NEEDED` — this shouldn't happen if the "never touch main" rule is followed, so if it does, something upstream of this session went wrong and needs Julien's eyes before proceeding.
- If you discover unfamiliar uncommitted changes or an unexpected branch state at session start, investigate before doing anything destructive (`git status`, `git log`) — it may be Julien's own in-progress work from testing the previous night's branch.
