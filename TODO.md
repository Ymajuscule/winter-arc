# TODO.md — Winter Arc Living Roadmap

> **How this file works.** Claude reads top-to-bottom, picks the first unblocked item under 🔥 Next Up, works, ships, strikes it. New sub-tasks discovered during the work go inline under their parent. Blockers move to 🚧. Done tasks move to ✅ Recently Shipped (keep last 30, prune older into `docs/changelog.md`).

Legend: `[ ]` open · `[~]` in progress · `[x]` done · `[!]` blocked

---

## 🚧 Blockers (address first, or route to DECISION-NEEDED)

_(none yet)_

---

## 🔥 Next Up

### Foundation (must ship before anything else)

- [ ] **Init monorepo skeleton** — Turborepo + pnpm workspaces, `apps/mobile`, `packages/{design-system,domain,api-client}`, root Biome config, root tsconfig with strict + path aliases, root `.gitignore`, GitHub Actions CI stub (typecheck + lint + test on push).
- [ ] **Expo app bootstrap** — SDK 54, TS strict, Expo Router v4, absolute imports, dark-only theme lock (no system theme switch), splash screen `#05070A`, app.json with bundle IDs `com.winterarc.app` and `com.winterarc.app.dev`.
- [ ] **Design system package** — `tokens.ts` (Frost palette + spacing + radii + type scale + motion presets), `<Text>` primitive with variants (display/title/body/mono/label), `<Surface>` primitive (void/obsidian/graphite variants), `<Hairline>` divider, `<XPOrb>` placeholder with Reanimated stub.
- [ ] **Domain package** — pure TS, no React imports. `xp.ts` (level curve, XP-to-level, level-to-XP), `prestige.ts` (Prestige I–X thresholds), `streak.ts` (rules, freeze days, decay), `cosmetics.ts` (Loadout type + slot validation). 100% unit test coverage required — this is the game math, it cannot be wrong.
- [ ] **Supabase local dev** — `supabase init`, first migration: `users`, `profiles`, `xp_ledger` (append-only), `streaks`, `cosmetics_catalog`, `user_cosmetics`, `loadouts`. RLS on every table. Seed data in `supabase/seed/`.
- [ ] **Typed Supabase client** — generate types via `supabase gen types typescript`, wrap in `packages/api-client` with a hook per resource (`useProfile`, `useXPLedger`, `useLoadout`).
- [ ] **Auth flow** — magic link + Apple/Google. One screen: `void` background, mono `WINTER ARC` wordmark, single input, single button. No signup/login toggle — one field figures it out.

### Onboarding (v0)

- [ ] **Cold-open sequence** — 4 seconds, no logo. Ambient loop starts (`sfx/ambient-void.mp3`), Skia noise fades in, single line of text: "The arc begins in silence." Tap to proceed. This sets the tone for everything.
- [ ] **Name + class selection** — user picks one of 3 starting classes (Ascetic / Sentinel / Wanderer). Each has a starter loadout. No back button once picked (choices are choices).
- [ ] **First-goal ritual** — user writes their winter arc goal in a mono textarea. Char limit 140. This is the seed of their profile.
- [ ] **Onboarding E2E** — Maestro flow covering cold-open → class pick → goal → dashboard.

### Daily Loop (v0)

- [ ] **Dashboard screen** — top: `LVL 07 :: 2340 / 3200 XP` in mono, thin progress hairline underneath. Middle: today's 3 tasks (user-defined, capped at 3, brutal). Bottom: streak counter.
- [ ] **Task completion → XP grant** — tap to complete, XP orb absorbs into the bar, sfx cue (`sfx/xp-absorb.mp3`), Reanimated worklet drives the number rollup.
- [ ] **Streak logic** — first completion of the day starts/continues the streak. Missed day = streak break unless a Freeze is spent.
- [ ] **Level-up modal** — full-screen takeover, ember-tinted vignette, monospace `LEVEL 08` reveal at 640ms, single "PROCEED" button. No confetti. Ever.

### Prestige & Cosmetics (v1)

- [ ] **Prestige I trigger** — hitting Level 50 unlocks the Prestige I ritual (irreversible reset with permanent aura cosmetic).
- [ ] **Cosmetics catalog UI** — grid of thin-bordered tiles, locked ones show a hairline X, owned ones show a subtle aurora pulse.
- [ ] **Loadout editor** — 12 slots visible, dragging is disabled (tap-to-swap only, less error-prone on mobile).

### Later (v1.x)

- [ ] Squads (4-person) — private, invite-only, shared leaderboard
- [ ] Battle Pass seasonal framework
- [ ] Journal (mono, distraction-free, no rich text)
- [ ] Widgets (iOS/Android home screen showing streak + today's tasks)
- [ ] Analytics dashboard (personal, on-device)
- [ ] Notifications (opt-in, one per day max, poetic copy)

---

## ✅ Recently Shipped

_(none yet — night 1 coming)_

---

## 📌 Standing Guardrails (never ignore)

- If a task would break the Design Law in `CLAUDE.md §5`, reshape the task before doing it.
- If a task changes the DB schema, it must ship with a rollback file.
- If a task adds a dependency, justify it in the commit message (why not stdlib / existing dep).
- If you're about to write your third `Modal` component, stop and refactor to a shared one first.
