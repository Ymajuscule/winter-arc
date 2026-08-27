# cinematic-ui

Load before touching any screen, component, or animation. This is the skill that keeps Winter Arc from looking like every other AI-generated app — CLAUDE.md §5 has the nine rules and the Frost palette; this file is the deeper playbook behind them.

## The bet

Villeneuve's *Dune*, not Duolingo. Cold, precise, mechanical — motion that feels engineered, not friendly. If a screen would fit into a generic SaaS dashboard or a mobile game aimed at children, it's wrong, no matter how "clean" it looks.

## Reject list (what you'll output by default — don't)

- Rounded-2xl cards with soft shadows
- Purple-to-pink gradient CTAs
- "Get Started →" buttons with a chevron micro-animation
- Bento grids
- Glassmorphism (exception: a modal backdrop at ≤12% opacity)
- Shimmering skeleton loaders
- Big smiling illustrations, mascots, confetti
- Emoji as UI chrome (`packages/ui-primitives` icons only — thin-stroke SVG, 24×24, single color)
- `"Streak 🔥 7 days!"` — no. It's `07 :: STREAK` in mono, tracked wide.
- `system-ui` anywhere, ever

If you catch yourself about to reach for any of these, stop and re-read CLAUDE.md §5 rule by rule before continuing.

## Motion vocabulary

- Entrances: `cubic-bezier(0.22, 1, 0.36, 1)` (out-expo). Exits: `cubic-bezier(0.7, 0, 0.84, 0)` (in-expo). Constants live in `packages/ui-primitives/src/tokens.ts` (`motion.easing`).
- Durations are asymmetric by scale, not uniform: 180ms micro-interactions (checkbox, tap feedback), 320ms panel transitions, 640ms hero moments (level-up modal, achievement unlock).
- **Nothing bounces.** No spring physics, except the XP orb absorbing into the bar — that's the one deliberate exception because it's meant to read as "impact," not "playfulness."
- Prefer Reanimated 4 worklets over JS-thread animation for anything that has to hit 60fps — see `mobile-performance`.

## Composition rule

- 60% negative space minimum on any screen. If a screen feels "full," cut content, don't shrink it.
- One focal point per screen. If two elements are competing for attention, one of them is wrong.
- Top-third = hero/identity (level, streak, the thing that matters most right now). Bottom-third = action (what the user does next). Middle is supporting detail.

## Sound contract

Five named SFX, default-on, each with a haptic pairing:

| Event | SFX | Haptic |
|---|---|---|
| Habit completion | `xp-absorb.mp3` | light impact |
| Level up | (hero sting, TBD asset) | medium impact |
| Achievement unlock (Rare+) | distinctive per rarity | medium impact |
| Streak milestone | ember/frost tonal shift per §58 | light impact |
| Cold-open ambient | `ambient-void.mp3` (loop) | none |

Every sound must be individually toggleable in Settings. Silence is also a valid design choice per CLAUDE.md §5 rule 8 ("Silence is a component") — don't fill empty states with noise just because you can.

## The five-question self-review

Before committing any UI work, ask:

1. Does it feel like a Villeneuve film, or a Vercel template?
2. Did I use a system font, a default shadow, or a default border-radius anywhere?
3. Is there a gradient on a background that isn't a progress bar or XP orb?
4. Would this survive being screenshotted and posted with zero captioning — does it look intentional?
5. If I removed every icon and read only the copy, would it still feel cold/precise, or does the copy read like generic app boilerplate ("Welcome back!", "You're all set!")?

Any "no" — or worse, a "not sure" — means stop and revise before shipping.

## Reference

Frost palette, spacing, radii, typography, and motion constants: `packages/ui-primitives/src/tokens.ts`. Full design law: `CLAUDE.md §5`. Full screen-by-screen spec: `docs/cahier-des-charges.md` Parties II-III (§8-16) and the rest as each feature area is built.
