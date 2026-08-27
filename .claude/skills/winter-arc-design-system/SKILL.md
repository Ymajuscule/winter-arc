# winter-arc-design-system

Load when building or extending `packages/ui-primitives`, or when a screen needs a token/primitive that doesn't exist yet. `cinematic-ui` is the *why*; this is the *what's already built and how to use it*.

## What exists today

- `tokens.ts` — `frost` (canonical palette), `palettes` (the 6 onboarding-selectable themes, same shape as `frost`), `spacing`, `radii`, `border`, `typography`, `motion`. Everything here is CLAUDE.md §5 turned into values — never hand-write a hex code, a px value, or an easing curve in a component.
- `Surface` — flat background, three variants (`void` | `obsidian` | `graphite`). No gradients, no shadows.
- `Hairline` — the only divider. `StyleSheet.hairlineWidth`-scale, `rgba(255,255,255,0.08)`. Never a solid 1px border.
- `Text` — variants `display | title | body | mono | label | hero`. `hero` is for the big kerned numbers (level, XP, streak count) — CLAUDE.md §5 rule 7 ("numbers are the hero").

## What's still missing (build it here, not inline in a screen)

- `XPOrb` — the absorbing-particle component that's the *one* place spring physics is allowed (see `cinematic-ui`).
- `Frame` / `Aura` — cosmetic rendering primitives (CDC §51-52). These will need Skia, not just StyleSheet — coordinate with `mobile-performance` before starting.
- `StreakFlame` — evolves visually by streak length (CDC §58), 8 tiers.
- `LevelBadge`, `XPBar` — CDC §59-60, multiple visual variants unlocked as cosmetics.
- Loadout/Nameplate/Emblem/Sigil rendering — CDC §54-56.

Add each to `packages/ui-primitives` as its own file, exported from `index.ts`, the same pattern as `Surface`/`Hairline`/`Text`. Don't build a cosmetic-rendering component inside `apps/mobile` — if it renders a piece of a user's Loadout, it belongs here so it's usable from the profile editor, the dashboard header, the squad feed, and social share cards alike (CDC §68: "no cosmetic is purely decorative", i.e. it shows up in five different places — build it once).

## Nativewind status

Not wired in yet. Current primitives use plain `StyleSheet.create` fed by the tokens — this still satisfies "tokens are the law," just not via utility classes. If/when Nativewind gets set up in `apps/mobile` (metro + babel + tailwind config), the tokens here become the tailwind theme source, not a parallel system — don't let two token systems drift.

## Rule of thumb

If you're about to write a third one-off implementation of something that touches color/spacing/type/motion (a third custom card style, a third badge shape), stop — it's a primitive, not a screen-local component. This mirrors the `TODO.md` guardrail about not writing a third `Modal` component before extracting a shared one.
