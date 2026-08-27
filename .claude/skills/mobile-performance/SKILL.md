# mobile-performance

Load before writing animations, lists, or anything that runs every frame. CDC §116 sets the numbers; this is how to hit them.

## The targets (CDC §116 — non-negotiable, not aspirational)

- Cold start < 2.5s
- Tap → visual feedback < 100ms
- 60 FPS on iPhone 12 / Pixel 6a — the CDC explicitly names low-mid-range devices as the bar, not a current flagship
- Sync queue drained < 2s on 4G

"It felt smooth on the simulator" is not evidence. If you can't profile on a real mid-range device, say so rather than claiming the target is met.

## Animation

- Reanimated 4 worklets for anything driven by gesture or running continuously (XP bar fill, streak flame flicker, level-up sequence) — never drive a per-frame animation from React state / `setState` in a loop.
- Skia for auras, particles, animated frames (CDC §51-52) — these are canvas-level effects, not a stack of absolutely-positioned `View`s with opacity animations. If a cosmetic effect needs more than 2-3 overlapping animated views, it should be a Skia canvas instead.
- Respect "Reduce Motion" (CDC §130, accessibility) — every non-essential animation needs a reduced/instant fallback, checked once via a shared hook, not re-implemented per screen.

## Lists

- Any list that can exceed ~20 items (achievements grid, cosmetics catalog, squad feed, leaderboard) needs virtualization — `FlashList` over a bare `ScrollView.map()`. The cosmetics catalog alone is already 30+ items in the Phase 1 seed data and grows to 300+ by V1.5 (CDC §137) — don't build it against a `ScrollView` and plan to fix it later.
- Keep list item components memoized and their render props stable (no inline arrow functions creating new references every render) once a list is real; not worth the ceremony for genuinely static content.

## Startup budget

- Cold start includes font loading (JetBrains Mono, the display face, Inter — CLAUDE.md §5 rule 4) and any splash-to-first-frame work. Don't block first paint on anything that isn't needed for the first frame — defer non-critical data fetches (e.g. full cosmetics catalog) until after the dashboard is interactive.
- Offline-first (CDC §110) means the app should render from local state (MMKV) immediately and reconcile with the Edge Function response after — don't gate the first render on a network round trip.

## Before shipping any screen

- Profile it, don't guess. If Reanimated/Skia work is involved, verify it's actually running on the UI thread (not silently falling back to JS-thread execution).
- Check the "third `Modal`/list/animated-component" rule from `TODO.md`'s guardrails — repeated ad hoc implementations are also a performance risk (inconsistent memoization, inconsistent virtualization), not just a maintainability one.
