# QA Checklist: Landing Page + Levels

**Change**: landing-and-levels
**Status**: NOT RUN — human gate. This checklist is written by `sdd-apply` (tasks.md 9.2) but every item below
requires a real browser and a human tester; none of it has been executed yet. Automated coverage (`npm test`,
`tsc -b --noEmit`, `npm run build`, `npm run check:chunks`) is reported separately in `apply-progress.md`'s Batch 5
section and IS green as of this writing — this file only tracks what automation cannot verify.

How to use: run the app locally (`npm run dev`), open it in at least one desktop browser and one mobile
viewport/device, and walk every row below. Mark each `[ ]` as `[x]` PASS or `[x] FAIL — <note>` as you go. Do not
mark Phase 9 complete in `tasks.md`/`apply-progress.md` until every row here is checked off by a human.

## 1. Routing

- [ ] Loading the app with no `#` fragment shows the landing page (`#/`).
- [ ] `#/playground` loads the sandbox directly (deep link).
- [ ] `#/niveles` loads the level map directly (deep link).
- [ ] `#/niveles/basics-01-primer-commit` loads that level directly, without visiting the map first.
- [ ] An unknown hash (e.g. `#/no-existe`) redirects to `#/` via history replace (back button does NOT return to
      the bad hash).
- [ ] A malformed level id (e.g. `#/niveles/no-existe`) redirects to `#/niveles`.
- [ ] Navigating landing → niveles → a level → back → back returns through each step correctly (browser
      back/forward buttons), restoring scroll position on the level map and landing page.
- [ ] Opening a locked level's URL directly (a level in a world not yet unlocked) shows "Nivel bloqueado" instead
      of the level, with a working link back to the map — there is no way to see the level content by URL alone.
- [ ] Visiting `#/` and never navigating further never triggers a network request for the sandbox or level-map
      JS/CSS chunks (check the browser's Network tab, filter by JS, confirm no `PlaygroundRoute`/`LevelMapRoute`/
      `LevelRoute`/`HeroDemo`-chunk-adjacent `engine` bundle loads until you actually interact).
- [ ] Hovering or focusing "Empezar niveles" / "Modo libre" visibly starts fetching their chunk before the click
      (Network tab shows the request starting on hover/focus, not on click).

## 2. Landing page

- [ ] The page scrolls normally (it is NOT clipped/fixed-height like the sandbox) — scroll from Hero all the way
      down to the final CTA and back.
- [ ] Hero renders an `h1` reading "Git Playground" plus a visible tagline.
- [ ] The hero demo animates: a terminal line types out a command, then the graph updates with a visible "birth"
      effect for new commits, then it holds, then moves to the next command, looping after the last one.
- [ ] The hero script never repositions an existing node — once a commit appears, it stays in the same place for
      the rest of that loop iteration.
- [ ] The "Pausar" button freezes the hero demo (graph and typed text stop changing); clicking it again
      ("Reanudar") resumes it.
- [ ] Scrolling the hero demo out of view pauses it; scrolling it back into view resumes it.
- [ ] Switching to another browser tab (or minimizing the window) pauses the hero demo; switching back resumes it.
- [ ] Features, How it works, and Worlds preview sections all render with real (non-lorem-ipsum) Spanish copy.
- [ ] Worlds preview shows all 6 worlds with their 30 level titles, matching the level map's content.
- [ ] The final CTA section has both "Empezar niveles" (→ `#/niveles`) and "Modo libre" (→ `#/playground`) and
      both navigate correctly on click.
- [ ] Visual design reads as intentional/distinctive (not a generic template) — rail/commit-log styling,
      consistent with the dark/light theme tokens, Geist/Geist Mono fonts only (no third font family loaded).

## 3. Every world (level map + play-through)

For EACH of the 6 worlds, confirm the world's lane renders in the level map with the right name and 5 levels, and
play at least one level per world to completion:

- [ ] World 1 — Básicos (`basics-01` .. `basics-05`): play `basics-01-primer-commit` to completion.
- [ ] World 2 — Ramas (`branching-01` .. `branching-05`): unlock and play `branching-01-crear-rama`.
- [ ] World 3 — Merge y conflictos (`merge-01` .. `merge-05`): unlock and play `merge-03-resolver-conflicto`
      (exercises the conflict resolver UI specifically).
- [ ] World 4 — Deshacer cambios (`undo-01` .. `undo-05`): unlock and play `undo-04-guardar-con-stash`.
- [ ] World 5 — Remoto (`remote-01` .. `remote-05`): unlock and play `remote-01-primer-push`.
- [ ] World 6 — Pull requests y colaboración (`pr-01` .. `pr-05`): see section 6 below (PR levels) — unlock and
      play at least `pr-01-abrir-pr` and `pr-04-fusionar-pr`.
- [ ] Every world's levels show their Spanish title/objective/theory text correctly (no missing strings, no raw
      object dumps).

## 4. Stars, budget, hints, and unlocks

- [ ] Completing a level with no hints/solution used and within budget awards 3 stars.
- [ ] Completing a level after revealing a hint caps the stars at 1, even if still within budget.
- [ ] Completing a level with no hints but over budget awards 2 stars.
- [ ] The live budget counter increments on a non-read-only command, a failed command, a conflict "Resolver"
      action, an editor "Guardar" action, and a PR web-view action (including a failed one) — and does NOT
      increment on read-only commands (`git status`, `git log`, etc.).
- [ ] Revealing hints one at a time shows exactly one more each time, in order; opening the full solution counts
      as a hint for star purposes.
- [ ] Completing every level in a world (>=1 star each) unlocks the next world's levels on the map.
- [ ] A world with at least one 0-star level keeps the NEXT world fully locked (aria-disabled, lock icon shown).
- [ ] Reaching the last level of a world whose next world is still locked shows no (or a disabled) "Siguiente
      nivel" shortcut on the success screen.

## 5. Reset and reload persistence

- [ ] "Reiniciar nivel" inside a level replays its setup fresh and clears that attempt's hint/budget counters,
      without touching any OTHER level's saved progress.
- [ ] "Reiniciar progreso" on the level map (after confirming) clears ALL level stars/unlocks, but leaves the
      sandbox's own saved state (`gitpg:v1`) completely untouched.
- [ ] Reloading the page after completing some levels restores the exact same stars and unlock state on the level
      map (`gitpg:levels:v1` round-trips correctly).
- [ ] Reloading the page mid-level (before completion) restores the in-progress repo/hist/hint/count state for
      that level (not a fresh setup replay), unless the level's content version changed.
- [ ] Reloading the sandbox (`#/playground`) after making changes restores the exact same repo/theme/history
      (`gitpg:v1` round-trip, unaffected by any level activity in the same browser).
- [ ] An old `gitpg:v1` save written before the `hosting` field existed still loads without crashing (if you have
      a pre-upgrade save sitting around, or can hand-edit `localStorage` to simulate one).

## 6. Theme across routes

- [ ] Toggling the theme on the sandbox (`#/playground`) and then navigating to the landing page shows the new
      theme immediately, with no manual re-toggle needed.
- [ ] Toggling the theme on a level and then navigating to the level map (or landing) shows the new theme
      immediately.
- [ ] The toggled theme persists across a full page reload, on every route.
- [ ] Dark theme is the default on a completely fresh profile (no `localStorage` yet).

## 7. Mobile / small viewport

- [ ] Landing page: sections stack sensibly, the vertical rail either adapts or hides gracefully below ~720px, no
      horizontal overflow/scrollbar anywhere on the page.
- [ ] Level map: world lanes switch from horizontal to vertical layout below ~720px; every level node stays
      tappable (no overlap, reasonable touch target size).
- [ ] Level player: the lesson panel collapses into the documented mobile layout (pinned bar that expands into a
      sheet below ~720px) without covering/breaking the canvas underneath.
- [ ] Hero demo remains legible and doesn't overflow its container on a narrow viewport (small phone width, e.g.
      ~360px).

## 8. Reduced motion

With the OS/browser's "reduce motion" preference enabled:

- [ ] The hero demo shows the FINAL graph state immediately on load, with no step-by-step animation.
- [ ] The hero demo shows a static list of all the script's commands instead of the animated typed terminal line.
- [ ] There is no "Pausar" control shown in this mode (nothing is auto-playing to pause).
- [ ] Elsewhere in the app (graph choreography, toasts, success-screen star animation), motion is similarly
      reduced or skipped, consistent with the app's existing reduced-motion behavior (pre-dates this change —
      spot-check, not a new requirement from this batch).

## 9. World 6 — PR levels specifically

- [ ] `pr-01-abrir-pr`: opening a PR through the simulated web view (not a typed command) satisfies the goal.
- [ ] `pr-02-comentar-pr`: commenting on the open PR satisfies the goal.
- [ ] `pr-03-actualizar-rama`: pushing an additional commit to the PR's branch satisfies the goal (this level's
      solution is pure git commands, no PR web-view action required — confirm the hosting entry point is still
      reachable/optional, not required).
- [ ] `pr-04-fusionar-pr`: merging the PR with the "Squash" strategy through the web view satisfies the goal.
- [ ] `pr-05-cerrar-y-reabrir-pr`: closing then reopening the PR through the web view satisfies the goal.
- [ ] A failed/rejected PR action (e.g. attempting to merge a PR that isn't mergeable yet) still increments the
      level's live budget counter and shows a clear rejection message in the web view.
- [ ] Levels WITHOUT `hosting` set never show any PR/hosting entry point in their shell (spot-check a World 1-5
      level).

## Sign-off

- [ ] Tester name/date:
- [ ] Browser(s)/device(s) used:
- [ ] Overall result: PASS / PASS WITH NOTES / FAIL (see notes above)
