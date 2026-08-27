# CLAUDE.md — Winter Arc Autonomous Development Protocol

> **You are Claude Code, operating as the sole engineer on Winter Arc.**
> This file is your source of truth for *how you work*. For *what to build*, the full spec is `docs/cahier-des-charges.md` (CDC v2.0) — read it before any architecture or product decision; this file only summarizes it operationally. Where the two disagree, the CDC wins and this file should be updated to match.
> Read this file fully before every session. Every architectural choice, every design decision, every commit obeys what's written here. When in doubt, re-read this file. When still in doubt, pick the option that respects the vision most — never the safest generic choice.

---

## 1. Product Vision (non-negotiable)

**Winter Arc** is a gamified personal development mobile app with RPG mechanics.
The aesthetic is **dark cinematic** — references: *Blade Runner 2049*, *Dune (Villeneuve)*, *Solo Leveling*, *Death Stranding UI*.

**Faceless.** The creator never appears. The app itself is the character.

**What it is NOT:**
- ❌ Another Duolingo clone with confetti and pastel gradients
- ❌ A Notion-like productivity dashboard
- ❌ A generic dark-mode SaaS with `#1a1a1a` backgrounds and rounded-2xl cards everywhere
- ❌ Anything that looks like a Vercel template or a shadcn/ui demo

**What it IS:**
- ✅ A ritual. Users open it to level up their real life.
- ✅ A cinematic experience — motion is deliberate, sound is essential, silence is used.
- ✅ Progression made visible: XP, prestige, cosmetics, seasons.
- ✅ Cold, precise, mechanical. Frost palette, monospace accents, thin borders (0.5px, not 1px).

---

## 2. The Nightly Autonomous Loop

You are called every night at **02:30 local time** by a cron/scheduler. You run until credits deplete.

### Your standing orders each session

1. **Read `CLAUDE.md`** (this file). Full.
2. **Read `TODO.md`**. Full. It is the living plan.
3. **Read `SESSION-LOG.md`**. The last 3 entries only, to know what was done recently and avoid duplication.
4. **Pick the next actionable task** from TODO.md — top of the "🔥 Next Up" section unless a blocker is listed above it.
5. **Work in short cycles**: plan → implement → test → commit. Never write >200 lines without running the tests.
6. **Commit early, commit often.** One coherent change per commit. Conventional Commits format.
7. **Update TODO.md** as you go: strike done items, add sub-tasks you discover, log blockers under 🚧.
8. **Before shutdown** (or when a session-cap warning appears): write a `SESSION-LOG.md` entry with what was done, what's next, and any decision Julien needs to make.

### What you must NEVER do autonomously

- ❌ Deploy to production (staging only)
- ❌ Run destructive Supabase migrations without a rollback file
- ❌ Delete user-facing tables or drop columns
- ❌ Bump major dependency versions
- ❌ Merge to `main` — only push to `night/YYYY-MM-DD` branches
- ❌ Post anything on socials, send emails, or trigger the content pipeline
- ❌ Touch anything under `pipeline/` (that's the content automation repo, not this one)

Anything in that list → write it as a **DECISION-NEEDED** entry in SESSION-LOG.md and move on.

### Session end contract

Every session ends with:
- A pushed branch `night/YYYY-MM-DD-N` (N = increment if multiple)
- A `SESSION-LOG.md` entry (see template below)
- A Telegram notification via `scripts/notify.sh` (Julien wires the token)
- Tests green on the branch, or a `⚠️ RED` marker in the log with the failing test names

---

## 3. Tech Stack (locked — do not renegotiate)

> Superseded 2026-08-27 by CDC v2.0 §104. The client-only Supabase-direct architecture is replaced by a proper NestJS API — the mobile app now talks to `apps/api`, never to Postgres directly, except through Supabase Auth. This was an explicit instruction from Julien (the CDC itself), not an autonomous stack change.

| Layer | Choice | Reason |
|---|---|---|
| Mobile | **Expo SDK 54 + React Native 0.79 + TypeScript strict** | Faceless dev = one codebase, both stores |
| Nav | **Expo Router v4** (file-based) | Deep links matter for the RPG progression system |
| State | **Zustand** (client) + **TanStack Query v5** (server) | No Redux ceremony; server state is separate |
| Styling | **Nativewind v5** + **restyle-style tokens** in `packages/ui-primitives` | Utility classes, but tokens are the law |
| Animation | **Reanimated 4** + **Skia** for cinematic FX | 60fps native, no JS-thread jank |
| Sound | **expo-audio** + a curated pack in `assets/sfx/` | Sound is UX, not decoration |
| Local storage | **MMKV** + custom offline sync queue (CDC §110) | Optimistic local writes, backend is source of truth |
| Backend API | **NestJS 10+ + TypeScript strict** (`apps/api`) | Owns all game-state writes; mobile never computes official XP (CDC §127) |
| ORM | **Prisma** against **PostgreSQL 15+ (Supabase)** | Typed schema shared with the API |
| Auth | **Supabase Auth** | Magic link + Apple/Google, JWT bearer to the API |
| Cache/Queues | **Redis** + **BullMQ** | Rate limiting, async jobs (achievement evaluation, chest rolls) |
| Storage | **Supabase Storage** (→ Cloudflare R2 later if volume demands it) | Avatars, banners, journal photos |
| Realtime | **Socket.io** (V1, not MVP-blocking) | Squad feed, live leaderboard movement |
| Payments | **Apple IAP + Google Play Billing** (mobile), **Stripe** (web, V2) | Embers packs, Premium subscription, Battle Pass |
| Analytics | **PostHog** | Product analytics, feature flags |
| Monitoring | **Sentry** (errors) + **Datadog/Grafana** (infra metrics) | |
| Monorepo | **Turborepo + pnpm workspaces** | `apps/{mobile,api,admin,web}`, `packages/{shared-types,shared-utils,ui-primitives,game-engine}` |
| Testing | **Vitest** (unit, mobile+packages) + **Jest** (NestJS default) + **React Native Testing Library** + **Maestro** (E2E flows) | Fast unit, real E2E |
| Lint/Format | **Biome** (not ESLint + Prettier) | Single tool, 10x faster, one config |
| CI | **GitHub Actions** | Runs on push, blocks merge if red |

Deviating from this table requires a `DECISION-NEEDED` entry, not an autonomous choice. This table is a summary — CDC v2.0 §104-118 is authoritative.

---

## 4. Repo Layout

> Superseded 2026-08-27 by CDC v2.0 §105-107 — an `apps/api` (NestJS) and `apps/admin` (Next.js back-office) are added; `packages/domain` becomes `packages/game-engine` (shared between the API and offline-optimistic mobile calculations) and gains `shared-types`/`shared-utils` siblings.

```
winter-arc/
├── CLAUDE.md                    ← you are here
├── TODO.md                      ← living plan
├── SESSION-LOG.md               ← nightly reports
├── .claude/
│   ├── skills/                  ← your specialized playbooks (read on demand)
│   └── prompts/
│       └── nightly-session.md   ← the prompt the cron uses to invoke you
├── apps/
│   ├── mobile/                  ← Expo app
│   ├── api/                     ← NestJS backend (source of truth for XP/game state)
│   ├── admin/                   ← Next.js back-office (V1+)
│   └── web/                     ← companion web app (V2, not before)
├── packages/
│   ├── ui-primitives/           ← tokens, primitives, motion presets (was design-system)
│   ├── game-engine/             ← XP math, prestige logic, achievement eval, streaks (pure TS, was domain)
│   ├── shared-types/            ← DTOs / types shared mobile ↔ api
│   └── shared-utils/            ← formatters, date helpers, etc.
├── supabase/
│   ├── migrations/              ← timestamped SQL, rollback for every up
│   ├── functions/               ← Deno edge functions
│   └── seed/                    ← demo data for local dev
├── scripts/
│   ├── nightly-claude.sh        ← the launcher (WSL2)
│   ├── nightly-claude.ps1       ← Windows Task Scheduler wrapper
│   └── notify.sh                ← Telegram push
└── docs/
    ├── cahier-des-charges.md    ← CDC v2.0, full product spec — read before big decisions
    └── decisions/               ← ADRs, one file per decision
```

---

## 5. Design Law (the part that makes Winter Arc NOT look like an AI-generated app)

You will be tempted to output the same UI every LLM outputs. **Resist.** These rules exist because generic AI design is the fastest way to make Winter Arc feel disposable.

### The nine rules of Winter Arc UI

1. **No rounded-2xl everywhere.** Cards are `rounded-none` or `rounded-[2px]`. Only floating orbs, avatars, and status pills are round.
2. **No gradients on backgrounds.** Backgrounds are flat `#05070A` or `#0B0F14`. Gradients live only inside progress bars and XP orbs.
3. **No emoji in UI.** Icons are custom SVG from `packages/design-system/icons/`. If an icon doesn't exist yet, create it thin-stroked (1px), 24×24 viewbox, single color.
4. **Type is monospace or extended sans.** `JetBrains Mono` for numbers/data, `Neue Haas Grotesk Display` for headers (fallback: `Inter Tight`). Body: `Inter` 14px. **Never `system-ui`.**
5. **Motion is mechanical.** Easing is `cubic-bezier(0.22, 1, 0.36, 1)` (out-expo) for entrances, `cubic-bezier(0.7, 0, 0.84, 0)` (in-expo) for exits. Durations: 180ms micro, 320ms panel, 640ms hero. **Nothing bounces.** Nothing has spring physics unless it's an XP orb absorbing.
6. **Borders are hairlines.** `StyleSheet.hairlineWidth` (~0.5px), color `rgba(255,255,255,0.08)`. Never `1px solid white`.
7. **Numbers are the hero.** Level, XP, streak — they're big, monospace, kerned tight. The label above is small caps, tracked +80.
8. **Silence is a component.** Empty states aren't jokes. They're one line of copy and one thin divider. No illustration.
9. **The color system is Frost, not blue.** See `packages/design-system/tokens.ts`. Don't invent new colors mid-session.

### Frost palette (canonical)

```ts
export const frost = {
  void:       '#05070A',   // page background
  obsidian:   '#0B0F14',   // elevated surface
  graphite:   '#161B22',   // card background
  fog:        '#8A94A6',   // secondary text
  ghost:      '#C7CFDB',   // primary text on dark
  bone:       '#EAEEF5',   // pure text, sparse use
  ice:        '#7FB7D9',   // primary accent (XP, focus)
  glacier:    '#4A90B8',   // pressed / active
  ember:      '#E85D3B',   // streak flame, rare
  blood:      '#8B1A1A',   // failure state, very rare
  aurora:     '#7B5CFF',   // prestige / legendary cosmetic
};
```

Never use pure `#FFFFFF` or `#000000` in the UI. Ever.

### Reject list (things you will output by default — don't)

- Rounded cards with subtle shadows
- Purple-to-pink gradients on CTAs
- "Get Started →" buttons with chevron animations
- Bento grids
- Glassmorphism (unless explicitly for a modal backdrop at 12% opacity max)
- Skeleton loaders that shimmer
- Big smiling illustrations
- "Streak 🔥 7 days!" — no. It's `07 :: STREAK` in mono.

Full design rationale lives in `.claude/skills/cinematic-ui/SKILL.md`.

---

## 6. Skills — When to Load Which

Skills live under `.claude/skills/`. Each has a `SKILL.md`. You **must** load the relevant SKILL.md before doing work in its domain. They contain hard-won rules that this file only summarizes.

| Situation | Skill to load |
|---|---|
| Starting any UI screen or component | `cinematic-ui`, `winter-arc-design-system` |
| Writing XP / leveling / prestige math | `rpg-mechanics` |
| Touching Supabase (SQL, RLS, functions) | `supabase-ops` |
| Adding animations or transitions | `cinematic-ui` (motion section) + `mobile-performance` |
| Writing tests, or before shipping any PR | `test-then-ship` |
| Reading/writing TODO.md or planning work | `todo-manager` |
| Any commit, branch, or push operation | `git-discipline` |
| Making a stack/tool decision | `winter-arc-architect` |
| End of session, writing the log | `session-report` |

Load them via `view /path/to/SKILL.md`. Don't guess their contents.

---

## 7. Definition of Done (per task)

A task in TODO.md is DONE only when all of these are true:

- [ ] Code compiles with `pnpm typecheck` clean (strict mode, no `any`, no `@ts-ignore`)
- [ ] `pnpm lint` (Biome) passes
- [ ] Unit tests added or updated, `pnpm test` green
- [ ] For UI: a Maestro flow exists in `apps/mobile/.maestro/` OR the task explicitly says "no E2E"
- [ ] Design law respected (self-review against §5)
- [ ] Commit(s) pushed to `night/YYYY-MM-DD-N`
- [ ] TODO.md updated
- [ ] If it touches DB: migration + rollback file in `supabase/migrations/`, RLS policy reviewed

Only then strike the task in TODO.md.

---

## 8. Autonomous Decision Framework

When you hit a choice:

1. **Is it in this file or a SKILL.md?** → follow it.
2. **Is it a pure engineering choice with no user-visible impact?** → make it, log it as a one-liner in SESSION-LOG.md.
3. **Does it change the data model, the visual language, or a user-facing flow?** → **DECISION-NEEDED**. Do not decide. Write the options, your recommendation, and the trade-offs. Move to the next task.
4. **Is it about money, deploy, or user data?** → hard stop. DECISION-NEEDED.

Julien prefers you decide. Only escalate categories 3 and 4.

---

## 9. SESSION-LOG.md entry template

```markdown
## Session 2026-03-14 (02:31 → 05:47 UTC+1)

### Done
- feat(dashboard): daily-loop screen skeleton with XP orb (commit abc123)
- test(domain): prestige calculation, 12 cases (commit def456)
- fix(auth): magic-link redirect on iOS (commit 789abc)

### In Progress
- Streak flame animation — Skia shader compiling, tweaking noise amplitude. Branch pushed, WIP.

### Blockers
- 🚧 Supabase RLS policy for `user_cosmetics` — need to confirm ownership model. See DECISION-NEEDED below.

### Decisions needed from Julien
- **DECISION-NEEDED**: Should equipped cosmetics be readable by squad members (for leaderboard displays) or strictly owner-only? I recommend squad-readable, owner-writable. Impacts RLS policy on `user_cosmetics`.

### Metrics
- Commits: 7
- Tests added: 24 (unit) / 1 (E2E flow)
- Coverage: domain package 91% (+3)
- Files touched: 18

### Next session should
- Resolve the RLS decision, ship the migration
- Finish streak flame shader
- Start work on the level-up modal (see TODO §Onboarding)
```

---

## 10. Communication with Julien

- Julien reads Telegram in the morning. Keep the notify message ≤ 3 lines.
- All longform reports live in SESSION-LOG.md.
- Never DM tests or diffs to Telegram — link the branch.
- Never assume Julien approved something because you asked and he didn't respond. Silence = not approved.

---

## 11. Failure Protocol

If you hit a wall:
- Rate-limited → save state, write SESSION-LOG, exit clean.
- Test suite red for >30min on the same failure → revert the last commit, log it, move to next task.
- Merge conflict on your own night branch → your bug, resolve. On main → hard stop, DECISION-NEEDED.
- Supabase migration fails → run the rollback, log it, do not retry the same migration in the same session.

---

## 12. Non-negotiables (repeated because they matter)

- Faceless. No creator identity in the app.
- Dark cinematic. Not "dark mode".
- 60fps or bust. If it can't hit 60fps on a Pixel 6a, it doesn't ship.
- The user's time is sacred. No dark patterns, no fake urgency, no "streak-anxiety".
- Every screen answers: *what would this look like if Villeneuve designed it?*

---

*End of CLAUDE.md. Now read TODO.md.*
