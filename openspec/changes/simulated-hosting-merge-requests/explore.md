## Exploration: Simulated hosting platform (GitHub/GitLab-like merge requests)

### Current State

The engine (`src/engine/**`) is a pure, deterministic, oracle-parity-tested TS port of `design-handoff/git-engine.js`. `RepoState` (src/engine/types.ts:82-106) already models a single fixed `origin` remote via `s.remote.branches`/`s.remote.known` (types.ts:100), plus `s.tracking` (101) and `s.upstream` (102). `commands/remote.ts` implements push/fetch/pull against that remote. `run.ts`'s `companero()` (37-51) is today's only "server-side actor": it commits directly onto `s.remote.branches[b]` using `nuevoCommit` with a deterministic `s.tm` counter and a fixed author string, simulating a teammate pushing to origin. `envolver()` (run.ts:22-33) is the universal snapshot→mutate→diff-events wrapper every top-level session function (including `companero`) uses — clones state with `cl()` (JSON round-trip, util.ts:4-5), runs a mutator, catches `GitError`, and returns a `CommandResult`. Hash determinism comes solely from `nuevoCommit` (state.ts:90-117): `hashStr([msg,parents,tree,author,s.seq].join('|'))` — no `Date.now()`/`Math.random()` in the hash path. `layout.ts` (84-123) derives the remote-box visualization (`rpos/rnodes/redges/rlabels/rbox`) purely from `anc(s, ...Object.values(s.remote.branches))` — a pure function of `RepoState`, recomputed every render via `layoutOf()` cache. `merge()`/`rebase()` in `commands/integrate.ts` are the existing 3-way-merge engine (`fusionar3` + `mergeBase`, diff.ts/refs.ts) that any server-side-merge simulation should reuse. Persistence (`usePersistence.ts`) round-trips `{repo, theme, hist}` under `localStorage['gitpg:v1']`, gated by `isRepoV1`: `value.v === 1` (usePersistence.ts:45-47) — no deeper schema validation. UI: `PlaygroundShell.tsx` assembles everything; `ActionBar.tsx` already has a flat button-bar pattern (the "Simular cambio de un compañero en origin" button, wired at PlaygroundShell.tsx:220-229 to `playground.simulateTeammate`). `useGitPlayground.ts`'s `simulateTeammate()` (208-212) is the template for any new hosting handler: call engine fn → `applyResult` → persist. `playgroundReducer.ts`'s generic `'applied'` action (109-127) works for any `CommandResult`-shaped call without changes, as long as new state stays inside `RepoState`.

IMPORTANT constraint found: `src/engine/__tests__/state.test.ts:6-33` asserts `vacio()`'s FULL EXACT SHAPE via `expect(s).toEqual({...})`, titled "vacio() returns the oracle default shape." Any additive field on `RepoState`/`vacio()` (e.g. `s.remote.platform` or `s.hosting`) WILL break this test and must be deliberately updated as part of implementation — it is not a parity-oracle test (the oracle has no hosting concept) but it currently over-asserts on "default shape" being oracle-only. Also relevant: `cl()` is a plain JSON round-trip (util.ts:4-5), so any new state must be plain, JSON-serializable data (no functions, no `Date` objects) to survive cloning/undo/persistence correctly — consistent with how the rest of the engine already works.

### Affected Areas

- `src/engine/types.ts` (RepoState:82-106, GitEvent:109-149, Layout/RLabel:241-255/229-239) — add hosting data shape + optional new event variants + optional MR badge fields on RLabel, additively only.
- `src/engine/state.ts` (`vacio()`:9-35) — default/initial shape for new field.
- `src/engine/run.ts` (`envolver()`:22-33, `companero()`:37-51) — pattern to follow for new pure session functions (openMr/mergeMr/closeMr/addComment).
- `src/engine/commands/integrate.ts` (`merge()`:15-74, `rebase()`:115-178) — reuse `fusionar3`/`mergeBase`/`nuevoCommit` for server-side merge/squash/rebase.
- `src/engine/commands/remote.ts` (`push`:18-60, `fetch`:62-81, `pull`:83-93) — local repo already sees any `s.remote.branches[target]` change via existing fetch/pull; no changes needed there.
- `src/engine/layout.ts` (84-123) — remote box viz; additive RLabel field for MR highlighting if desired.
- `src/engine/index.ts` (`GitEngineApi`:30-54) — facade must expose any new engine functions to the UI.
- `src/engine/__tests__/state.test.ts:6-33` — WILL need updating (exact-shape assertion), flagged as a concrete risk/task.
- `src/hooks/usePersistence.ts` (`isRepoV1`:45-47, `readInitial`:49-60) — backward-compat: old saves lack the new field; must default defensively at read sites, not just at the persistence gate.
- `src/app/useGitPlayground.ts` (`simulateTeammate`:208-212, `applyResult`:120-130) — template for new handlers.
- `src/app/playgroundReducer.ts` (`'applied'`:109-127) — generic, no change needed if new state stays inside RepoState.
- `src/components/ActionBar.tsx` (17-58), `src/components/PlaygroundShell.tsx` (177, 220-229) — entry point for a new "View MRs on origin" UI affordance.
- `src/components/GraphLayer.tsx` (77-130) — renders `rbox`/`rlabels`/`rnodes`; natural anchor point for an MR panel trigger.

### Approaches

**Data model:**
1. **Embed in RepoState** (`s.remote.platform` or `s.hosting`) — Pros: travels with repo through persistence/undo/loadRepo/companero for free via existing `cl()` clone; single source of truth; MR mergeability derivable from the same `s.remote.branches` it already lives beside. Cons: breaks `state.test.ts`'s exact-shape assertion (must update deliberately); is a genuine, intentional deviation from "mirrors the oracle exactly" (acceptable since it's new, unoracled ground, not a parity change). Effort: Medium.
2. **Separate HostingState alongside RepoState** — Pros: zero risk to parity/state tests, zero risk to persistence schema as-is. Cons: two sources of truth to keep in sync on every repo mutation (fetch/pull/push); every call site that tracks `repoRef.current` needs a parallel hosting ref; persistence still needs a new key + migration regardless. Effort: Medium-High.

Recommendation: Option 1 (embed in RepoState), accepting the `state.test.ts` update as an explicit task, with MR ids/timestamps using an incrementing counter (like `s.seq`/`s.tm`) rather than `Date.now()`/`Math.random()` to preserve determinism; and defensive `?? defaultPlatform()` reads everywhere (not just at the persistence boundary) so old `gitpg:v1` saves and any repo built without the field never crash.

**Server-side merge:** reuse `fusionar3(treeOf(base), treeOf(source), treeOf(target))` for merge-commit (2-parent `nuevoCommit` + write to `s.remote.branches[target]`, mirroring push's `s.remote.branches[b]=loc` at remote.ts:47) and squash (1-parent `nuevoCommit`); reuse `procesarRebase`'s replay loop (integrate.ts:76-113) for MR rebase, walking only the source-only commits (`O[h] && !U[h] && parents.length<2]`) onto target. Mergeability/outdated status = derived, not persisted: `fusionar3(...).conf.length>0` and `!isAnc(s,targetHash,sourceHash)`/`aheadBehind` (refs.ts:26-47), recomputed on demand to avoid staleness. Local repo sees the result via existing `git fetch`/`git pull` — zero new code needed in commands/remote.ts.

**UI placement:** (1) full fake-browser "web view" tab — most authentic, highest effort/scope-creep risk. (2) side panel anchored near the remote box — reuses existing modal/panel patterns (FileEditorModal.tsx, ConflictResolver.tsx), fits the single-canvas architecture. (3) modal for MR detail/create. Recommendation: (2) for the MR list (triggered from ActionBar or rbox click) + (3) for create/detail modals; defer the full web-view tab to a later iteration.

**CLI:** (1) `gh`/`glab`-style engine commands — requires touching `run.ts`'s `unaOrden` dispatch (53-82) and `commands/unsupported.ts`'s typo-suggestion logic to add a second top-level command namespace; also bakes in PR-vs-MR verb naming prematurely. (2) UI-only — no engine dispatch changes, defers the still-open PR/MR naming decision, smaller first slice. Recommendation: UI-only for the first slice; defer CLI simulation.

### Recommendation

First slice: additive `RepoState` field (naming-neutral internally, e.g. `MergeRequest`/`mr` regardless of eventual PR-vs-MR product copy) holding `{byId, nextId}`; new pure engine functions (`openMergeRequest`, `mergeMergeRequest` with 3 strategies reusing `fusionar3`/`nuevoCommit`, `closeMergeRequest`, `addComment`) following `envolver()`'s pattern; facade additions on `GitEngineApi`; UI = side panel (list) + create modal + detail modal (reusing `cambiosCommit` for diff display); persistence stays under the same `gitpg:v1`/`v:1` gate with defensive defaults at every read site. Explicitly OUT of scope: CLI commands, full web-view tab, teammate-opens-MR automation, lessons layer, review/approval workflow, labels/assignees.

### Risks

- `state.test.ts:6-33`'s exact-shape assertion on `vacio()` will break and needs a deliberate, scoped update — not a silent failure, but a concrete task-list item.
- `layout.test.ts`/`graph.test.ts` may assert exact `Layout`/`RLabel` shapes — verify before adding any optional field there.
- Backward compatibility for existing `gitpg:v1` localStorage saves that predate this field — needs defensive defaults at read sites (engine-side), not just the persistence gate, so `loadRepo()`/`companero()`/time-travel paths never see `undefined`.
- Determinism: must use an incrementing counter (like `s.seq`/`s.tm`) for MR ids/timestamps, never `Date.now()`/`Math.random()`, to match this project's reproducibility culture.
- PR vs MR naming is still being decided with the user in parallel — recommend keeping engine-internal names naming-neutral so UI copy can carry whichever term is chosen without an engine rename pass.
- Size: likely exceeds the 400-changed-line single-PR review budget once engine + UI + tests are counted; flag for chained-PR consideration at `sdd-tasks` (engine+tests as one slice, UI wiring+tests as a second slice).

### Ready for Proposal

Yes. Extension points, data model tradeoffs, server-merge mechanics, and UI/CLI options are grounded in concrete file/line citations from the real codebase. Open product questions (PR vs MR naming, exact UI entry point, CLI yes/no, first-slice boundary) are flagged for the proposal phase's question round, not blockers.
