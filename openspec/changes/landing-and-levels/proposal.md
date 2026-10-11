# Proposal: Landing Page + Levels (Guided Git Exercises)

## Intent

Today the app opens straight into a blank sandbox (`src/App.tsx` renders `PlaygroundShell` unconditionally). New users get no context and no guided path. Experienced users can explore freely, but beginners don't know what to try. This change adds:
- a **landing page** that explains the product with a live demo running on the real engine;
- a **Levels mode**: about 30 guided exercises in 6 worlds. Each one has goals verified against real engine state, progressive hints, stars, and unlocks.

The engine was always meant to support this (`design-handoff/git-engine.js:529`: "Futura capa de lecciones: { estadoInicial, validar(estado), pistas[] }").

## Scope

### In Scope
- **Hash routing** (hand-rolled, no new deps), with these routes: `#/` landing, `#/playground` sandbox, `#/niveles` level map, `#/niveles/:id` level. Back/forward and deep links work.
  - An unknown route redirects to `#/` (replace).
  - An unknown level id redirects to `#/niveles`.
  - A locked level shows a "Nivel bloqueado" view with a link to the map. No bypass.
- **Landing** sections:
  - Hero: a canned script replayed through `GitEngine`, so the graph builds live. Read-only, loops, and respects `prefers-reduced-motion`.
  - Features.
  - How it works.
  - Worlds preview.
  - CTAs: "Empezar niveles" and "Modo libre".
  - It uses the theme tokens (dark/light) and Geist. Playground and levels are code-split away from the landing route.
- **Sandbox** at `#/playground`: identical behavior, and `gitpg:v1` stays byte-compatible.
- **Lesson model**: a level is data plus pure validators. Fields: `setup` steps, `solution` steps, objective, theory, checklist goals, hints, command budget, and an optional hosting-UI flag. Setup is replayed through the real engine starting from `vacio()`. Pure predicates live in `src/engine/lessons/`; they are additive and read-only.
- **Level player** (`LevelShell`):
  - Built from the existing leaf components (Canvas, GraphLayer, Terminal, HostingView) plus a `LessonPanel`.
  - The live checklist is re-evaluated after every command or PR action, as derived state.
  - Hints are revealed one at a time. The solution is available on demand.
  - "Reiniciar nivel" resets the level. A success screen shows stars and "Siguiente nivel".
- **Curriculum**: about 30 levels.
  1. Básicos
  2. Ramas
  3. Merge y conflictos
  4. Deshacer cambios
  5. Remoto (including non-interactive `rebase` / `pull --rebase`)
  6. Pull requests y colaboración (PR actions done through the web view)
- **Progress**:
  - Stars: 1 = completed; 2 = completed with no hints; 3 = no hints and within the command budget.
  - Unlocks are linear within a world, and the next world opens when the previous one is complete.
  - New key `gitpg:levels:v1` holds the ledger plus per-level in-progress snapshots (repo, hist, hints used, action count). A snapshot is cleared on completion or reset.
  - "Reiniciar progreso" clears only this key.
- **Tests**: a node test per level proving it is *not solved after setup* and *solved after the reference solution*. Router, progress and UI get RTL tests. Strict TDD.

### Out of Scope (non-goals)
- Accounts, a backend, or cloud sync.
- i18n (the UI copy is Spanish only).
- Level editor or user-authored levels.
- Simulated teammates or a remote that changes on its own (setup scripts seed the remote instead).
- Any engine command change or new git command: no `rebase -i`, `clone`, `blame`, etc.
- Command allowlists per level.
- Leaderboards or analytics.
- Changes to the parity oracle or tests.

## Capabilities

### New Capabilities
- `app-routing`: hash route table, navigation, fallbacks, locked-level guard, code-split route loading.
- `landing-page`: landing sections, engine-driven hero demo, CTAs, reduced-motion behavior.
- `level-engine`: `LevelDef` model, setup/solution step format (CLI command or hosting action), pure predicates, checklist evaluation.
- `level-player`: LevelShell, LessonPanel, hints, solution reveal, reset, success screen, budget counter.
- `level-progress`: star rules, unlock rules, `gitpg:levels:v1` schema with in-progress snapshots, reset progress.
- `level-curriculum`: the 6 worlds and about 30 level definitions, plus the solvability test contract.

### Modified Capabilities
- `app-shell`:
  - The app root becomes a router, and the sandbox moves to `#/playground`.
  - `window.GitPlayground` binds to the active shell (sandbox or level).
  - Theme is app-wide across routes, and `gitpg:v1` keeps its shape.
- `hosting-web-view`: it must expose PR-action completion to its host, so levels can validate goals and count actions. Behavior in the sandbox does not change.

## Approach

1. Router hook: `useSyncExternalStore` on `hashchange`, a pure `parseRoute()`, and `React.lazy` per route.
2. Lessons layer:
   - Pure predicates over `RepoState` and hosting state: `currentBranch`, `isMerged`, `hasConflict`, `isPushed`, `prMerged`, and so on. They reuse `refs.ts` and `hosting/*`.
   - The catalog lives in `src/lessons/`.
   - Solution steps can mix CLI strings with hosting-action objects. This is needed because PR creation is not a typed command.
3. `LevelShell` reuses `useGitPlayground` and injects `initialRepo` (the seeded state or a snapshot) and a level-scoped `persist`.
4. Progress store: a pure reducer plus a storage adapter, the same try/catch pattern as `usePersistence.ts`.
5. Phased build:
   1. routing + sandbox move;
   2. level engine + progress;
   3. level player;
   4. curriculum, written world by world against the solvability suite;
   5. landing.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/App.tsx` | Modified | Route switch |
| `src/app/router/*` | New | Hash router |
| `src/components/landing/*` | New | Landing page |
| `src/components/levels/*` | New | LevelShell, LessonPanel, map, success screen |
| `src/engine/lessons/*` | New | Pure predicates and runner (additive) |
| `src/lessons/*` | New | Catalog, progress store |
| `src/components/hosting/HostingView.tsx`, `useHostingView` | Modified | Action callback |
| `src/app/useGitPlayground.ts`, `debugApi.ts` | Modified (minimal) | Seeding and active-instance binding only |
| `src/components/PlaygroundShell.tsx` | Possibly refactored | Extract shared pieces; no behavior change |
| `design-handoff/*`, `src/engine/__tests__/parity/*`, `src/engine/commands/*` | Untouched | |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Large total diff (about 30 levels plus UI) | High | `exception-ok`; phased work units; content is mostly data |
| LevelShell drifts from PlaygroundShell | Med | Extract shared components; don't copy-paste |
| A level uses an unsupported command | Med | The per-level solvability test runs the real dispatch |
| Ambiguous command counting (failed commands, UI actions, `help`) | Med | Spec pins the rule. Proposed: every submitted non-empty command and each PR action counts; reset restarts the count |
| Theme persistence across routes vs. a frozen `gitpg:v1` | Med | Design: read-modify-write only the `theme` field, or keep theme in-memory outside the sandbox |
| A stale snapshot when level definitions change | Low | Snapshot stores a level `version`; on mismatch, discard and restart |
| Landing bundle pulls in the engine | Low | The hero imports only the engine and layout, lazily; check the build chunk sizes |

## Rollback Plan

All changes are additive behind routes. To roll back:
1. Revert `src/App.tsx` so it renders `PlaygroundShell` directly.
2. Revert the HostingView callback (it is optional).

`gitpg:v1` data is never migrated, so sandbox users are unaffected. The `gitpg:levels:v1` key can be left orphaned or ignored. Phases are independent commits, so the curriculum or the landing can be reverted on their own.

## Dependencies

- None external.
- Relies on the existing engine facade and hosting modules.

## Success Criteria

- [ ] All 4 routes work, including back/forward, deep links, fallbacks and the locked-level guard.
- [ ] The sandbox at `#/playground` behaves the same, and existing `gitpg:v1` saves load unchanged.
- [ ] About 30 levels in 6 worlds. Each one has a passing "not solved after setup / solved after solution" test.
- [ ] Star rules, unlocks, snapshot restore on reload, "Reiniciar nivel" and "Reiniciar progreso" are covered by tests.
- [ ] World 6 levels are completed through the PR web view.
- [ ] The landing chunk excludes `PlaygroundShell` and `LevelShell`. The hero animates from the real engine, and reduced motion is honored.
- [ ] `npm test` and `npm run build` pass. Parity tests are untouched and green.
