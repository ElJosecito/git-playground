# Proposal: Simulated Hosting Pull Requests

## Intent

Learners practice push/fetch/pull but never the real team loop: open a Pull Request, read its diff, hit conflicts or "outdated" status, fix locally, merge on the server, then sync. Add a simulated GitHub-style origin web view so that loop is learnable end-to-end, while keeping the engine pure and deterministic as the base for future teammate/lesson simulation.

## Scope

### In Scope
- Fake-browser "web view" of origin (PR list, new PR form, PR detail with Commits/Cambios/Comentarios tabs, merge box), toggled from ActionBar and the origin remote box; Spanish copy ("Nuevo pull request", "Fusionar pull request").
- Create PR (source→target, title, description); rules: source must exist on origin (else hint `git push -u origin <rama>`), source != target, non-empty diff, one open PR per pair.
- Live tracking: new pushes update commits/diff.
- Comments by "Tú".
- Merge strategies: merge commit, squash, rebase; "Eliminar rama" deletes origin branch only.
- Close/reopen.
- Derived mergeability: conflicts and outdated-vs-target, with a local-fix explanation (merge/rebase target, then push).
- Backward-compatible `gitpg:v1` loading.

### Out of Scope
- `gh`/`glab` CLI; teammate-opened PRs; approvals/reviews; CI; labels/assignees; lessons layer.
- Changes to push/fetch/pull or `companero()` behavior.

## Capabilities

### New Capabilities
- `hosting-pull-requests`: pure engine model and operations (create, comment, close/reopen, merge x3, delete source branch, derived mergeability).
- `hosting-web-view`: simulated origin web UI, toggle, forms, tabs, merge box, guidance copy.

### Modified Capabilities
- `git-engine`: `RepoState` gains an additive hosting field; `vacio()` default shape changes (parity behavior unchanged).
- `app-shell`: web-view toggle entry point; persistence tolerates saves without hosting state.

## Approach

- Embed `s.hosting = { prs, nextId, clock }` in `RepoState` (explore option 1): travels through `cl()`, undo and persistence for free. Counters only, no `Date.now()`.
- Type named `PullRequest`: copy is final GitHub-style, so matching names avoid a translation layer.
- PR stores refs (source/target branch names) plus status; commits/diff/mergeability are derived from `s.remote.branches` on demand, which gives live tracking and avoids stale data.
- Server merge reuses `fusionar3`/`mergeBase`/`nuevoCommit` and the rebase replay loop; it writes only to `s.remote.branches`. Local repo sees results through existing fetch/pull.
- New session functions wrapped in `envolver()` and exposed via `GitEngineApi`. Defensive `?? defaultHosting()` at every read site.
- UI is a full-area view swap, not a modal, so it feels like "another place".

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/engine/types.ts`, `state.ts` | Modified | Hosting types, default |
| `src/engine/hosting/` | New | PR ops, mergeability |
| `src/engine/run.ts`, `index.ts` | Modified | Session fns, facade |
| `src/engine/__tests__/state.test.ts` | Modified | Exact-shape assertion update |
| `src/hooks/usePersistence.ts` | Modified | Old-save defaults |
| `src/app/useGitPlayground.ts` | Modified | Hosting handlers |
| `src/components/ActionBar.tsx`, `PlaygroundShell.tsx`, `GraphLayer.tsx` | Modified | Toggle entry points |
| `src/components/hosting/` | New | Web view components |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Parity tests break | Low | Additive field only; parity suite must pass unchanged |
| Old saves crash | Med | Defaults at read sites + test fixture of old save |
| Rebase-merge edge cases | Med | Reuse engine replay; conflicts block merge |
| Large diff | High | `exception-ok` accepted |

## Rollback Plan

Feature is additive: remove toggle and `src/components/hosting/`, drop `s.hosting` (unknown fields in saves are ignored), revert `state.test.ts`. No data migration is needed.

## Dependencies

- Completed `port-git-playground-react` engine and shell.

## Success Criteria

- [ ] Full loop works: push branch, open PR, see conflict/outdated, fix locally, push, merge (3 strategies), fetch shows result.
- [ ] Golden parity tests pass unchanged; old `gitpg:v1` saves load.
- [ ] Engine hosting state is JSON-serializable and deterministic (same inputs give the same hashes/ids).
