## Exploration: Landing page + "Levels" (git-lessons) mode for Git Playground

### Current State

Single-page app, no router: `src/App.tsx:5-9` renders `PlaygroundShell` unconditionally; `src/main.tsx:12-16` mounts `<App/>` into `#root`. `index.html:15` loads `/src/main.tsx` directly (no SPA-fallback/base-path config in `vite.config.ts`, which is a bare `defineConfig({ plugins: [react()] })`). No `react-router` (or any router) in `package.json` deps — only `react`/`react-dom` runtime deps, Vitest/RTL for testing.

`PlaygroundShell.tsx` (338 lines) is the single assembly point: wires `useGitPlayground` (engine-backed reducer + handlers, `src/app/useGitPlayground.ts`), `useHostingView` (PR web-view routing within the shell), camera/choreography/terminal/mobile/theme/persistence hooks, and renders `Canvas`+`GraphLayer`, `TerminalWindow`, `ActionBar`, `HostingView`, toasts/tooltip/conflict UI. There is exactly one `RepoState` "slot" alive at a time (`repoRef` in `useGitPlayground.ts:123`).

Engine (`src/engine/*`) is pure TS, zero React/DOM deps, ported 1:1 from `design-handoff/git-engine.js` (the untouched golden oracle used by `src/engine/__tests__/parity/*`). Dispatch table `GIT` (`src/engine/commands/index.ts:14-23`) aggregates: basics {init,status,add,restore,rm,mv,commit,clean}, branches {branch,switch,checkout,tag}, history {log,show,diff,reflog}, integrate {merge,rebase,cherry-pick,revert}, undo {reset,stash}, remote {remote,push,fetch,pull}, shell {help,version}. `rebase -i` is explicitly rejected (`integrate.ts:147-149`, "todavía no está en el simulador"). `unsupported.ts:7-33` curates friendly rejections for real-git subcommands never implemented: clone, bisect, blame, config, worktree, submodule, grep, describe, shortlog, gc, notes, am, apply, format-patch, mergetool, difftool, archive, sparse-checkout, fsck, prune, filter-branch, range-diff, cherry, bundle, maintenance — **any curriculum must only reference the supported list**, and `help`/`error` typo-suggestion already covers the rest gracefully.

The engine source carries a literal signpost for this work: `design-handoff/git-engine.js:529` `// Futura capa de lecciones: { estadoInicial, validar(estado), pistas[] }` — i.e. lessons were always meant to be `{estadoInicial, validar(estado), pistas[]}` data/pure-function pairs, not new engine behavior.

Hosting/PR simulation already exists and is reusable as-is: `src/engine/hosting/{create,lifecycle,sync,merge,mergeability,replay,view,state}.ts` + facade re-exports in `src/engine/index.ts:17,55-61,88-94` (`createPullRequest`, `commentPullRequest`, `closePullRequest`, `reopenPullRequest`, `mergePullRequest`, `listPullRequests`, `prView`). `RepoState.hosting` (`src/engine/types.ts:112`) is optional/lazily created — no shape risk. UI: `src/components/hosting/HostingView.tsx` + tabs, wired through `useHostingView` and `PlaygroundShell.tsx:256-273,319`. PR-related `GitEvent` variants already exist: `pr-opened|pr-commented|pr-closed|pr-reopened|pr-merged` (`types.ts:157-161`).

Persistence: one key, `gitpg:v1` = `{repo, theme, hist}` (`src/hooks/usePersistence.ts:25`, gate `repo.v===1` at `isRepoV1`, `PlaygroundShell.tsx:87-99` wires it). Debug API `window.GitPlayground` = `{estado, ejecutar, motor, cargar}` is DI-based (`src/app/debugApi.ts:10-43`), installed once in `useGitPlayground.ts:381-387` pointed at whichever `repoRef`/`run`/`loadRepo` are live.

`RepoState` (`src/engine/types.ts:88-113`) is a plain serializable object (files/index/commits/branches/tags/head/stash/reflog/remote/tracking/op/hosting). `GitEvent` union (`types.ts:116-161`) covers every state transition. `CommandFn` signature `(s, a, r) => void` (`recorder.ts:6`) and `Recorder.ev()` (`recorder.ts:13`) are how commands log events — lesson validators should consume `RepoState` + the `GitEvent[]`/history already returned by `GitEngine.ejecutar()` (`CommandResult`, `types.ts:163-169`), not reimplement engine logic.

Ancestry/ref helpers already exist in the engine internals (not yet facade-exported): `isAnc`, `mergeBase`, `aheadBehind` (`src/engine/refs.ts:26-41`), `curName`/`resolve`/`treeOf` (facade-exported), `estadoArchivos` (facade-exported), `infoRama` (facade-exported, gives ahead/behind vs main). These are sufficient building blocks for lesson predicates without touching golden-parity code.

Design tokens: `src/styles/theme.css` — dark-default CSS vars (`--bg-canvas`, `--surface`, `--text-primary`, `--success/warning/danger`, `--t-green/red/yellow/cyan`, spacing/radius/z-index/easing scales), `[data-theme='light']` override block, Geist/Geist Mono fonts loaded via Google Fonts `<link>` in `index.html:6-10`. CSS Modules used throughout (`*.module.css`). No GH Pages workflow exists (`.github/workflows` — none found) and no `base` set in `vite.config.ts`, so there's currently no assumption baked in about subpath deployment.

### Affected Areas

- `src/App.tsx` — becomes the route switch (landing / playground / levels), replacing the unconditional `<PlaygroundShell/>`.
- `src/main.tsx`, `index.html`, `vite.config.ts` — only touched if adding a router library (basename) or GH Pages `base`/404 fallback; otherwise untouched.
- `src/components/PlaygroundShell.tsx` — stays the sandbox view; a new sibling `LevelShell`-type component should be composed from the SAME sub-pieces (`Canvas`, `GraphLayer`, `TerminalWindow`, `CameraControls`, `ActionBar` variant, `HostingView`) rather than forking them.
- `src/app/useGitPlayground.ts` — reused as-is for levels (it already accepts `PersistenceDeps` with injectable `initialRepo`/`persist`, `src/app/useGitPlayground.ts:79-89,120-122`); no engine-side change needed to seed a level's starting `RepoState`.
- `src/hooks/usePersistence.ts` — pattern to copy (not touch) for a second, level-scoped persistence key; `gitpg:v1` must stay byte-identical for the sandbox.
- `src/app/debugApi.ts` — shape-compatible already (DI-based); only the deps passed to `installDebugApi` need to point at the active hook instance.
- `src/engine/refs.ts`, `src/engine/info.ts`, `src/engine/files.ts`, `src/engine/hosting/*` — read-only sources for new lesson predicate helpers; none of these need modification.
- `design-handoff/git-engine.js` and `src/engine/__tests__/parity/*` — MUST remain untouched; nothing in this feature should alter engine command behavior or the golden oracle.
- New, additive-only: a lessons data/validator layer (proposed `src/engine/lessons/` for pure predicates + `src/lessons/` or `src/content/levels/` for the level catalog/copy) and a landing page component tree (proposed `src/components/landing/`).

### Approaches

#### A. Routing

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| **A1. react-router-dom** | Standard, deep-linking `/niveles/:id` for free, route-level `lazy()` code-splitting, familiar to future contributors | New dependency; needs `basename` + either `HashRouter`/404-redirect trick for GH Pages (no existing deploy workflow assumes BrowserRouter rewrites); slightly oversized for ~4-5 routes | Low-Medium |
| **A2. Tiny hand-rolled hash/history router** (a `useSyncExternalStore` on `window.location` + switch) | Zero new deps, matches the codebase's existing style of small hand-rolled hooks (`useCamera`, `useChoreography`, `useMobile`); hash mode needs zero server config on ANY static host (GH Pages, Netlify, S3…); trivial to test | Reinvents param parsing for `/niveles/:id`; no built-in transition/data APIs if the app grows much further | Low |
| **A3. State-based (no URL)** — top-level `useState<'landing'\|'playground'\|'levels'\|{level:id}>` | Simplest possible, zero risk | No deep links/bookmarks/back-button for a feature whose whole point is "share/return to level N"; feels like a regression | Very Low (but UX cost) |

#### B. Persistence separation

Keep `gitpg:v1` exactly as-is (sandbox repo/theme/hist) — zero touch, zero regression risk. Add a **second, independent** key for levels, e.g. `gitpg:levels:v1 = { v:1, completed: Record<levelId, {stars, bestCommandCount, completedAt}>, unlocked: string[] }` (small, no `RepoState` inside — same try/catch-wrapped read/write pattern as `usePersistence.ts`). Recommend **not** persisting a level's in-progress `RepoState` across reloads for v1 (a level's `setupScript` is a deterministic command replay through `GitEngine.ejecutar`, so "reload = restart this level" is cheap and simple); only persist the completion/progress ledger. `window.GitPlayground` keeps its exact `{estado,ejecutar,motor,cargar}` shape; only which hook instance's `repoRef`/`run`/`loadRepo` it's wired to changes depending on whether the sandbox or a level is mounted — no interface change to `debugApi.ts`.

#### C. Lesson model design

Proposed data shape (new, additive, lives outside `design-handoff/`):

```ts
interface LevelDef {
  id: string;                 // slug e.g. 'basics-01-init'
  world: string;               // 'basics' | 'branching' | 'merging' | 'undo' | 'remote' | 'collab' | 'rebase'
  order: number;
  titulo: string;              // Spanish UI copy
  objetivo: string;            // one-line goal shown in the lesson panel
  teoria: string;               // short explanation shown before/alongside the goal
  setupScript: string[];        // commands replayed through GitEngine.ejecutar from GitEngine.vacio() to build the start state — deterministic, no hand-built RepoState JSON
  solutionScript: string[];     // reference solution, same shape — this is what the solvability test replays
  hints: string[];              // progressive reveal, Spanish
  checklist?: { id: string; label: string }[];
  allowHostingUI?: boolean;     // gates whether ActionBar's "Pull requests"/HostingView mounts for this level
  validar(estado: RepoState, eventos: GitEvent[], hist: string[]): { done: boolean; checklist: Record<string, boolean> };
}
```

- **Setup via command script, not hand-built `RepoState`**: running `setupScript` through `GitEngine.ejecutar` from `vacio()` keeps every level's starting state provably reachable with real commands (including seeding `remote`/`hosting` for later worlds via `push -u origin <branch>` and `createPullRequest`), and means a bad setup script fails loudly in the same test that proves solvability (see Testing strategy).
- **Validation timing**: compute `validar(playground.state.repo, …)` as **derived render state** (`useMemo` on `[repo]`) inside the level shell, not as a new effect wired into `useGitPlayground`'s apply pipeline — avoids touching `applyResult`/`choreo.after` at all (rerender-derived-state-no-effect pattern). The existing `CommandResult.eventos` from the last applied command is already available via the reducer state if a running event log is wanted later; v1 only needs `validar(repo)`.
- **Allowed/forbidden commands**: recommend **skipping this for v1** — git's own curated error/hint messages (`unsupported.ts`, per-command `fail()` hints) already teach correctly when a player tries something premature; a UI-level allowlist can be added later as a thin pre-check in the level's `run()` wrapper without touching `engine/commands/index.ts`.
- **New engine helper predicates** (pure, testable in Node, co-located in a new `src/engine/lessons/predicates.ts` so they can import engine internals directly, same as any other command module): `currentBranch`, `commitCount`, `branchExists`, `isMerged(estado, branch, into)` (via existing `isAnc`/`mergeBase` from `refs.ts:26-37`, not yet facade-exported but importable directly inside `src/engine/`), `fileStaged`, `fileContent`, `hasConflict`, `tagExists`, `hasRemoteBranch`, `isPushed`, `prStatus`, `prMerged` (via existing `hosting/*`). None of these require modifying `design-handoff/git-engine.js` or the facade's public shape — they're a new, additive module.
- **Reusing `PlaygroundShell`**: compose a new `LevelShell` from the same leaf components (`Canvas`, `GraphLayer`, `TerminalWindow`, `CameraControls`, `ActionBar`/a trimmed variant, `HostingView` gated by `allowHostingUI`) plus a new `LessonPanel` (goal/teoria/checklist/hints), driven by `useGitPlayground(choreo, { initialRepo: seededFromSetupScript, persist: noop-or-attempt-key })`. This reuses 100% of the terminal/graph/camera/choreography machinery with zero engine changes.

#### D. Curriculum proposal (supported-commands only)

7 worlds, ~36 levels total, strictly scoped to the dispatch table in `commands/index.ts` plus hosting PR actions:

| World | # Levels | Commands exercised | Example goal → validator sketch |
|---|---|---|---|
| 1. Basics | 6 | init, status, add, commit, log, rm/mv | "Make your first commit" → `commitCount(estado) >= 1` |
| 2. Branching | 5 | branch, switch, switch -c, checkout | "Create and switch to `feature`" → `currentBranch===‘feature’ && branchExists('feature')` |
| 3. Merging & conflicts | 6 | merge, merge --no-ff, conflict add+commit | "Resolve the conflict and merge `feature` into `main`" → `isMerged(estado,'feature','main') && !hasConflict(estado)` |
| 4. Undo & rewrite | 6 | reset --soft/mixed/hard, stash, revert, commit --amend, cherry-pick | "Undo the last commit without losing the file" → `commitCount` delta + `fileContent` check |
| 5. History inspection | 4 | tag, show, diff, reflog | "Tag the release" → `tagExists(estado,'v1.0')` |
| 6. Remote basics | 5 | remote, push -u, fetch, pull, pull --rebase | "Push `feature` and set upstream" → `isPushed(estado,'feature')` |
| 7. Collaboration/PRs | 5 (needs `allowHostingUI: true`) | push, createPullRequest, commentPullRequest, mergePullRequest | "Open a PR from `feature` to `main` and merge it" → `prMerged(estado, id)` |
| 8. Rebase | 3 | rebase, rebase --continue/--abort, fast-forward vs merge contrast | "Rebase `feature` onto `main`" (NOT `-i`, which is unsupported) → ancestor check via `isMerged` after rebase |

(Full level-by-level list with exact goal text/hints/solution scripts belongs in `sdd-spec`/`sdd-design`, not exploration — this table is sized to prove the curriculum fits the engine's real surface and stays away from `rebase -i`/`clone`/`blame`/etc.)

#### E. Landing page

Sections: hero (headline + either a static SVG commit-graph illustration or a tiny READ-ONLY animated replay of a canned command script using the real engine — reuses `layout()`/`GraphLayer` without any terminal input, so it's cheap and authentic rather than a mockup) → "why" / feature highlights (3-4 cards: real git semantics, safe to break things, visual graph, PR simulation) → "how it works" (3 steps) → levels preview (first world's cards with lock icons) → dual CTA ("Open sandbox" / "Start levels"). Visual direction: keep the existing dark-first token system (`theme.css`) for continuity, but the `frontend-design` skill calls for a bold, non-generic aesthetic — recommend leaning into the terminal/graph motif the product already has (monospace accents, commit-dot motifs, graph-line dividers) rather than a generic SaaS hero, and NOT introducing a second font family beyond Geist/Geist Mono already loaded. Performance: the landing route must not pull in the playground/engine bundle eagerly — route-level code splitting (dynamic `import()` for `PlaygroundShell`/`LevelShell`, whichever router option is chosen) keeps the landing page's first paint light, per the `vercel-react-best-practices` skill's `bundle-dynamic-imports`/`bundle-conditional` rules.

#### F. Progress & gamification

Minimal v1: per-level completion (done/not-done) + an optional "stars" metric computed purely from `solutionScript.length` vs the player's actual command count for that attempt (no engine change — just count entries in the reducer's `hist`/applied-command log for the current level session). Unlock order: linear by `order` within a world, each world unlocked once its previous world's levels are all done (simple, avoids a dependency graph). Reset: a "reset level" action just replays `setupScript` again (free, since starts are deterministic); a "reset all progress" action clears `gitpg:levels:v1` only, never touches `gitpg:v1`.

#### G. Testing strategy

Add one parametrized Vitest suite (Node, no DOM — same spirit as `src/engine/__tests__/*`) that, for every `LevelDef` in the catalog: (1) replays `setupScript` through `GitEngine.ejecutar` from `vacio()` and asserts `validar(estado)` is **false** right after setup (the level isn't pre-solved); (2) replays `solutionScript` from that same seeded state and asserts `validar(estado)` is **true** (the level is provably solvable with the documented reference solution). This is the direct, mechanical analogue of the engine's own golden-parity testing philosophy, fits Strict TDD (write the catalog test shape before levels are filled in), and catches curriculum drift (e.g. someone adding a level that references `rebase -i`) automatically since the setup/solution scripts run through the real `GIT` dispatch table and will `fail()` loudly on unsupported subcommands.

### Recommendation

1. **Routing**: A2 (tiny hand-rolled hash router) — zero new deps, zero GH-Pages config burden (no deploy workflow exists yet to assume BrowserRouter rewrites), matches the codebase's existing hand-rolled-hook style, and the route surface (`/`, `/playground`, `/niveles`, `/niveles/:id`) is small enough that a library doesn't pay for itself yet. Revisit react-router only if the route surface grows materially (auth, profiles, etc.).
2. **Persistence**: keep `gitpg:v1` untouched; add a small, separate `gitpg:levels:v1` progress-only key; don't persist in-progress level `RepoState` for v1 (deterministic setup replay makes that unnecessary).
3. **Lesson model**: data + pure validators in a new additive module (`src/engine/lessons/predicates.ts` for engine-internal helpers, `src/lessons/catalog/*` for level content), `setupScript`/`solutionScript` as command arrays replayed through the real `GitEngine.ejecutar`, `validar()` computed as derived render state inside a new `LevelShell` that reuses every existing sandbox sub-component.
4. **Curriculum**: 7-8 worlds, ~30-36 levels, strictly scoped to the supported command table (confirmed above) — worth a dedicated `sdd-spec` pass to pin exact level text/hints before implementation.
5. **Landing**: reuse the real engine for an authentic animated hero instead of a mockup; code-split the playground/levels bundles away from the landing route.
6. **Testing**: a solvability + "not pre-solved" Vitest suite over the level catalog, written before levels are authored (Strict TDD fits naturally here).

### Risks

- **Scope size**: 30-36 levels + landing + routing + progress system is a large change; should be split into multiple `sdd-tasks` work units/PRs (landing; levels-engine-layer; levels-UI/curriculum content) rather than one PR, per the review-workload guard.
- **GH Pages / static hosting assumption** is currently unconfirmed (no `.github/workflows`, no `base` in `vite.config.ts`) — if deployment target changes later (e.g. a custom domain root vs a GH Pages subpath), the hash-router choice removes this risk entirely, but worth confirming with the user before `sdd-propose` locks it in.
- **Curriculum command creep**: easy to accidentally design a level around an unsupported subcommand (`rebase -i`, `clone`, `blame`, etc.); mitigated by the proposed solvability test suite, which will fail loudly, but the level-content authoring pass should cross-check against `commands/index.ts`/`unsupported.ts` explicitly.
- **PlaygroundShell duplication risk**: if `LevelShell` is built by copy-pasting `PlaygroundShell.tsx` instead of extracting shared pieces, the two will drift; `sdd-design` should explicitly decide the shared-component boundary (hooks reused as-is: `useGitPlayground`, `useCamera`, `useChoreography`, `useMobile`, `useTheme`; new: `LessonPanel`, level-scoped persistence, level routing).
- **Hosting UI in early levels**: `HostingView`/PR levels require `repo.remote`/`repo.hosting` to be seeded correctly via setup scripts — needs careful setup-script authoring (e.g. `push -u origin <branch>` before `createPullRequest` will work from the UI, but `createPullRequest` is only reachable programmatically today, not from a typed command — confirm whether levels seed PRs via `setupScript` calling the facade function directly (not through `ejecutar`) or whether the player is expected to open the PR via the `HostingView` UI as part of the level goal itself (more likely the actual intent, since `createPullRequest` isn't a typed git command).

### Ready for Proposal

Yes — the codebase has no router today, the engine already anticipated a lessons layer (`design-handoff/git-engine.js:529`), and all the primitives needed (pure `RepoState`, event log, hosting simulation, DI-based persistence/debug API) are reusable without touching the golden-parity engine. Recommend `sdd-propose` lock in: (a) hash-based routing, (b) the `setupScript`/`solutionScript`-as-command-arrays lesson model, (c) the two-key persistence split, and (d) a phased delivery plan (landing first, then levels-engine-layer, then curriculum content in batches) before moving to `sdd-spec`/`sdd-design`.
