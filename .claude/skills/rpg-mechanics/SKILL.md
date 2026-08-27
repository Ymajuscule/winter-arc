# rpg-mechanics

Load before touching `packages/game-engine`, or any screen that displays XP/level/streak/prestige numbers. This is the game math — CDC Parties IV, V, VII (§17-30, §40-43). It has to be exactly right; a UI bug is annoying, a math bug feels like the game lied to you.

## Where the logic lives

`packages/game-engine/src/` — pure TypeScript, zero framework imports, so it runs identically in an Edge Function (source of truth) and on-device (optimistic preview). If you're computing XP, a level, a streak transition, or a class bonus anywhere else — in a screen component, in an Edge Function inline — stop, that logic belongs here instead, imported from both places. Duplicating it is how the client and server quietly drift.

- `xp.ts` — the level curve. `xpRequiredForLevel(n) = round(500 × n^1.35)` is the *literal* CDC §20 formula. **The CDC's own illustrative table doesn't reconcile with that formula** (verified by computing it) — the code implements the formula as written, not the table. If Julien wants the table's exact numbers, that's a different curve and needs a decision, not a silent "fix" to match table values that don't even agree with each other.
- `multipliers.ts` — the CDC §19 bonus stack (streak/perfect-day/class-synergy/early-bird/weekend/boosts/season-event/comeback), additive, capped at +200% total (§25).
- `streaks.ts` — `advanceStreak()`, one call per user per day, returns `extended | already_logged_today | frozen | broken`. Encodes Grace Period, Streak Freeze auto-trigger (§42), and the Comeback Streak window (§43).
- `prestige.ts` — level-100 gate, rank cap at X (10), permanent +2%/rank XP bonus capped at +20%, "Legend" status at rank 10.
- `classes.ts` — the 7-class synergy table (§29). Keep `CLASSES` in sync with `supabase/seed/001_classes.sql` — same ids, same bonus percentages, two representations of one fact.
- `achievements.ts` — the condition-evaluation DSL (a first-cut design, not CDC-specified — see the file header). Extend the `AchievementCondition` union when a new achievement needs a shape it doesn't have yet; don't stretch an existing case to mean something else.

## Non-negotiables (CDC §127, repeated because it's load-bearing)

- **Mobile never computes official XP.** It can compute an optimistic preview (instant UI feedback) using the same `game-engine` functions, but the Edge Function's calculation is what actually gets written and is what the client reconciles against. If a screen shows an XP number before the Edge Function responds, label it as pending/optimistic in the code even if not visually — don't let "it matched last time" become an assumption.
- **Daily XP cap is 3 000** (`DAILY_XP_CAP` in `xp.ts`). Overflow past the cap still counts for quest progress, just not for leveling — don't silently drop it, route it differently.
- **The XP bonus cap is +200% absolute**, not per-source. Adding a new bonus type means adding it to the sum in `multipliers.ts`, and the existing cap still applies — don't give a new bonus its own separate ceiling.

## Testing bar

100% behavioral coverage isn't optional here (CLAUDE.md §7, TODO.md Foundation task) — every function in `game-engine` has a `.test.ts` beside it. When you add a case to `AchievementCondition` or a bonus to `multipliers.ts`, add the test in the same commit, not as a follow-up.

## When you hit a genuine ambiguity

The CDC is detailed but not exhaustive (see `achievements.ts`'s condition shape, or the level-curve/table mismatch above). Per CLAUDE.md §8's decision framework: if it's a pure engineering choice with no user-visible impact, make the call and log it as a one-liner in `SESSION-LOG.md` — don't escalate every gap. If it changes the actual numbers a user will see and compare against the CDC's stated examples, that's worth a note even if you still decide it yourself.
