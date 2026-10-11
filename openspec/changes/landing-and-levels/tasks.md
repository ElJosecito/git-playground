# Tasks: Landing Page + Levels

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~3500-4500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Single PR (size:exception), sequential work-unit commits per phase — chaining not used per exception-ok |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Notes |
|---|---|---|---|
| 1 | Router+theme+lazy chunks+check-chunks | PR1 | Foundation |
| 2 | Workspace extraction+debugApi fix+homeHref | PR1 | PlaygroundShell tests stay green unedited |
| 3 | Level engine (predicates/steps/evaluate/counting) | PR1 | Spec text fix for counting |
| 4 | Level progress store | PR1 | No dependency |
| 5 | Level player | PR1 | Depends on 3,4 |
| 6 | Level map | PR1 | Depends on 4 |
| 7 | Curriculum, 6 worlds | PR1 | Depends on 3; spec hash-ref fix |
| 8 | Landing+hero demo | PR1 | Depends on 1 |
| 9 | Verify+QA | PR1 | Final gate |

## Phase 1: Router & Shell Foundation
- [x] 1.1 RED: `parseRoute`/`hashLocation`/`useHashRoute`, unknown-route/level redirects, locked guard, deep link, back/forward tests
- [x] 1.2 GREEN: `src/app/router/{routes,hashLocation,useHashRoute}.ts`, `RouteFrame`, `Redirect`, `src/app/theme/{themeStorage,ThemeProvider}.ts`
- [x] 1.3 GREEN: `App.tsx` route switch — landing eager, Playground/LevelMap/Level routes lazy; no-hash = landing
- [x] 1.4 RED+GREEN: `scripts/check-chunks.mjs` + `check:chunks` script, asserts entry excludes Playground/Level/engine chunks
- [x] 1.5 `npm test` (TZ=UTC) + `npm run build` + `npm run check:chunks`

  Deviations (see apply-progress for detail): the "locked guard" sub-scenario
  of 1.1 is deferred — it needs the level catalog/progress (Phase 4/7), which
  don't exist yet. `parseRoute` only does SYNTACTIC parsing (unknown
  top-level hash, malformed level id); unknown-catalog-id/locked-world
  checks are semantic and belong to the real `LevelRoute` (Phase 5/7).
  `src/routes/{LandingRoute,PlaygroundRoute,LevelMapRoute,LevelRoute}.tsx`
  were created now (routing needs real lazy-import targets) as PLACEHOLDERS
  for LevelMap/Level — 5.2/6.2 REPLACE their content, not create from
  scratch. `vite.config.ts` gained `build.manifest:true`;
  `vitest.config.ts`'s dom project gained `src/app/**/*.test.tsx`,
  `src/routes/**/*.test.tsx`, `src/__tests__/**/*.test.tsx`;
  `src/test/setup.dom.ts` gained a `window.scrollTo` stub.

## Phase 2: Workspace Extraction
- [x] 2.1 Safety net: run existing `PlaygroundShell` tests green before refactor
- [x] 2.2 RED: `useGitPlayground` onAction param, guarded `debugApi` cleanup, `ActionBar` showReset/homeHref tests
- [x] 2.3 GREEN: extract `src/components/workspace/{useWorkspace,WorkspaceView}.tsx`; `PlaygroundShell`/`LevelShell` compose it
- [x] 2.4 GREEN: `useGitPlayground.ts` onAction, `debugApi.ts` guarded cleanup, `ActionBar.tsx` homeHref/showReset
- [x] 2.5 `npm test` (TZ=UTC) — confirm original `PlaygroundShell` tests pass UNEDITED

  Deviations: `LevelShell` doesn't exist yet (Phase 5) so only
  `PlaygroundShell` composes `useWorkspace`/`WorkspaceView` this batch.
  `PlaygroundShell.module.css` was deleted (its one rule, `.root`, moved to
  the new `WorkspaceView.module.css`) — no other file referenced it.
  Added a focused `useWorkspace.test.tsx` for the new `hostingEnabled` gate
  (not covered by `PlaygroundShell`'s unedited approval-test suite).

## Phase 3: Level Engine
- [x] 3.1 RED: predicates, step-replay determinism (ignore `t`) + `LevelStepError`, `evaluateLevel`, counting (resolveConflict/saveFile/failed-PR count) tests
- [x] 3.2 GREEN: `src/engine/lessons/{types,predicates,steps,evaluate,counting}.ts`
- [x] 3.3 GREEN: `HostingView`/`useHostingView` PR-action completion callback (additive)
- [x] 3.4 Align spec `level-player` Command Budget Counter text: include resolveConflict/editor-save/failed-PR-action in counted set
- [x] 3.5 `npm test` (TZ=UTC)

  Deviations (full detail in apply-progress): 3.3 required NO new code —
  `useGitPlayground.ts`'s `onAction` (built in Phase 2) already fires
  `{kind:'hosting', op, ok}` for every PR action (success AND failure) and
  `{kind:'ui', action:'resolve'|'save'}` for `resolveConflict`/`saveFile`,
  exactly matching `counting.ts`'s `countsLiveAction` shapes — confirmed via
  `useGitPlayground.test.ts`'s existing hosting/ui `onAction` assertions.
  `HostingView` stays untouched per design. `LevelDef` has no stored
  `budget` field (design's literal Contract omits one): the budget is
  ALWAYS derived via `counting.ts`'s `computeBudget(level)` = counted
  solution length + `slack` (default 2), so curriculum authors (Phase 7)
  can never let a stored number drift from the solution script.

## Phase 4: Level Progress
- [x] 4.1 RED: schema parse/corruption fallback, stars rule, `computeUnlocks`, snapshot-version discard, quota retry, reset-progress-scope tests
- [x] 4.2 GREEN: `src/lessons/progress/{schema,store,stars,unlocks,ProgressContext}.ts`, `src/lessons/session.ts`
- [x] 4.3 `npm test` (TZ=UTC)
- [x] 4.4 Close the Phase 1/2 theme gap (apply-progress deviation #3): wire
  `PlaygroundShell` onto the app-level `ThemeProvider` (`src/app/theme/
  ThemeProvider.tsx`) instead of its own independent `useTheme` state, so a
  theme change made on one route applies to every other route sharing the
  same provider (app-shell spec delta "Theme set on one route applies to
  another"). `PlaygroundShell` still wraps itself in a `ThemeProvider` when
  no ancestor exists, so its own unedited `PlaygroundShell.test.tsx`/
  `PlaygroundShell.graphMemo.test.tsx` suites keep passing standalone.

  Deviations: `vitest.config.ts`'s `node` project gained
  `src/lessons/**/*.test.ts` and its `dom` project gained
  `src/lessons/**/*.test.tsx` (neither existed before this batch).
  `src/lessons/progress/store.ts`'s own test file needs `localStorage`, so
  it carries a per-file `// @vitest-environment jsdom` pragma while still
  living under the `node` project's glob — avoids a duplicate-match glob
  conflict between the two Vitest projects. `ProgressContext`'s
  `ProgressProvider` takes `levels: LevelUnlockMeta[]` as a prop rather than
  importing the real curriculum catalog, since `src/lessons/worldsMeta.ts`
  (Phase 7) doesn't exist yet.

## Phase 5: Level Player
- [x] 5.1 RED: solve flow, hint-caps-1-star, solution-counts-as-hint, reset, success-modal locked-world gating, live budget, snapshot restore tests
- [x] 5.2 GREEN: `src/components/levels/{LevelShell,LessonPanel,GoalChecklist,BudgetMeter,HintList,SolutionReveal,SuccessDialog}.tsx`, `src/routes/LevelRoute.tsx`
- [x] 5.3 `npm test` (TZ=UTC)

  Deviations (full detail in apply-progress): also added
  `src/components/levels/{useLevelSession,LockedLevel}.tsx` and
  `src/lessons/seed.ts` (not individually named in design.md's file list,
  which only globs `src/components/levels/*`) — `useLevelSession` wraps
  `src/lessons/session.ts` in a ref+state per design's "useLevelSession
  updates its ref synchronously"; `seedOf` is the memoized setup-replay
  design.md names explicitly. Catalog skeleton (`src/lessons/catalog/
  {index,w1-basicos}.ts`, `src/lessons/worldNames.ts`) pulled forward from
  Phase 7 per the apply instructions, with only 2 of World 1's 5 spec-table
  levels seeded (`basics-01-primer-commit`, `basics-02-status-y-stage`) —
  Phase 7 adds the rest. `src/__tests__/App.test.tsx`'s Phase-1 placeholder
  assertion for `#/niveles/:id` was updated to match the real level's
  title instead of the raw id (the placeholder behavior it tested no
  longer exists).

## Phase 6: Level Map
- [x] 6.1 RED: world lanes, locked aria-disabled, stars aria-label, "en curso" badge, reset-progress-confirm tests
- [x] 6.2 GREEN: `src/components/levels/{LevelMap,WorldLane,LevelNode}.tsx`, `src/routes/LevelMapRoute.tsx`
- [x] 6.3 `npm test` (TZ=UTC)

  Deviations: the spec's literal "total stars x/90" is derived as
  `catalog.levels.length * 3` instead of a hardcoded 90, since only 2 of
  the eventual 30 levels are seeded this batch — it becomes exactly 90
  once Phase 7 completes the curriculum, with no code change needed here.

## Phase 7: Curriculum (6 worlds, 30 levels) — DONE (Batch 4)
- [x] 7.0 Spec fix: `branching-05` solution → `cherry-pick hotfix`; `undo-05` solution → `revert HEAD~1` (no literal hashes) — applied directly in `src/lessons/catalog/w2-ramas.ts`/`w4-deshacer.ts`'s real `solution` scripts (the spec text's own table was already corrected in a prior batch's note; this batch is where the code catches up)
- [x] 7.1-7.12 Per world (w1-w6): RED solvability suite (setup unsolved, solution solves, countsToward<=budget, no NO-map commands) then GREEN `src/lessons/catalog/w{N}-*.ts`
- [x] 7.13 GREEN: `src/lessons/catalog/index.ts`, `src/lessons/worldsMeta.ts`
- [x] 7.14 `npm test` (TZ=UTC) — full catalog solvability suite green

  Deviations (full detail in apply-progress): added 5 new reusable pure
  predicates to `src/engine/lessons/predicates.ts` (`isMergeCommit`,
  `remoteBranchAt`, `remoteIsAncestorOfLocal`, `visitedBranch`,
  `prCommentCount`) — same style as the original 19, needed for World
  3/5/6 goals. `merge-04-abortar-merge` and `undo-04-guardar-con-stash`
  have their setup pre-stage the in-progress/stashed state (so the level
  is "cancel it" / "pop it back", not "do it then cancel it") because the
  engine leaves no durable trace of an attempted-then-aborted merge or a
  pushed-then-popped stash — checking only final `RepoState` shape can't
  otherwise tell "never tried" apart from "tried and undid it"; this is
  reflected in each level's `objective` text. `branching-02-cambiar-ramas`
  uses a new `visitedBranch` reflog check for the same reason (so staying
  on `main` the whole time doesn't trivially pass). `pr-03-actualizar-rama`
  (World 6) ends up with `hosting` unset/false — its solution script is all
  git commands, no PR action, which the generic solvability test's "hosting
  flag iff a hosting step exists in the SOLUTION" check (Batch 3's own
  rule) requires. Several levels' derived budgets differ slightly from the
  spec table's planning sketch (e.g. `merge-01-fast-forward` derives to 4
  not 3, `undo-04`/`remote-01` etc.) — per design.md, budget is NEVER a
  stored/fixed field, always `computeBudget(level)`, so these are expected,
  not bugs. Two pre-existing tests needed updating as an anticipated and
  explicitly flagged consequence of the catalog growing from 2 to 30 levels
  (both already called out by name in Batch 3's own deviation notes):
  `LevelMap.test.tsx`'s `'0 / 6'` → `'0 / 90'`, and `LevelShell.test.tsx`'s
  "no next level" test now clones `basics02StatusYStage` with an id that
  isn't in the catalog at all (so `nextLevelOf`'s `idx < 0` branch returns
  `null` regardless of catalog size, instead of relying on `basics-02`
  literally being the last seeded level).

## Phase 8: Landing Page — DONE (Batch 5)
- [x] 8.1 RED: `HeroDemo` fake-timer tests — real-engine script replay, loop, reduced-motion static frame, pause
- [x] 8.2 RED: CTA navigation + `WorldsPreview` (worldsMeta-driven, no catalog import) tests
- [x] 8.3 GREEN: `src/components/landing/{Hero,HeroDemo,Features,HowItWorks,WorldsPreview,CTA}.tsx`, hover/focus preload in `routes.ts`
- [x] 8.4 `npm test` (TZ=UTC) + `npm run build` + `npm run check:chunks`

  Deviations (full detail in apply-progress Batch 5): Hero's `h1` keeps the
  literal text "Git Playground" (not a creative headline) because
  `src/__tests__/App.test.tsx` — a baseline test from Batch 1, not owned by
  this batch — asserts the landing route's `h1` by that exact accessible
  name; the actual pitch copy is a tagline paragraph right below it instead.
  `global.css`'s `body { overflow: hidden }` (written for the single-canvas
  sandbox era) is now scoped to `body:not([data-scroll-page])`, with
  `LandingRoute` setting `data-scroll-page` on `<body>` for as long as it's
  mounted — needed because the landing page is the first normal SCROLLING
  document route in an app whose global CSS previously assumed a single
  fixed-viewport canvas for the whole lifetime of the page. `colors.ts`
  hand-copies the engine's `PALETA` hex values rather than importing them,
  since eager landing modules may only `import type` from the engine
  (landing-page spec "Code-Split Isolation").

## Phase 9: Verification & QA — Batch 5
- [x] 9.1 Full `npm test` (TZ=UTC) + `npm run build` + `npm run check:chunks` — see apply-progress Batch 5 for exact counts/sizes
- [ ] 9.2 Manual QA (human gate, NOT RUN): see `openspec/changes/landing-and-levels/qa-checklist.md` — routes/back-forward/deep-link/locked-guard, landing, every world, stars/unlocks, reset, reload persistence, cross-route theme, mobile, reduced motion, World 6 PR flows. This checkbox stays `[ ]` until a human walks that checklist and signs off.
- [x] 9.3 Confirm parity tests untouched and green — `src/engine/__tests__/parity/parity.test.ts` and `src/engine/commands/__tests__/*` were not touched by this change at any point across all 5 batches; full suite (including these) is green
