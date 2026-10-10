# Design: Simulated Hosting Pull Requests

## Technical Approach

Add an **optional** `hosting?: HostingState` field to `RepoState`, owned by a new pure module `src/engine/hosting/`. PR ops are `envolver()`-wrapped session functions exposed on `GitEngineApi`. Commits/diff/mergeability are derived selectors over `s.remote.branches`. Server merges write only to `s.remote.branches`/`s.remote.known` and create commits with `local:false` (same as `companero()`), so the local repo sees them only via the existing fetch/pull. The UI is an opaque full-area "browser" overlay above the canvas. The terminal stays usable on top of it.

**Deviation from proposal:** `vacio()`/`ejemplo()` stay unchanged. `parity.test.ts:55` deep-compares seed state with the oracle, so a default `hosting` key would break parity. Because the field is absent until the first PR op, `state.test.ts` needs no change either.

## Architecture Decisions

| Topic | Option | Tradeoff | Decision |
|---|---|---|---|
| Field shape | default in `vacio()` vs optional, created lazily | default breaks parity and the exact-shape test | **Optional**. `hostingOf(s)` returns `s.hosting` when well formed, otherwise a fresh `defaultHosting()` |
| Auto transitions (source/target deleted -> closed, source contained -> merged) | derive at read time vs `syncHosting(s, r)` mutator | read-time can't record history, reopen guards or toasts | **`syncHosting`**, called at the end of `envolver()` and on `ejecutar()`'s success path (before `diffEventos`). It returns immediately when `!s.hosting`, so no-PR repos get the same `salida`, `eventos` and `estado` as today |
| Rebase strategy | reuse `procesarRebase` vs new `replayOnto` | `procesarRebase` mutates HEAD, index and files | **`replayOnto`**: same `fusionar3`/`same`/`nuevoCommit` loop and the same todo filter (`O&&!U&&parents<2`), plus a dry-run mode for `canRebase` |
| Outdated PRs | block vs warn | GitHub allows merge | **Warn only**. Conflicts block all strategies. A rebase conflict blocks only the rebase strategy |
| Op failures | terminal output vs inline message | terminal shake and noise | Handler skips `applyResult` on `error` and returns `{ok:false, lines}` for the form to show. Success has `salida: []` (toast only) |
| View state | reducer vs local hook | follows the `stripOpen` convention | **Local `useHostingView`** in `PlaygroundShell` (not persisted). An unknown PR id falls back to the list |
| Hiding the graph | `<Activity hidden>`/unmount vs overlay | `display:none` breaks choreography's rect measuring | **Overlay** (`inert` canvas). Graph stays mounted, so the remote box is already current when the user returns |
| PR timestamps | `Date.now()` vs counter | determinism | `hosting.clock++` per timeline item. Commit `t` keeps the existing behavior (not part of the hash) |

## Data Flow

    HostingView form ──> useGitPlayground.hosting.merge(id, strat, del)
                           │ res = GitEngine.mergePullRequest(repoRef, ...)
                           │   envolver: cl -> serverMerge -> syncHosting -> diffEventos
                           ├─ error ─> {ok:false, lines} ─> inline message
                           └─ ok ─> applyResult(res, null) ─> reducer 'applied'
                                     ├─ persist(gitpg:v1)
                                     └─ choreo.after ─> explicar ─> toast
    terminal `git push` ─> ejecutar ─> ... ─> syncHosting (auto close/merge events)

## Server Merge Mechanics (lane = `laneFor(s,target)`, `extra:{local:false}`, every new hash goes into `remote.known`)

- **merge**: `fusionar3(T(base),T(tgt),T(src))`. Parents `[tgt,src]`. Message `Merge pull request #N from <source>`. Author `AUTOR`. Always creates a commit, even when a fast-forward is possible.
- **squash**: same tree, parents `[tgt]`, message `<title> (#N)`.
- **rebase**: `replayOnto(todo, tgt)` keeps each commit's message and author and sets `copyOf`. Commits whose tree is unchanged are skipped.
- After each strategy: `remote.branches[target]=head`. With `deleteBranch`, also `delete remote.branches[source]`. `s.tracking` is never touched. Hashes are deterministic through `s.seq`.

## Interfaces / Contracts

```ts
// src/engine/hosting/types.ts (re-exported from types.ts)
export type PrStatus = 'open' | 'closed' | 'merged';
export type MergeStrategy = 'merge' | 'squash' | 'rebase';
export type CloseReason = 'manual' | 'source-deleted' | 'target-deleted';
export interface Comment { author: 'Tú'; body: string; at: number }
export type TimelineItem =
  | { kind: 'opened' | 'reopened'; at: number }
  | ({ kind: 'comment' } & Comment)
  | { kind: 'closed'; reason: CloseReason; at: number }
  | { kind: 'merged'; strategy: MergeStrategy | 'external'; hash: Hash | null; at: number }
  | { kind: 'branch-deleted'; branch: string; at: number };
export interface PullRequest { id: number; title: string; body: string; source: string; target: string;
  status: PrStatus; closeReason?: CloseReason; mergedHash?: Hash | null; timeline: TimelineItem[] }
export interface HostingState { prs: PullRequest[]; nextId: number; clock: number }
export interface Mergeability { state: 'clean' | 'conflicts' | 'missing-branch'; conflicts: string[];
  ahead: number; behind: number; outdated: boolean; canRebase: boolean }
export interface PrView { pr: PullRequest; commits: Commit[]; files: { f: string; t: '+'|'−'|'~' }[];
  diff: string[] /* diffArboles(T(base),T(src)) markup */; mergeability: Mergeability | null }
// GitEngineApi additions
createPullRequest(e, i: { source: string; target: string; title: string; body: string }): CommandResult;
commentPullRequest(e, id: number, body: string): CommandResult;
closePullRequest(e, id: number): CommandResult;
reopenPullRequest(e, id: number): CommandResult; // fail if source/target missing
mergePullRequest(e, id: number, strategy: MergeStrategy, deleteBranch: boolean): CommandResult;
listPullRequests(e): PullRequest[]; prView(e, id: number): PrView | null;
```

Create rules (each failure uses `fail()` with Spanish text and a hint): the source must exist on origin (hint `git push -u origin <rama>`), source ≠ target, `ahead>0`, at most one open PR per pair, and the title can't be empty.

New `GitEvent` variants: `pr-opened{id,source,target}`, `pr-commented{id}`, `pr-closed{id,reason}`, `pr-reopened{id}`, `pr-merged{id,strategy|'external',target,hash,branchDeleted}`. `explicar()` checks them right after the `error` check. They only show up in batches that contain PR ops, so existing outputs don't change. Toast texts include "Fusionaste el pull request #N en `origin/main`. Tu repositorio aún no lo sabe: usa `git pull`." and "El pull request #N se cerró: la rama `x` ya no existe en origin."

## File Changes

| File | Action | Description |
|---|---|---|
| `src/engine/hosting/{types,state,create,lifecycle,merge,replay,mergeability,view,sync,index}.ts` | Create | Pure model, ops, selectors |
| `src/engine/types.ts` | Modify | `hosting?`, PR event variants |
| `src/engine/run.ts` | Modify | `syncHosting` in `envolver`/`ejecutar` |
| `src/engine/explain.ts`, `index.ts` | Modify | Toasts; facade |
| `src/app/useGitPlayground.ts` | Modify | `hosting` handler group returning `HostingOutcome` |
| `src/app/useHostingView.ts` | Create | Route state: `list`/`new`/`pr{id,tab}` |
| `src/ui/hostingSelectors.ts` | Create | URL bar text, badges, guidance commands |
| `src/components/hosting/` | Create | `HostingView` (browser chrome, URL `github.com/tu/proyecto/pulls[/N[/commits\|/files]]`), `PullRequestList`, `NewPullRequestForm`, `PullRequestDetail`, `ConversationTab`, `CommitsTab`, `ChangesTab` (SegText), `MergeBox` (strategy select, "Eliminar rama", "Fusionar pull request"), `CommentForm` |
| `src/components/ActionBar.tsx`, `PlaygroundShell.tsx`, `GraphLayer.tsx` | Modify | "Pull requests (n)" button; overlay mount; clicking the remote box opens the view (handler added to the memoized `graphHandlers`) |

## Testing Strategy (Strict TDD, Vitest)

| Layer | What | Approach |
|---|---|---|
| Engine unit (node) | each create rule; lifecycle; 3 strategies (parents, trees, `local:false`, `known`, deterministic hashes across two runs); conflicts/outdated/`canRebase`; sync transitions; explicar texts | `src/engine/hosting/__tests__/` |
| Regression | parity and `state.test` **unchanged**; `ejecutar`/`companero` on repos without PRs produce no `hosting` key | existing suites + `run.test` |
| Persistence | fixture of an old `gitpg:v1` save; a corrupt `hosting` value | `usePersistence`/`hostingOf` tests |
| DOM | form errors, tabs, merge box disabled on conflict, toggle back, remote box click | Testing Library |

## Migration / Rollout

No migration. Old saves have no `hosting` and read as empty. To roll back, remove the UI and the module. Saved `hosting` keys are just ignored.

## Open Questions

- [ ] The spec says "non-empty diff". The design uses `ahead>0`, which matches GitHub's "nada que comparar". The spec needs to align.
- [ ] Out of scope: `git fetch` doesn't prune, so a stale `origin/<source>` stays after "Eliminar rama". GitHub's automatic base retargeting isn't simulated either (a deleted target closes the PR).
