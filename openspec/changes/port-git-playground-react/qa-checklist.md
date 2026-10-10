# Manual QA Checklist — Port Git Playground to Vite + React + TypeScript

Task 7.11. This is a **human gate**: nothing below is marked done until a
person actually runs `npm run dev` and checks it against the oracle
(`design-handoff/Git Playground.dc.html`, opened directly in a browser) or
their own judgment of "close enough" per the spec's acceptance bar ("close-
enough visual/timing fidelity under manual QA, not pixel-exact"). The
automated suite (602/602 unit/integration tests, `tsc -b`, `npm run build`)
already covers logic/state — this checklist is for everything a screen
can't be unit-tested: timing feel, layout cohesion, and real-device input.

Run `npm run dev` and open the app in a desktop browser window first, then
repeat the mobile-flagged items with the browser narrowed below 720px (or a
real phone/tablet).

- [ ] **Choreography timing** — run `git add .`, `git commit`, `git branch`,
  `git merge` (with and without a conflict), `git rebase`, `git cherry-pick`,
  `git revert` and watch the chip-fly / node-birth / label animations. They
  should feel smooth and roughly match the oracle's timing (not jerky, not
  instant, no leftover ghost chips after the animation ends).
- [ ] **Camera pan** — click-drag on empty canvas space pans the graph
  smoothly; two-finger (or two simulated pointers) pinch zooms in/out.
- [ ] **Camera zoom** — mouse wheel zooms at the cursor position (not the
  canvas center); Ctrl+wheel zooms faster, matching the oracle's distinct
  `ctrlKey` zoom speed.
- [ ] **Camera fit** — the "fit" button (CameraControls) frames the whole
  graph with sensible padding, not clipped and not absurdly zoomed out.
- [ ] **Camera center-on-HEAD** — the "center" button recenters the view on
  the current HEAD commit.
- [ ] **Mobile bottom-sheet cohesion** (narrow viewport) — the terminal
  collapses into a bottom sheet that doesn't overlap the files-strip
  floating button or the action bar; opening/closing it animates without
  layout jank.
- [ ] **Mobile files strip** (narrow viewport) — tapping the "Archivos"
  floating button shows the strip as an overlay panel, not inline; it
  closes cleanly.
- [ ] **Mobile camera safe area** (narrow viewport) — panning/fitting never
  hides graph content behind the bottom sheet or the files-strip button.
- [ ] **Theme toggle** — clicking the theme button (◐, top-right action bar)
  flips the whole UI between dark and light instantly, with no flash of the
  wrong theme on reload after toggling.
- [ ] **Theme persistence** — toggle the theme, reload the page; the chosen
  theme should still be active (reads back from `localStorage['gitpg:v1']`).
- [ ] **Existing `gitpg:v1` data loads** — in a browser console, inspect
  `localStorage.getItem('gitpg:v1')` before and after using the app; after a
  reload, the repo graph, command history (↑/↓), and theme should all
  survive exactly as left (and a repo with a stale/missing `v` marker should
  silently fall back to the example repo instead of crashing).
- [ ] **`window.GitPlayground` console usability** — open the browser
  devtools console and run:
  - `window.GitPlayground.estado()` — returns the current repo state object.
  - `window.GitPlayground.ejecutar('git log')` — runs a command as if typed
    in the terminal.
  - `window.GitPlayground.motor()` — returns the `GitEngine` facade (same
    shape as the oracle's `window.GitEngine`).
  - `window.GitPlayground.cargar(estado)` — loads an arbitrary repo state
    object (e.g. one captured earlier from `estado()`).
- [ ] **Ctrl+L vs `clear`/`cls` parity** — type a partial command (don't press
  Enter), then press Ctrl+L: the output scrolls clear but your partially
  typed command stays in the input. Separately, type `clear` or `cls` and
  press Enter: both the output AND the input clear. These two must behave
  differently (this was a deviation caught and fixed during this batch —
  verify it holds visually, not just in the unit test).
- [ ] **Reset menu** — the "Reiniciar repositorio" action bar button opens a
  2-step confirm menu; choosing "ejemplo" or "vacío" resets the graph/
  terminal and shows the matching Spanish notice line.
- [ ] **Reduced motion** — with the OS/browser "prefers reduced motion"
  setting enabled, choreography animations should be skipped/instant rather
  than janky-fast.
- [ ] **Spanish copy spot-check** — skim the empty states, action bar
  labels/tooltips, toasts, and terminal hints; everything should read as
  natural Spanish matching the oracle (no leftover English or placeholder
  text).
