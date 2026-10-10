# Tasks: Simulated Hosting Pull Requests

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1800-2400 (10 new engine files, 10 new UI files, 6 modified files, tests) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes (structurally), accepted as single PR via size:exception |
| Suggested split | Work Units 1-5 below, committed separately inside one exception PR |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Engine hosting model + create/comment/close/reopen + syncHosting | PR 1 (size:exception) | Independent; regression-tested |
| 2 | Server merge (3 strategies) + mergeability + replayOnto + toasts | PR 1 (size:exception) | Depends on Unit 1 |
| 3 | Web view shell, PR list, new PR form | PR 1 (size:exception) | Depends on Unit 1 (engine API) |
| 4 | PR detail tabs, merge box, handler/persistence wiring | PR 1 (size:exception) | Depends on Units 2-3 |
| 5 | Verification + manual QA | PR 1 (size:exception) | Depends on Units 1-4 |

## Phase 1: Engine Hosting Model & Lifecycle

- [x] 1.1 RED: `hostingOf`/`defaultHosting` tests — `src/engine/hosting/__tests__/state.test.ts`
- [x] 1.2 GREEN: `hosting/types.ts`, `hosting/state.ts`; add optional `hosting?` + PR `GitEvent` variants to `src/engine/types.ts`
- [x] 1.3 RED: create/comment/close/reopen rule tests — `hosting/__tests__/{create,lifecycle}.test.ts`
- [x] 1.4 GREEN: `hosting/create.ts`, `hosting/lifecycle.ts` (Spanish `fail()` + hints; reopen blocked after source deletion)
- [x] 1.5 RED: `syncHosting` transition tests (deleted→closed, contained→merged, no-op without hosting) — `hosting/__tests__/sync.test.ts`
- [x] 1.6 GREEN: `hosting/sync.ts`; wire into `run.ts` end of `envolver()`/`ejecutar()` before `diffEventos`; expose ops on `engine/index.ts` `GitEngineApi`
- [x] 1.7 RED: regression tests — `parity.test.ts` unchanged, no `hosting` key after `companero()`/standard commands, old `gitpg:v1` fixture loads via `hostingOf`
- [x] 1.8 GREEN: fix regressions surfaced (defensive `hostingOf`-only reads; no default in `vacio()`) — none surfaced, all regression tests passed on first run
- [x] 1.9 Verify: `npm test` green

## Phase 2: Server-Side Merge & Mergeability

- [x] 2.1 RED: mergeability tests (clean/conflicts/missing-branch/outdated/canRebase) — `hosting/__tests__/mergeability.test.ts`
- [x] 2.2 GREEN: `hosting/mergeability.ts`
- [x] 2.3 RED: `replayOnto` dry-run + 3-strategy merge tests (parents, trees, `local:false`, `known`, deterministic hashes across 2 runs, `deleteBranch`) — `hosting/__tests__/{replay,merge}.test.ts`
- [x] 2.4 GREEN: `hosting/replay.ts`, `hosting/merge.ts`; expose `mergePullRequest`/`prView` on `engine/index.ts`
- [x] 2.5 RED: `explicar()` PR-event toast tests — `engine/__tests__/explain.test.ts`
- [x] 2.6 GREEN: `engine/explain.ts` PR toast copy (opened/commented/closed/reopened/merged)
- [x] 2.7 Verify: `npm test` green

## Phase 3: Web View Shell, PR List, New PR Form

- [x] 3.1 Create `src/ui/hostingSelectors.ts`, `src/app/useHostingView.ts` (route state `list`/`new`/`pr{id,tab}`)
- [x] 3.2 Create `src/components/hosting/HostingView.tsx` + `PullRequestList.tsx` (browser chrome, list by status)
- [x] 3.3 RED: DOM tests — list render, "Nuevo pull request" nav, toggle open/close — `hosting/__tests__/*.test.tsx`
- [x] 3.4 GREEN: wire list; Modify `ActionBar.tsx` ("Pull requests (n)"), `PlaygroundShell.tsx` (overlay mount, graph stays inert), `GraphLayer.tsx` (remote-box click)
- [x] 3.5 Create `src/components/hosting/NewPullRequestForm.tsx`
- [x] 3.6 RED: DOM test — rejected creation shows inline push-hint error, no PR created
- [x] 3.7 GREEN: form submit → `createPullRequest` handler, inline error only, no terminal output
- [x] 3.8 Verify: `npm test` green

## Phase 4: PR Detail, Merge Box, Handler & Persistence Wiring

- [x] 4.1 Create `PullRequestDetail.tsx` + `ConversationTab.tsx`/`CommitsTab.tsx`/`ChangesTab.tsx`/`CommentForm.tsx`
- [x] 4.2 RED: DOM tests — tab switch, post comment as "Tú" — `PullRequestDetail.test.tsx`
- [x] 4.3 GREEN: wire tabs to `prView(id)` live data
- [x] 4.4 Create `MergeBox.tsx` (strategy select, "Eliminar rama", "Fusionar pull request")
- [x] 4.5 RED: DOM tests — hidden on `conflicts`, usable+warning on `outdated`, Rebase-only disabled when `canRebase:false`
- [x] 4.6 GREEN: `MergeBox` conditional rendering per mergeability
- [x] 4.7 Modify `useGitPlayground.ts`: add `hosting` handler group (create/comment/close/reopen/merge → `HostingOutcome`); skip `applyResult` on error — NOTE: `hosting.create` was already added in the Phase 3 batch (`NewPullRequestForm` needed it); this task now only needs to ADD `comment`/`close`/`reopen`/`merge` to the same `hosting` object, following the established pattern (see `useGitPlayground.ts`'s `hostingCreate`/`HostingOutcome`)
- [x] 4.8 RED: handler tests — error→inline message, ok→`applyResult`+persist+toast — `useGitPlayground.test.ts`
- [x] 4.9 GREEN: finalize handler wiring
- [x] 4.10 Modify `usePersistence.ts`: tolerate `gitpg:v1` saves without `hosting` key
- [x] 4.11 RED: persistence test — old-save fixture loads, `hostingOf` defaults, no crash — `usePersistence.test.ts`
- [x] 4.12 GREEN: finalize persistence fix — no code change needed: `usePersistence.ts` already treats `repo` as opaque (only checks `v===1`), so an absent/present `hosting` key passes through unchanged; tests added to lock in this behavior
- [x] 4.13 Verify: `npm test` green

## Phase 5: Verification & Manual QA

- [x] 5.1 Run `npm test` (full suite: parity, state, hosting, DOM — all green) and `npm run build`
- [x] 5.2 Write `openspec/changes/simulated-hosting-merge-requests/qa-checklist.md`: manual end-to-end loop (push→PR→conflict/outdated→fix→merge ×3 strategies→fetch), confirm no terminal output on hosting actions, toasts/inline errors match spec — written as a human gate, NOT executed by this batch (see file's own "Status: NOT RUN" note)
