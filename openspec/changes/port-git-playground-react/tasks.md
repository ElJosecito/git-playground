# Tasks: Port Git Playground to Vite + React + TypeScript

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 6000-9000 (new engine ~2500, tests ~2500, UI+hooks ~2500, styles/config ~500) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes (as work-unit commits within one accepted delivery) |
| Suggested split | Single PR, `size:exception`, 7 work-unit commits |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Scaffold + parity harness + engine core (state/hash/refs) | single PR, commit 1 | Base for all later units |
| 2 | Remaining engine modules + full parity corpus green | single PR, commit 2 | Depends on 1 |
| 3 | React shell + reducer + terminal | single PR, commit 3 | Depends on 2 |
| 4 | SVG graph + camera | single PR, commit 4 | Depends on 3 |
| 5 | WAAPI choreography | single PR, commit 5 | Depends on 4 |
| 6 | Files strip/toasts/tooltip/resolver/editor/action bar/empty state | single PR, commit 6 | Depends on 3 |
| 7 | Theme/persistence/debug API/mobile/a11y + manual QA | single PR, commit 7 | Depends on 6 — [x] DONE (automated scope; 7.11's manual QA checklist is a human gate, written but not executed by this agent) |

Exception recorded: user accepted `size:exception` for one PR delivered as 7 reviewable commits (work-unit-commits skill applied per slice).

## Phase 1 (Work Unit 1): Scaffold + Parity Harness + Engine Core

- [x] 1.1 Scaffold `package.json`, `vite.config.ts`, `vitest.config.ts` (two projects: `node`, `dom`), `tsconfig*.json` (D13: strict, `noUncheckedIndexedAccess: false`), `index.html`, `src/main.tsx`, `App.tsx`, `global.d.ts`, `vite-env.d.ts`
- [x] 1.2 Add `src/test/setup.dom.ts` stubbing `Element.prototype.animate`, `document.getAnimations`, `SVGElement.getTotalLength`, `matchMedia`, `ResizeObserver`, `CSS.escape`, `setPointerCapture`; set `TZ=UTC` in npm test script
- [x] 1.3 RED: write `src/engine/__tests__/parity/parity.test.ts` skeleton + `loadOriginal.ts` (`?raw` import, `new Function('window', src)(shim)`) + `corpus.ts` (seed step) — expect failure (no engine yet)
- [x] 1.4 GREEN: create `src/engine/types.ts`, `constants.ts` to satisfy harness imports; verify harness loads oracle and fails only on missing engine calls
- [x] 1.5 RED: write `src/engine/__tests__/hash.test.ts` with bit-exact `hashStr` vectors from oracle
- [x] 1.6 GREEN: implement `src/engine/hash.ts` (`hashStr`) to pass 1.5
- [x] 1.7 RED: write `src/engine/__tests__/state.test.ts` covering `vacio`, `ensureColor`, `colorRama`, `laneFor`, `nuevoCommit`, `headHash`, `setHead` (insertion-order lane/color per D2)
- [x] 1.8 GREEN: implement `src/engine/state.ts`, `refs.ts`, `tokens.ts` to pass 1.7
- [x] 1.9 Verify: `npm test -- --project node src/engine/__tests__/state.test.ts src/engine/__tests__/hash.test.ts`

## Phase 2 (Work Unit 2): Remaining Engine Modules + Full Parity Corpus

- [x] 2.1 RED: write `src/engine/__tests__/diff.test.ts` (`diffTxt`, `hunks`, `fusionLineas`, `fusionar3` auto-merge and conflict cases, `marcadores`, `aplicarResultado`, `cambiosCommit`, `diffArboles`)
- [x] 2.2 GREEN: implement `src/engine/diff.ts`, `files.ts`, `format.ts`, `util.ts`, `errors.ts`, `markup.ts`
- [x] 2.3 RED: write `src/engine/commands/__tests__/basics.test.ts`, `history.test.ts`, `branches.test.ts` for basic/log/branch commands
- [x] 2.4 GREEN: implement `src/engine/commands/basics.ts`, `history.ts`, `branches.ts`, `commands/index.ts` dispatch table
- [x] 2.5 RED: write `src/engine/commands/__tests__/integrate.test.ts`, `undo.test.ts` (merge/rebase/cherry-pick/revert `op` state machine, `--continue`/`--abort`)
- [x] 2.6 GREEN: implement `src/engine/commands/integrate.ts`, `undo.ts`, `branching.ts`, `events.ts`
- [x] 2.7 RED: write `src/engine/commands/__tests__/remote.test.ts`, `unsupported.test.ts` (fixed `origin`, `companero()`, diverged-push rejection, typo suggestion)
- [x] 2.8 GREEN: implement `src/engine/commands/remote.ts`, `commands/unsupported.ts`, `shell.ts`
- [x] 2.9 RED: write `src/engine/__tests__/run.test.ts`, `explain.test.ts`, `layout.test.ts`, `completion.test.ts`, `info.test.ts`
- [x] 2.10 GREEN: implement `src/engine/run.ts`, `explain.ts`, `layout.ts`, `completion.ts`, `info.ts`, `recorder.ts`, `graph.ts`, `index.ts` (`GitEngine` facade)
- [x] 2.11 Extend `corpus.ts` with full command corpus (`{cmd}`, `{escribir}`, `{resolver}`, `{companero}` steps) comparing `salida`/`eventos`/`error`/`accion`/`estado` plus `explicar`/`layout`/`completar` at checkpoints, with `toEqual` and `JSON.stringify` equality
- [x] 2.12 Verify: `npm test -- --project node` (all engine unit + parity tests green)

## Phase 3 (Work Unit 3): React Shell + Reducer + Terminal

- [x] 3.1 RED: write `src/app/playgroundReducer.test.ts` covering all actions (`applied`, `echoed`, `cleared`, `editorOpened/Changed/Closed`, `repoLoaded`, `inputChanged`, `linesAppended`, `liveSet`, `resolverToggled`, `resetMenuToggled`) and exhaustive `never` check
- [x] 3.2 GREEN: implement `src/app/playgroundReducer.ts` per design state shape (`repo, lines, nextLineId, input, editor, resolverHidden, resetOpen, live, transition`)
- [x] 3.3 RED: write `src/app/useGitPlayground.test.ts` (jsdom) asserting handler calls engine (D1: in handler, not reducer), updates `repoRef`, dispatches `applied`
- [x] 3.4 GREEN: implement `src/app/useGitPlayground.ts` (handlers: run/resolver/companero/escribir → `applyResult`)
- [x] 3.5 RED: write `src/app/debugApi.test.ts` asserting `window.GitPlayground` shape `{estado, ejecutar, motor, cargar}`
- [x] 3.6 GREEN: implement `src/app/debugApi.ts`
- [x] 3.7 RED: write `src/hooks/useTerminalWindow.test.ts` (geom/min/max/box/open/resizable/camBottom, drag/resize clamping)
- [x] 3.8 GREEN: implement `src/hooks/useTerminalWindow.ts`
- [x] 3.9 RED: write `src/ui/selectors.test.ts`, `markup.test.ts` (`promptSegs`, markup→colored spans)
- [x] 3.10 GREEN: implement `src/ui/selectors.ts`, `ui/markup.ts`
- [x] 3.11 RED: write `src/components/TerminalWindow.test.tsx`, `TerminalLine.test.tsx` (input/output rendering, history ↑/↓ persisted `gitpg:v1.hist`, Tab completion, colored prompt, unknown-command suggestion rendered unmodified)
- [x] 3.12 GREEN: implement `src/components/TerminalWindow.tsx`, `TerminalLine.tsx`, `SegText.tsx` + `.module.css`
- [x] 3.13 Verify: `npm test -- --project node src/app` and `npm test -- --project dom src/components/TerminalWindow.test.tsx`

## Phase 4 (Work Unit 4): SVG Graph + Camera

- [x] 4.1 RED: write `src/ui/layoutCache.test.ts` (module-level `WeakMap<RepoState, Layout>` per D7)
- [x] 4.2 GREEN: implement `src/ui/layoutCache.ts`, `ui/color.ts`
- [x] 4.3 RED: write `src/ui/geometry.test.ts` (`safeArea`, `fitCam`, `easeIO`, `clamp`)
- [x] 4.4 GREEN: implement `src/ui/geometry.ts`
- [x] 4.5 RED: write `src/hooks/useCamera.test.ts` (jsdom) asserting imperative `setAttribute` on world `<g>` (D10), wheel listener non-passive, `fitAll`/`centerHead`/`w2s`
- [x] 4.6 GREEN: implement `src/hooks/useCamera.ts`
- [x] 4.7 RED: write `src/components/GraphLayer.test.tsx` (single memoized layer, deps `[layout, planVersion, tipId, handlers]` per D8) and `Canvas.test.tsx` (pan/zoom/drag/pinch scenarios, safe-area fit/center excludes terminal footprint)
- [x] 4.8 GREEN: implement `src/components/Canvas.tsx`, `GraphLayer.tsx`, `CameraControls.tsx` + `.module.css`
- [x] 4.9 Verify: `npm test -- --project dom src/components/Canvas.test.tsx src/components/GraphLayer.test.tsx`

## Phase 5 (Work Unit 5): WAAPI Choreography

- [x] 5.1 RED: write `src/ui/plan.test.ts` (`mkPlan` pure function from consecutive `layout()` snapshots)
- [x] 5.2 GREEN: implement `src/ui/plan.ts`, `ui/motion.ts` (TS mirrors of `--dur-*`/`--ease-*` incl. `--ease-spring`)
- [x] 5.3 RED: write `src/hooks/useChoreography.test.ts` (jsdom, stubbed `animate`) asserting `WeakMap<Element, Plan>` birth guard (D6), `useLayoutEffect` keyed on `transition.id` timing (D5), stubbed animate does not throw/block state
- [x] 5.4 GREEN: implement `src/hooks/useChoreography.ts`
- [x] 5.5 RED: write `src/components/FlyOverlay.test.tsx` asserting React renders empty containers only, no reconciled children (D9)
- [x] 5.6 GREEN: implement `src/components/FlyOverlay.tsx` + overlay `<div>` and `<g data-fx>` wiring (deviation: `<g data-fx>` lives in `GraphLayer.tsx`'s world `<g>`, not `Canvas.tsx` — `Canvas` is a dumb non-SVG wrapper div with no access to the world group; `GraphLayer` is the component that owns the SVG D9 requires `<g data-fx>` inside)
- [x] 5.7 Verify: `npm test -- --project dom src/hooks/useChoreography.test.ts src/components/FlyOverlay.test.tsx` — 11/11 passing; also ran full `npm test` (565/565), `npx tsc -b --noEmit` (0 errors), `npm run build` (succeeds)

## Phase 6 (Work Unit 6): Files Strip, Toasts, Tooltip, Resolver, Editor, Action Bar, Empty State

- [x] 6.1 RED: write `src/ui/selectors.test.ts` additions (`filesModel`, `stripSummary`, `resolverModel`) and `src/ui/tooltip.test.ts` (`tipData`, `tipPlacement`, world→screen)
- [x] 6.2 GREEN: implement selector additions + `ui/tooltip.ts`
- [x] 6.3 RED: write `src/hooks/useToasts.test.ts` (max 2, double-rAF enter, 4000ms auto-dismiss, 300ms removal, timers cleared on unmount) and `useTooltip.test.ts` (120ms hover delay, pointerdown dismiss)
- [x] 6.4 GREEN: implement `src/hooks/useToasts.ts`, `useTooltip.ts`
- [x] 6.5 RED: write component tests: `FilesStrip.test.tsx` (3 columns + mobile variant), `ConflictResolver.test.tsx`/`ConflictPill.test.tsx` (mine/theirs/both/edit → `resolver(...)`, collapse to pill), `FileEditorModal.test.tsx` (Ctrl+Enter save via `escribir`, Esc cancel), `ToastStack.test.tsx`, `Tooltip.test.tsx`, `ActionBar.test.tsx` (teammate trigger, theme toggle, reset 2-step confirm), `EmptyState.test.tsx` (`!estado.inited`)
- [x] 6.6 GREEN: implement `FilesStrip.tsx`, `ConflictResolver.tsx`, `ConflictPill.tsx`, `FileEditorModal.tsx`, `ToastStack.tsx`, `Tooltip.tsx`, `ActionBar.tsx`, `EmptyState.tsx` + `.module.css` each
- [x] 6.7 Verify: `npm test -- --project dom src/components` — 62/62

## Phase 7 (Work Unit 7): Theme, Persistence, Debug API Wiring, Mobile, Accessibility + Manual QA

- [x] 7.1 RED: write `src/hooks/useTheme.test.ts` (dark default, `data-theme` set on mount via layout effect and on toggle, persisted)
- [x] 7.2 GREEN: implement `src/hooks/useTheme.ts` (`src/styles/theme.css`'s full token set already shipped in Phase 3)
- [x] 7.3 RED: write `src/hooks/usePersistence.test.ts` (`gitpg:v1` round trip, legacy/corrupt/missing storage fallback to `ejemplo()`, `hist.slice(-100)`, explicit `save()` calls per D12, try/catch on read+write)
- [x] 7.4 GREEN: implement `src/hooks/usePersistence.ts`; wire explicit `persist()` calls in `useGitPlayground.ts` handlers (apply/clear/load) and a `persistNow()` escape hatch for the theme toggle (owned one level up, in `PlaygroundShell`)
- [x] 7.5 RED: write `src/hooks/useMobile.test.ts` (ResizeObserver + window resize, `vw < 720` breakpoint)
- [x] 7.6 GREEN: implement `src/hooks/useMobile.ts`; wire into `PlaygroundShell` (replacing its ad hoc `useViewport()`), flowing `mobile` into `TerminalWindow.tsx`/`FilesStrip.tsx` props and into `useCamera`'s `envRef` (which already drives `Canvas`'s safe-area via `safe()`)
- [x] 7.7 RED: write `src/components/LiveRegion.test.tsx` (`aria-live` announces command results/errors) and `src/hooks/useReducedMotion.test.ts`
- [x] 7.8 GREEN: implement `src/components/LiveRegion.tsx`, `src/hooks/useReducedMotion.ts`; wire into `PlaygroundShell` (`live` state dispatch from `useChoreography.after()` already landed in Phase 5 — this batch just renders `<LiveRegion>` and feeds the real `reducedRef`, replacing the Phase 4-6 hardcoded `false`)
- [x] 7.9 Assemble `src/components/PlaygroundShell.tsx` composition (Canvas/FilesStrip/ActionBar/ToastStack/Tooltip/ConflictResolver/ConflictPill/FileEditorModal/CameraControls/TerminalWindow/FlyOverlay/LiveRegion) and reduce `App.tsx` to `App -> PlaygroundShell` per design's component tree. Also fixed a Ctrl+L parity deviation caught during this batch: Ctrl+L was wired to `run('clear')` (clears lines AND input, the `clear`/`cls` typed-command behavior) instead of the oracle's own Ctrl+L handler (lines only, input untouched) — added a dedicated `linesCleared` reducer action + `useGitPlayground.clearLines()` handler and rewired `onClearLines`
- [x] 7.10 Verify full suite: `npm test` (602/602), `npx tsc -b --noEmit` (0 errors), `npm run build` (succeeds)
- [x] 7.11 Manual QA checklist written to `openspec/changes/port-git-playground-react/qa-checklist.md` (human gate — NOT executed by this agent): choreography timing matches oracle feel; camera pan/zoom/fit/center-on-HEAD; mobile bottom-sheet terminal + files-strip + camera safe-area as one cohesive concern; theme toggle light/dark + persistence; existing `gitpg:v1` data loads correctly; `window.GitPlayground.{estado,ejecutar,motor,cargar}` usable from devtools console; Ctrl+L vs `clear`/`cls` parity; reset menu; reduced motion; Spanish copy spot-check

## Dependency Notes

Phase 1 → 2 (engine core before full engine) → 3 (shell needs engine) → {4, 6} (graph and panels both depend on shell/reducer, can parallelize after 3) → 5 (choreography needs graph refs from 4) → 7 (cross-cutting, needs 3+4+5+6). Within each phase, RED tasks are strictly sequential before their paired GREEN task (TDD RED→GREEN). Tasks sharing a phase but no RED/GREEN pairing (e.g. 7.9 assembly) may run after their inputs land.
