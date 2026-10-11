# Design: Landing Page + Levels

## Technical Approach

Additive, route-gated. The app root becomes a hand-rolled hash router (`useSyncExternalStore` over `hashchange`). The landing route is eager. Sandbox, level map and level player are `React.lazy` chunks. The sandbox body moves into a shared **workspace** (`useWorkspace` hook + `WorkspaceView` component). `PlaygroundShell` and the new `LevelShell` both compose it, so nothing is forked. Levels are data (`LevelDef`) plus pure predicates in `src/engine/lessons/`. Setup and solution steps replay through the real `GitEngine` facade. The checklist is derived render state. Progress lives in a new `gitpg:levels:v1` key. `gitpg:v1` keeps its shape: the theme moves to an app-level provider that rewrites only the `theme` field.

## Architecture Decisions

| Topic | Options | Tradeoff | Decision |
|---|---|---|---|
| Router | react-router / hand-rolled hash | dependency vs ~120 LOC | **Hand-rolled hash**. Pure `parseRoute`. `navigate(to,{replace})`. Replace uses `history.replaceState` plus a manual emit, because replaceState fires no `hashchange` |
| Chunking | everything lazy / landing eager | sandbox users also download the landing (it is small) | **Landing eager, its `HeroDemo` lazy**. Playground, LevelMap and Level are each lazy. Loaders live in `routes.ts` and are preloaded on CTA hover/focus |
| Hero rendering | static SVG / mock / real engine + `GraphLayer` | the engine chunk (~shared with playground) vs authenticity | **Real engine + `GraphLayer`, lazily loaded** inside the landing. A static skeleton SVG is the Suspense fallback, so first paint never waits on the engine |
| Shell reuse | copy PlaygroundShell / extract | refactor risk | **Extract `useWorkspace` + `WorkspaceView`** with slots. Existing `PlaygroundShell` tests stay unchanged (they mock `../GraphLayer` by module id, so the mock still applies) |
| Theme | per-shell / app-level | `gitpg:v1` must stay byte-compatible | **`ThemeProvider` at App level**. It reads `theme` from `gitpg:v1` and writes by read-modify-write of `theme` only (missing key → `{theme}`). If no provider exists, `PlaygroundShell` wraps itself in one, so its standalone tests keep passing. Sandbox `persist` reads the context theme through a ref, so key order `{repo,theme,hist}` is preserved |
| PR action reporting | `HostingView` callback / handler layer | every HostingView action already goes through `playground.hosting.*` | **Report at the handler layer** (`onAction`). `HostingView` stays untouched. This satisfies "expose PR-action completion to host" via `{op, ok}` |
| Command counting | count in shell / hook in `useGitPlayground` | the shell can't see failures or the debug API | Optional `options.onAction` in `useGitPlayground`, fired **at handler entry, before engine/persist**. Classification is pure: `countsToward()` |
| Level reset | `loadRepo(seed)` / remount | camera, terminal and hints all need clearing | **Clear snapshot + remount** via key `${id}:${nonce}` |
| Debug API | per-shell install | unmount-order hazard | Keep the install in `useGitPlayground`. The cleanup deletes only if `target.GitPlayground === api`. Landing and map leave it undefined |
| Snapshots | ledger only / snapshot per level | quota | Snapshot per level. On `QuotaExceededError`, drop the other snapshots and retry once |
| Setup | hand-built `RepoState` / step replay | determinism | **Replay from `vacio()`**. Hashes come from `s.seq`. Commit `t` is `Date.now()` and is not part of the hash, so **predicates must never read `t`**. Seeds are memoized per level in a module `Map` |

## Data Flow

    hashchange ─> hashLocation.emit ─> useHashRoute ─> App switch ─> <Suspense><RouteFrame key><Lazy/></RouteFrame>
                                                                       (focus/title/scroll on commit)
    LevelRoute: catalog.byId ─ unlocked? ─ snapshot valid(levelVersion, repo.v===1)? ─> initialRepo = snap.repo ?? seedOf(level)
    LevelShell ─> useWorkspace({persistence: level deps, onAction, hostingEnabled})
       run/hosting/resolve/save ─> onAction ─> session.dispatch (sync ref) ─> engine ─> applyResult ─> persist ─> store.saveSnapshot
       render: evaluation = useMemo(evaluateLevel(level, repo)) ─> LessonPanel checklist
       effect[solved] ─> store.complete(id, starsFor(session, budget)) + clearSnapshot ─> SuccessDialog

## Router

`routes.ts`: `type Route = {name:'landing'} | {name:'playground'} | {name:'levels'} | {name:'level', id} | {name:'redirect', to}`. Inputs `''`, `#`, `#/` map to landing. Trailing slashes are normalized. The id must match `^[a-z0-9-]+$`, otherwise the route redirects to `#/niveles`. Anything else redirects to `#/` (replace). An unknown catalog id is handled in `LevelRoute` (`<Redirect to="#/niveles" replace/>`). Locked levels render `LockedLevel`.

`RouteFrame` (keyed by route) handles three things in `useLayoutEffect`, which runs once the lazy content commits:
- sets `document.title`;
- after a push navigation, scrolls to the top;
- after a pop (a `hashchange` with no pending-push flag), restores scrollY from an in-memory `Map<hash, y>` saved on leave. `history.scrollRestoration='manual'`.

On every non-initial navigation it focuses `[data-route-focus]` (an h1 with `tabIndex=-1`, `preventScroll`). In-page landing links use `scrollIntoView` buttons, never `#anchors`.

## Workspace Extraction

`useWorkspace(opts)` takes over everything `PlaygroundShell` owns today:
- the refs `canvas`, `root`, `overlay`, `fx` and `termWindow`;
- the hooks `useMobile`, `useTerminalWindow`, `useReducedMotion`, `useToasts`, `useTooltip`, `useCamera`, `useChoreography`, `useGitPlayground(choreo, opts.persistence, {onAction, bootLines})` and `useHostingView`;
- the `envRef`/`graphRef` render-time sync, the initial-fit effect and the `graphHandlers` memo (`onRemoteBoxClick` only when `hostingEnabled`);
- the strip toggles, `tip`, the selectors, `prs`/`hostingCount`/`activePrView`, and `NO_LEAVING_LABELS`.

`WorkspaceView({ws, toolbar, emptyState?, className, children})` renders the same tree as today, with `toolbar` placed where `ActionBar` is now.

`PlaygroundShell` is left with `usePersistence`, the theme ref, `useWorkspace` and `<ActionBar>`. `ActionBar` gains optional `showReset` (default true) and `homeHref`.

`useGitPlayground` changes are additive:
- a 3rd param `{onAction?, bootLines?}`;
- `debugApi` gets the guarded cleanup.

`LevelShell` is keyed `${id}:${nonce}` and passes these level deps:
- `initialRepo`: the snapshot repo, or `seedOf(level)`.
- `initialHist`: the snapshot hist, or `[]`. Never the sandbox history slot.
- `persist`: writes a snapshot of `{repo, hist}` plus `sessionRef` (count, hints, solution).
  - No-op once the level is completed.
  - Skipped while `repo === seed` and the session is untouched.

`useLevelSession` updates its ref synchronously inside `onAction`, so the `persist` call for the same command already sees the new count.

Bundle boundary: the eager modules (`App`, router, `ThemeProvider`, `ProgressContext`, Landing) may use only `import type` from `src/engine`.

## Interfaces / Contracts

```ts
// src/engine/lessons/types.ts
type HostingAction =
  | { pr: 'create'; input: CreatePullRequestInput } | { pr: 'comment'; id: number; body: string }
  | { pr: 'close' | 'reopen'; id: number } | { pr: 'merge'; id: number; strategy: MergeStrategy; deleteBranch: boolean };
type Step = string | HostingAction;
interface Goal { id: string; label: string; check(s: RepoState): boolean }   // pure, state-only
interface LevelDef { id: string; world: WorldId; order: number; version: number; title: string;
  objective: string; theory: string[]; setup: Step[]; solution: Step[]; goals: Goal[];
  hints: string[]; slack?: number /*default 2*/; hosting?: boolean }
interface Evaluation { goals: { id: string; label: string; done: boolean }[]; solved: boolean }
type PlayerAction = { kind: 'command'; text: string } | { kind: 'hosting'; op: HostingAction['pr']; ok: boolean }
                  | { kind: 'ui'; op: 'resolve' | 'save' };
// steps.ts: applySteps(s, steps): RepoState (throws LevelStepError on res.error / editar); seedOf(level)
// counting.ts: isReadOnly(text), countsToward(a: PlayerAction|Step): 0|1, budgetOf(level)
// progress/schema.ts
interface LevelsStoreV1 { v: 1; completed: Record<string, { stars: 1|2|3; bestCount: number; at: number }>;
  inProgress: Record<string, { levelVersion: number; repo: RepoState; hist: string[];
    hintsUsed: number; solutionShown: boolean; count: number }> }
```

- **Read-only commands** (`GitEngine.tokens`):
  - git subcommands: `status`, `log`, `show`, `diff`, `reflog`, `help`, `version`/`--version`;
  - `branch` alone or with list flags (`-a`, `-r`, `-v`, `-vv`, `--list`);
  - `remote` alone or `-v`;
  - `stash list|show`;
  - `tag` alone or `-l`;
  - shell commands: `ls`, `cat`, `pwd`, `clear`, `cls`, `help`.

  Everything else counts, including failures and typos.
- **Budget**: `budget = Σ countsToward(solution) + slack`.
- **Stars**: hint or solution used → 1, else `count <= budget` → 3, else 2. The ledger keeps the max.
- **Unlocks**: `computeUnlocks(worlds, completed)` is pure. Inside a world it is linear by `order`. World N+1 opens when world N is complete.
- **Parse**: invalid JSON, wrong shape or `v !== 1` → an empty store (future: `switch(v)` migrations). Snapshots with `repo.v !== 1` are dropped. A `levelVersion` mismatch is discarded at load.
- **Predicates** (`predicates.ts`, built on `refs.ts` `isAnc`/`aheadBehind`/`resolve` and `hosting/state.hostingOf`):
  - branches and HEAD: `currentBranch`, `isDetached`, `branchExists`, `branchAt`, `commitCount`, `headMessage`;
  - files and working tree: `fileTracked`, `fileStaged`, `fileContent`, `workingClean`, `hasConflict`, `opInProgress`;
  - history: `isMerged(s,b,into)`, `isLinear`, `tagAt`, `stashCount`;
  - remote: `remoteHasBranch`, `isPushed`, `upstreamOf`;
  - pull requests: `prWith(s,{source,target,status})`.

## UI

- **LevelMap**: a header (Inicio, total stars `x/90`, "Reiniciar progreso" behind a confirm dialog), then 6 `WorldLane`s. Each lane is drawn as a git lane in the world's branch color. Levels are an `<ol>` of commit-dot `LevelNode`s:
  - unlocked levels are links;
  - locked levels have `aria-disabled` and a lock icon;
  - stars carry an `aria-label` ("2 de 3 estrellas");
  - levels with a snapshot show an "en curso" badge.

  Lanes are horizontal at ≥720px and vertical on mobile.
- **LevelShell**:
  - Layout:
    - ≥1024px: grid `minmax(320px,380px) 1fr`, with `LessonPanel` on the left and the workspace on the right (root `position:relative`; `useMobile` measures the canvas, so the terminal stays inside the stage);
    - 720–1023px: a 300px panel that can collapse;
    - <720px: a pinned top `ObjectiveBar` (objective, goals `2/3`, budget) that expands into a sheet (new `--z-lesson: 27`).
  - `LessonPanel` contents:
    - breadcrumb and h1 (the route-focus target);
    - the objective;
    - "Teoría" in `<details>`, open while the level has no snapshot;
    - `GoalChecklist`: `data-done` drives a CSS pop and color change, the previous done-set is kept in a ref, and a polite live message reads "Objetivo cumplido: …"; goals can also regress;
    - `BudgetMeter` "Acciones 4 / 6", with a warning past budget;
    - `HintList`: shows a "limita a 1 estrella" note before the first reveal, then reveals one hint at a time;
    - `SolutionReveal`: behind a confirm; CLI steps render as code, hosting steps as prose;
    - "Reiniciar nivel" and "Volver al mapa".
  - Toolbar: `ActionBar` with `showMate=false`, `showReset=false`, and hosting only when `level.hosting`.
  - `SuccessDialog`: a modal dialog with a focus trap. Stars fill in a stagger. It shows the stats. Actions: "Siguiente nivel" (autofocus; "Siguiente mundo" or "Ver mapa" at the ends), "Repetir", "Volver al mapa". Esc means "Seguir explorando". Sessions that are already completed stop persisting.
- **Landing**, visual direction "commit-log editorial":
  - a single vertical graph rail runs down the page;
  - each section is a "commit" whose heading is prefixed by a mono short hash and a branch-color tag;
  - a dotted grid (`--bg-grid-dot`) fades out under a radial mask;
  - Geist display type: tight tracking, `clamp()` sizes;
  - `PALETA` branch colors as sharp accents only;
  - CTAs read as commands ("Empezar niveles" over mono `git switch niveles`). A "Continuar en modo libre" CTA is shown when `gitpg:v1` exists;
  - sections: Hero → Features → How it works → WorldsPreview (a metro map, from `worldsMeta.ts`, no catalog import) → CTA band;
  - one staggered load reveal; reduced motion disables it.
- **HeroDemo**:
  - `heroScript.ts` steps are scanned once into frames `{cmd, repo}`. The script is chosen so that existing nodes never move.
  - A setTimeout chain types each char (45ms), holds 600ms after Enter, swaps the frame (new `[data-h]` nodes animate in via CSS keyframes), holds 3s at the end, fades and loops.
  - It pauses on `document.hidden`, off-screen (IntersectionObserver), or via a visible Pausar button (WCAG 2.2.2).
  - Reduced motion: final frame, static script list, no loop.
  - The graph is `aria-hidden` with a text description. A fit transform from the layout bounds is set on `worldRef`.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/App.tsx` | Modify | ThemeProvider + ProgressProvider + route switch |
| `src/app/router/{routes,hashLocation,useHashRoute}.ts`, `RouteFrame.tsx`, `Redirect.tsx` | Create | Router |
| `src/app/theme/{themeStorage.ts,ThemeProvider.tsx}` | Create | App-wide theme, `theme`-field RMW |
| `src/components/workspace/{useWorkspace.ts,WorkspaceView.tsx,.module.css}` | Create | Shared shell body |
| `src/components/PlaygroundShell.tsx` | Modify | Composes the workspace; self-wraps ThemeProvider when no provider exists |
| `src/app/useGitPlayground.ts` | Modify | Options `{onAction, bootLines}` |
| `src/app/debugApi.ts` | Modify | Guarded cleanup |
| `src/components/ActionBar.tsx` | Modify | Optional `showReset`, `homeHref` |
| `src/routes/{PlaygroundRoute,LevelMapRoute,LevelRoute}.tsx` | Create | Lazy entries |
| `src/engine/lessons/{types,predicates,steps,evaluate,counting}.ts` | Create | Pure level engine |
| `src/lessons/catalog/{index,w1-basicos,w2-ramas,w3-merge,w4-deshacer,w5-remoto,w6-colaboracion}.ts`, `worldsMeta.ts` | Create | One file per world |
| `src/lessons/progress/{schema,store,stars,unlocks}.ts`, `ProgressContext.tsx`, `src/lessons/session.ts` | Create | Progress + session (ref-synchronous reducer) |
| `src/components/levels/*`, `src/components/landing/*` | Create | UI above |
| `src/styles/theme.css` | Modify | `--z-lesson`, `--z-dialog`, landing tokens |
| `scripts/check-chunks.mjs`, `package.json` | Create/Modify | `check:chunks`: from `vite build --manifest`, assert the entry imports exclude PlaygroundShell, LevelShell and the engine |

## Testing Strategy (Strict TDD)

| Layer | What | Approach |
|---|---|---|
| Node unit | parseRoute/hrefFor table, isReadOnly/countsToward, predicates, applySteps determinism (two replays deep-equal, ignoring `t`) and errors, evaluateLevel, stars, unlocks, schema parse (corrupt, wrong v, bad snapshot), quota retry, session reducer, themeStorage RMW preserving `repo`/`hist` | Vitest, injected Storage fake |
| Node suite | `solvability.test.ts` `describe.each(catalog)`: setup succeeds; not solved after setup; every solution step succeeds; solved after; `countsToward(solution) ≤ budget`; unique ids; `version ≥ 1`; `hosting` flag iff a hosting step exists; hints ≥ 1; worldsMeta matches catalog | Real `GitEngine` |
| DOM | App routes (deep link, back/forward, unknown → replace, locked view, focus on h1), debug API rebinding (sandbox → level → landing undefined), existing PlaygroundShell tests unchanged, LevelShell (type the solution → checklist → dialog stars → Siguiente; hint caps at 1; reset clears snapshot; remount restores; PR merge via HostingView counts and completes), LevelMap (locks, stars, reset only clears `gitpg:levels:v1`), Landing (sections, CTA hrefs, fake-timer frames, reduced-motion static) | RTL + jsdom, fresh store per test via provider |
| Build | chunk isolation | `npm run build && npm run check:chunks` |

## Migration / Rollout

No migration. `gitpg:v1` is never restructured. Phases: (1) router + workspace extraction + theme; (2) level engine + progress; (3) player; (4) curriculum, one world per commit; (5) landing.

## Open Questions

- [ ] Confirm with the spec that the conflict-resolver and editor-save UI actions each count as 1 (as designed). Also confirm that failed PR actions count.
- [ ] Is the sandbox `homeHref` link acceptable as an additive change to "identical behavior"?
