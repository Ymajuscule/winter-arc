# session-report

Load at the end of every session, or when a session-cap warning appears. This is the concrete "how" behind CLAUDE.md §9-10.

## SESSION-LOG.md entry

Append (newest at top, per the file's own header) a `## Session YYYY-MM-DD (...)` block with these sections, in this order:

1. **Done** — one bullet per shipped commit, `type(scope): summary (commit-ish description)`. Not a narrative — a scan-able list.
2. **In Progress** — genuinely unfinished work with enough context that a future session (or Julien) can pick it up cold. Omit the section entirely if nothing's mid-flight (don't write "none" — see below).
3. **Blockers** — `🚧` prefixed, each with enough detail to act on without re-deriving it (what's blocked, what unblocks it). Cross-reference `TODO.md`'s `🚧 Blockers` section — they should stay in sync, not diverge.
4. **Decisions needed from Julien** — `DECISION-NEEDED` entries per CLAUDE.md §8 categories 3/4 (data model, visual language, user-facing flow, money/deploy/user-data). State the options and a recommendation — don't just ask an open question. If Julien already resolved something this way in a prior session ("débrouille-toi" 2026-08-28), don't re-escalate the same category of decision by default — that instruction is itself now a standing precedent (see `todo-manager`).
5. **Metrics** — commits, tests added/passing, files touched. Cheap to compute (`git log`, test runner output), skip only if genuinely nothing changed.
6. **Next session should** — 2-4 concrete pointers, not a re-statement of all of TODO.md.

Keep entries factual and terse — this file is read at 7am, not analyzed line by line. A wall of prose defeats the point.

## Empty sections

If a session had no blockers, no in-progress work, or no decisions needed, say so in one line ("none this session") rather than omitting the header — a missing section reads as "forgot to check," not "nothing to report."

## Telegram contract (CLAUDE.md §10 — not wired up yet)

`scripts/notify.sh` is meant to send a ≤3-line summary at session end: what shipped, in one clause; whether anything's blocked; the branch link. No diffs, no full test output — just enough that Julien knows whether to open the laptop before coffee or after. `TG_BOT_TOKEN`/`TG_CHAT_ID` aren't configured in this repo yet (README-AUTOMATION.md §2) — until they are, the SESSION-LOG.md entry itself is the report; don't invent a notification that can't actually send.

## What never goes to Telegram (CLAUDE.md §10, repeated because it's a real rule)

Never DM tests, diffs, or code to Telegram — link the branch instead. And never assume silence means approval: if Julien doesn't respond to a `DECISION-NEEDED`, that item stays open, it doesn't default to "proceed."
