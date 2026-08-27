# Winter Arc — Nightly Autonomous Dev Setup

## What this is

A drop-in kit that turns any Winter Arc repo into a self-developing project. Every night at 02:30, Claude Code wakes up, reads its standing orders, picks the next task from `TODO.md`, works until credits deplete, commits progress to a `night/YYYY-MM-DD` branch, and sends you a 3-line Telegram summary at breakfast.

You test in the morning. That's the whole loop.

## What's in this kit

```
winter-arc-automation/
├── CLAUDE.md                           ← the constitution Claude Code reads every session
├── TODO.md                             ← living roadmap Claude picks tasks from
├── README-AUTOMATION.md                ← this file
├── .claude/
│   ├── skills/                         ← 10 specialized skills
│   │   ├── winter-arc-architect/       ← package boundaries, ADRs, dep rules
│   │   ├── winter-arc-design-system/   ← Frost palette, primitives, tokens
│   │   ├── cinematic-ui/               ← anti-generic-AI design, motion, sound
│   │   ├── mobile-performance/         ← 60fps bar, worklets, list rules
│   │   ├── supabase-ops/               ← migrations, RLS, edge functions
│   │   ├── test-then-ship/             ← Definition of Done, coverage, E2E
│   │   ├── todo-manager/               ← how to pick, break down, prune
│   │   ├── session-report/             ← end-of-session logging, Telegram
│   │   ├── git-discipline/             ← branch/commit rules, recovery
│   │   └── rpg-mechanics/              ← XP curves, prestige, cosmetics math
│   └── prompts/
│       └── nightly-session.md          ← the exact prompt the cron feeds Claude
└── scripts/
    ├── nightly-claude.sh               ← WSL2 bash launcher
    ├── nightly-claude.ps1              ← Windows Task Scheduler wrapper
    └── notify.sh                       ← Telegram push
```

## Setup — one-time (about 20 minutes)

### 1. Drop the kit into your repo

Copy every file from this kit into the root of your Winter Arc repo. Commit them on `main`:

```bash
git add CLAUDE.md TODO.md README-AUTOMATION.md .claude/ scripts/
git commit -m "chore: install nightly autonomous dev protocol"
git push
```

### 2. Wire the Telegram bot

- Talk to `@BotFather` on Telegram, `/newbot`, save the token.
- Send any message to your new bot, then hit `https://api.telegram.org/bot<TOKEN>/getUpdates` to grab your chat ID.
- Create `.env` at the repo root (add to `.gitignore`):

```dotenv
TG_BOT_TOKEN=1234567890:AA...
TG_CHAT_ID=987654321
```

- Test: `./scripts/notify.sh "hello from setup"`. You should get a Telegram DM.

### 3. Wire the Supabase connectors

Two options:

- **Local dev (recommended)**: Claude runs `supabase start` in the container, migrations happen against local Postgres, you review them in the morning before applying to prod. Setup: `pnpm add -D supabase` at root, `supabase init`, commit the resulting config.
- **Remote managed**: give the automation the `SUPABASE_SERVICE_ROLE_KEY` for a **staging** project only. Prod is off-limits. Store in `.env`:
  ```dotenv
  SUPABASE_URL_STAGING=https://<ref>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY_STAGING=eyJ...
  ```
  and update `supabase-ops` skill to reference staging by default.

### 4. Register the Windows Task

- Open Task Scheduler → Create Task
- **General**: Name = "Winter Arc Nightly", "Run whether user is logged on or not", "Run with highest privileges"
- **Triggers**: New → Daily → 02:30 → recur every 1 day
- **Actions**: New → Start a program
  - Program: `powershell.exe`
  - Arguments: `-NoProfile -ExecutionPolicy Bypass -File "C:\Users\<you>\winter-arc\scripts\nightly-claude.ps1"`
- **Conditions**: check "Wake the computer to run this task"
- **Settings**: check "Allow task to be run on demand", uncheck "Stop the task if it runs longer than…"

Adjust the WSL paths at the top of `nightly-claude.ps1` to match yours.

### 5. Test the launcher manually before trusting the cron

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\nightly-claude.ps1
```

Watch the logs in `.claude/logs/session-*.stdout.log`. If Claude runs, updates TODO, commits, and sends a Telegram — you're wired.

### 6. Your morning routine

- Check Telegram. One line tells you the state.
- Click the branch link. Skim SESSION-LOG.md at the top.
- Answer any DECISION-NEEDED items (write your call as a bullet in TODO.md under a new `📬 Decisions from Julien` section — Claude reads it next session).
- Pull the branch, `pnpm install`, `pnpm test`, run the app in Expo. Test what shipped.
- If good: merge to main. If not: reply with concrete feedback in TODO.md.

## The 10 skills — what each is for

| Skill | Purpose |
|---|---|
| `winter-arc-architect` | Package boundaries, dep discipline, ADRs — keeps the codebase from sprawling |
| `winter-arc-design-system` | Frost tokens, primitives, type scale — the visual DNA in one place |
| `cinematic-ui` | The **anti-generic-AI-design** playbook. Motion, sound, composition, reject list |
| `mobile-performance` | 60fps discipline, worklets, list virtualization, startup budget |
| `supabase-ops` | Migration templates, RLS policy patterns, edge function skeleton |
| `test-then-ship` | Definition of Done, coverage rules, E2E strategy |
| `todo-manager` | How to pick tasks, break them down, handle blockers |
| `session-report` | End-of-session log format + the 3-line Telegram contract |
| `git-discipline` | Branch/commit rules, never-touch-main, recovery from conflicts |
| `rpg-mechanics` | XP curves, prestige thresholds, streak logic — the actual game math |

Skills are loaded on demand (Claude reads the SKILL.md when the situation calls for it, per CLAUDE.md §6 mapping). They don't all fire every session — that's the point.

## The design differentiator (the "not another AI-designed app" bet)

The `cinematic-ui` skill is the one that matters most for the "sortir de l'ordinaire" you asked for. It contains:

- A **reject list** — the patterns Claude would output by default (rounded-2xl cards, gradient CTAs, glassmorphism, streak emoji, spinners, bento grids). Explicitly banned.
- A **motion vocabulary** — mechanical easings, no springs, asymmetric durations, hero holds
- A **composition rule** — 60% negative space, one focal point per screen, top-third hero / bottom-third action
- A **sound contract** — 5 named SFX + haptic pairings, default-on
- A **five-question self-review** before every commit ("does it feel like a Villeneuve film?" "did I use a system font anywhere?")

If Claude respects that skill, the app won't look like anything else out there. If a screen slips through generic, treat it as a bug in the skill, not in Claude — tighten the skill.

## Costs, safety, and what could go wrong

- **Credit consumption**: unpredictable. Set a monthly cap in your Anthropic console. The session self-terminates at ~10% budget, but that's a soft check.
- **Broken main**: the `git-discipline` skill and CLAUDE.md forbid it. Every commit lands on a `night/*` branch, never `main`. Even if Claude misbehaves catastrophically, `main` stays intact.
- **Bad Supabase migration**: rollback file required for every migration. If it applies and breaks staging, roll back manually and file a DECISION-NEEDED for Claude to reshape the approach.
- **Cron misfire**: the bash script does preflight (dirty tree, API reach) and skips cleanly with a Telegram if either fails.
- **Silent failure**: the PS1 wrapper sends a fallback Telegram if the bash script exits non-zero. You'll always hear about a run, one way or another.

## Iterating on the setup

The skills are living documents. When you find Claude drifting from your intent:

1. Identify the failure pattern.
2. Add a rule or an example to the relevant SKILL.md.
3. Commit.
4. Next session, Claude reads the update and complies.

Same for CLAUDE.md — it's not sacred. Tighten, loosen, or reword rules as you learn what works for your project.

## What this kit deliberately does NOT do

- ❌ Deploy to production — never autonomously. Staging Supabase migrations are as far as it goes.
- ❌ Merge to `main` — always draft PRs at most.
- ❌ Post on socials — the content pipeline is a separate project (see your CDC v2.0).
- ❌ Buy anything, use an API key beyond Anthropic + Supabase staging, or touch billing.
- ❌ Ship a debug build to TestFlight or Play Console without your explicit go-ahead.

You are still the person in charge. Claude is a very disciplined junior engineer working the night shift. It's not the CTO.

---

Ready to install. See §1 above.
