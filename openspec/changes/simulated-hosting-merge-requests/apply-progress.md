# Apply Progress: Simulated Hosting Pull Requests

**Mode**: Strict TDD
**Batches**: 1 (tasks.md Phase 1 + Phase 2 — engine hosting model + server-side merge), 2 (tasks.md Phase 3 — web view shell, PR list, new PR form, entry points), 3 (tasks.md Phase 4 + Phase 5 — PR detail tabs, merge box, handler/persistence wiring, verification + QA checklist)
**Delivery strategy**: exception-ok (size:exception accepted) — Work Units 1–5 (the full tasks.md plan) are now ALL landed across these 3 batches. This is the final batch: all 39 task lines are `[x]`.

## Completed Tasks

### Phase 1: Engine Hosting Model & Lifecycle
- [x] 1.1 RED: `hostingOf`/`defaultHosting` tests
- [x] 1.2 GREEN: `hosting/types.ts`, `hosting/state.ts`; optional `hosting?` + PR `GitEvent` variants on `engine/types.ts`
- [x] 1.3 RED: create/comment/close/reopen rule tests
- [x] 1.4 GREEN: `hosting/create.ts`, `hosting/lifecycle.ts`
- [x] 1.5 RED: `syncHosting` transition tests
- [x] 1.6 GREEN: `hosting/sync.ts`; wired into `run.ts`'s `envolver()`/`ejecutar()`; ops exposed on `engine/index.ts`
- [x] 1.7 RED: regression tests (parity/state unchanged, no `hosting` key leak, old-save tolerance)
- [x] 1.8 GREEN: no regressions surfaced — all passed on first run
- [x] 1.9 Verify: `npm test` green (646/646 after Phase 1)

### Phase 2: Server-Side Merge & Mergeability
- [x] 2.1 RED: mergeability tests (clean/conflicts/missing-branch/outdated/canRebase)
- [x] 2.2 GREEN: `hosting/mergeability.ts`
- [x] 2.3 RED: `replayOnto` dry-run + 3-strategy merge tests
- [x] 2.4 GREEN: `hosting/replay.ts`, `hosting/merge.ts`; `mergePullRequest`/`prView` exposed on `engine/index.ts`
- [x] 2.5 RED: `explicar()` PR-event toast tests
- [x] 2.6 GREEN: `engine/explain.ts` PR toast copy (opened/commented/closed/reopened/merged)
- [x] 2.7 Verify: `npm test` green (677/677 after Phase 2)

### Phase 3: Web View Shell, PR List, New PR Form
- [x] 3.1 RED→GREEN: `src/ui/hostingSelectors.ts` (`HostingRoute`/`HostingTab` types, `urlBarText`, `statusBadge`, `prListItems`, `noOriginBranchesHint`), `src/app/useHostingView.ts` (local route state: `list`/`new`/`pr{id,tab}`)
- [x] 3.2 Created `src/components/hosting/HostingView.tsx` + `PullRequestList.tsx` (fake browser chrome, list grouped by status badge)
- [x] 3.3 RED: DOM tests — list render (title/badge/branches), "Nuevo pull request" nav, close/open toggle — `src/components/hosting/__tests__/{PullRequestList,HostingView}.test.tsx`
- [x] 3.4 GREEN: wired list into `HostingView`; modified `ActionBar.tsx` ("Pull requests (n)" button), `PlaygroundShell.tsx` (overlay mount via `useHostingView`, graph stays mounted underneath), `GraphLayer.tsx` (remote-box click + Enter/Space, new `onRemoteBoxClick` handler)
- [x] 3.5 Created `src/components/hosting/NewPullRequestForm.tsx` (free-text source/target inputs with datalist suggestions from origin branches — see Deviation 6)
- [x] 3.6 RED: DOM test — rejected creation shows inline push-hint error (role="alert"), `onCreated` never called (no navigation = no PR created) — `NewPullRequestForm.test.tsx`
- [x] 3.7 GREEN: form submit → `useGitPlayground`'s new `hosting.create` handler (see Deviation 7) → inline error only on rejection, no terminal output either way
- [x] 3.8 Verify: `npm test` green (718/718 after Phase 3)

### Phase 4: PR Detail, Merge Box, Handler & Persistence Wiring
- [x] 4.1 Created `PullRequestDetail.tsx` + `ConversationTab.tsx`/`CommitsTab.tsx`/`ChangesTab.tsx`/`CommentForm.tsx`
- [x] 4.2 RED: DOM tests — tab switch (externally-controlled `tab` prop), post comment as "Tú" — `PullRequestDetail.test.tsx` (10 cases, also covers header/close/reopen/back-nav/merge-box-presence/changes-tab)
- [x] 4.3 GREEN: tabs render `ConversationTab`/`CommitsTab`/`ChangesTab` off `view: PrView` (live `prView(id)` data, passed in by `PlaygroundShell`)
- [x] 4.4 Created `MergeBox.tsx` (strategy `<select>`, "Eliminar rama" checkbox, "Fusionar pull request" submit)
- [x] 4.5 RED: DOM tests — hidden on `conflicts`/`missing-branch`, usable+warning on `outdated`, Rebase-only `<option disabled>` when `canRebase:false` — `MergeBox.test.tsx` (7 cases)
- [x] 4.6 GREEN: `MergeBox` conditional rendering per `mergeability.state`/`outdated`/`canRebase`
- [x] 4.7 Modified `useGitPlayground.ts`: extended the existing `hosting` object (already had `create` from the Phase 3 batch) with `comment`/`close`/`reopen`/`merge`, each following the identical error/ok `HostingOutcome` shape
- [x] 4.8 RED: handler tests — error→inline `{ok:false,lines}` without touching the terminal/repo, ok→`applyResult`+persist+no-terminal-output — `useGitPlayground.test.ts` (8 new cases: comment×2, close×2, reopen×2, merge×2)
- [x] 4.9 GREEN: `hostingComment`/`hostingClose`/`hostingReopen`/`hostingMerge` added, same pattern as `hostingCreate`
- [x] 4.10 Reviewed `usePersistence.ts`: NO code change needed (see Deviation 12) — it already treats `repo` as an opaque blob (only checks `v===1`), so `hosting` being optional passes through unchanged on both read and write
- [x] 4.11 RED: persistence tests — pre-hosting `gitpg:v1` fixture loads with `hostingOf()` defaulting it, no crash; a saved repo WITH a `hosting` key (containing a real PR) round-trips byte-for-byte — `usePersistence.test.ts` (2 new cases)
- [x] 4.12 GREEN: both tests passed on first run, confirming no implementation fix was required (logged as Deviation 12, not silently skipped)
- [x] 4.13 Verify: `npm test` green (765/765 after Phase 4+5)

### Phase 5: Verification & Manual QA
- [x] 5.1 `npm test` (765/765), `npx tsc -b --noEmit` (clean), `npm run build` (succeeds) — all green
- [x] 5.2 Wrote `openspec/changes/simulated-hosting-merge-requests/qa-checklist.md` — a human gate covering push→PR→conflict/outdated/rebase-only-conflict→merge×3 strategies→fetch→close/reopen, explicitly marked "Status: NOT RUN" (not claimed as passed by this batch)

## Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `src/engine/hosting/types.ts` | Created | `PrStatus`, `MergeStrategy`, `CloseReason`, `Comment`, `TimelineItem`, `PullRequest`, `HostingState`, `Mergeability` |
| `src/engine/hosting/state.ts` | Created | `defaultHosting`, `isWellFormedHosting`, `hostingOf` (read-only), `ensureHosting` (lazy create/repair) |
| `src/engine/hosting/create.ts` | Created | `createPr` (pure validate+append), `createPullRequest` (envolver-wrapped) |
| `src/engine/hosting/lifecycle.ts` | Created | `commentPullRequest`, `closePullRequest`, `reopenPullRequest` |
| `src/engine/hosting/sync.ts` | Created | `syncHosting` — auto-close (source/target deleted) and auto-merge (source contained in target) |
| `src/engine/hosting/mergeability.ts` | Created | `computeMergeability` — clean/conflicts/missing-branch, ahead/behind, outdated, canRebase |
| `src/engine/hosting/replay.ts` | Created | `sourceOnlyCommits`, `replayOnto` (pure rebase-replay dry run, reused by merge + mergeability) |
| `src/engine/hosting/merge.ts` | Created | `mergePullRequest` — merge/squash/rebase strategies, `local:false`, `remote.known`, optional branch delete |
| `src/engine/hosting/view.ts` | Created | `listPullRequests`, `prView` (live commits/files/diff/mergeability) |
| `src/engine/hosting/index.ts` | Created | Facade aggregating all hosting session functions/selectors/types |
| `src/engine/types.ts` | Modified | Optional `hosting?: HostingState` on `RepoState`; 5 new `GitEvent` variants (`pr-opened/commented/closed/reopened/merged`) |
| `src/engine/run.ts` | Modified | `syncHosting(s, r)` called at the end of `envolver()` and `ejecutar()`, before `diffEventos` |
| `src/engine/index.ts` | Modified | `GitEngineApi` + `GitEngine` gain `createPullRequest`, `commentPullRequest`, `closePullRequest`, `reopenPullRequest`, `mergePullRequest`, `listPullRequests`, `prView` |
| `src/engine/explain.ts` | Modified | PR-event toast copy, checked right after the `error` branch, before existing checks |
| `src/engine/hosting/__tests__/{state,create,lifecycle,sync,wiring,view,mergeability,replay,merge,regression}.test.ts` | Created | Full RED→GREEN coverage per module (node env, included via existing `src/engine/**/*.test.ts` glob) |
| `src/engine/__tests__/hostingApi.test.ts` | Created | Facade-level round-trip tests for every exposed hosting op |
| `src/engine/__tests__/explain.test.ts` | Modified | Added 7 PR-toast test cases (exact-copy assertions for the two design.md-quoted strings) |
| `src/ui/hostingSelectors.ts` | Created | `HostingRoute`/`HostingTab` types, `urlBarText`, `StatusBadge`/`statusBadge`, `PrListItem`/`prListItems`, `noOriginBranchesHint` |
| `src/ui/__tests__/hostingSelectors.test.ts` | Created | 11 cases covering every selector |
| `src/app/useHostingView.ts` | Created | Local (unpersisted) route-state hook: `open`, `route`, `openView`/`closeView`/`goToList`/`goToNew`/`goToPr`/`setTab` |
| `src/app/__tests__/useHostingView.test.ts` | Created | 6 cases (boot state, open resets to list, close preserves route, nav, tab default/switch, tab no-op off the `pr` route) |
| `src/app/useGitPlayground.ts` | Modified | New `HostingOutcome` type + `HostingHandlers` interface; `hosting.create` handler (calls `GitEngine.createPullRequest`, skips `applyResult` on error, returns `{ok:false,lines}`; calls `applyResult` + returns `{ok:true}` on success) |
| `src/app/__tests__/useGitPlayground.test.ts` | Modified | 2 new cases: rejected creation (no terminal output, no PR, repo untouched) and successful creation (PR created, still no terminal output) |
| `src/components/hosting/PullRequestList.tsx` + `.module.css` | Created | PR list pane: badge + title + `#id · source → target` subtitle per row, "Nuevo pull request" button, empty state |
| `src/components/hosting/__tests__/PullRequestList.test.tsx` | Created | 4 cases |
| `src/components/hosting/NewPullRequestForm.tsx` + `.module.css` | Created | Free-text source/target inputs (shared `<datalist>` of origin branches), title/description, inline `role="alert"` error from the engine's own `salida` lines (via `parseLine`/`SegText`), no-origin-branches guidance + disabled submit |
| `src/components/hosting/__tests__/NewPullRequestForm.test.tsx` | Created | 6 cases |
| `src/components/hosting/HostingView.tsx` + `.module.css` | Created | Fake browser chrome (dots + URL bar reflecting `urlBarText(route)`) wrapping list/new panes; `pr` route intentionally renders nothing yet (Phase 4) |
| `src/components/hosting/__tests__/HostingView.test.tsx` | Created | 5 cases |
| `src/components/ActionBar.tsx` | Modified | New `showHosting`/`hostingCount`/`onOpenHosting` props; renders "Pull requests (n)" chip |
| `src/components/__tests__/ActionBar.test.tsx` | Modified | Added the 3 new props to the test's `props()` factory + 3 new cases |
| `src/components/GraphLayer.tsx` + `.module.css` | Modified | New `GraphHandlers.onRemoteBoxClick`; the `rbox` `<g>` becomes a `role="button"` with `aria-label`/`tabIndex`/`onClick`/Enter-or-Space `onKeyDown` when the handler is provided |
| `src/components/__tests__/GraphLayer.test.tsx` | Modified | 2 new cases (click, keyboard Enter) |
| `src/components/PlaygroundShell.tsx` | Modified | Wires `useHostingView`; derives `originBranches`/`prs`/`hostingCount` from `repo`; adds `onRemoteBoxClick: hostingView.openView` to the memoized `graphHandlers`; passes `showHosting`/`hostingCount`/`onOpenHosting` to `ActionBar`; conditionally mounts `<HostingView>` as a full-area overlay (canvas/graph stay mounted underneath) |
| `src/components/__tests__/PlaygroundShell.test.tsx` | Modified | 2 new integration cases (open/close via ActionBar button; open via remote-box click, graph still present) |
| `src/styles/theme.css` | Modified | New `--z-hosting: 28` token (between `--z-actions: 25` and `--z-term: 30`, so the terminal window stays usable/visible on top of the hosting overlay per design) |

### Files Changed (Phase 4 + 5, on top of Phase 1-3's files)

| File | Action | What Was Done |
|------|--------|----------------|
| `src/ui/hostingSelectors.ts` | Modified | Added `strategyLabel`, `timelineText`, `mergeBlockedExplanation`, `mergeOutdatedWarning`, `rebaseDisabledHint`, `canReopen` — pure Spanish copy selectors for the merge box and conversation timeline |
| `src/ui/__tests__/hostingSelectors.test.ts` | Modified | 15 new cases covering the 6 new selectors |
| `src/components/hosting/PullRequestDetail.tsx` + `.module.css` | Created | Header (badge/title/branches), close/reopen buttons, inline action-error block, 3-tab bar (`role="tablist"`/`role="tab"`), merge box mount for open PRs, tab panel dispatch |
| `src/components/hosting/__tests__/PullRequestDetail.test.tsx` | Created | 10 cases |
| `src/components/hosting/ConversationTab.tsx` | Created | Renders `pr.timeline` as Spanish prose (via `timelineText`) + special-cased comment items (author/body) + mounts `CommentForm` |
| `src/components/hosting/CommentForm.tsx` | Created | Textarea + "Comentar" submit, inline `role="alert"` error on rejection (e.g. empty body), clears on success — same pattern as `NewPullRequestForm` |
| `src/components/hosting/CommitsTab.tsx` | Created | Lists `view.commits` (short hash, message, author) |
| `src/components/hosting/ChangesTab.tsx` | Created | Lists `view.files` (+/−/~ markers) and renders `view.diff` (markup-encoded, same wire format as terminal `salida`) via `SegText`/`parseLine` |
| `src/components/hosting/MergeBox.tsx` + `.module.css` | Created | Blocked explanation (role="alert") on `conflicts`/`missing-branch`; else a form with outdated-warning banner, 3-option `<select>` (rebase `disabled` when `!canRebase`), rebase-disabled hint, "Eliminar rama" checkbox, inline merge-error alert, "Fusionar pull request" submit |
| `src/components/hosting/__tests__/MergeBox.test.tsx` | Created | 7 cases |
| `src/components/hosting/PullRequestList.tsx` + `.module.css` | Modified | Rows are now `<button onClick={() => onOpen(item.id)}>` instead of plain `<li>` (new required `onOpen` prop) — opens the clicked PR's detail |
| `src/components/hosting/__tests__/PullRequestList.test.tsx` | Modified | Added `onOpen` to every render call + 1 new row-click case |
| `src/components/hosting/HostingView.tsx` | Modified | New props (`prView`, `onGoToPr`, `onSetTab`, `onCommentPr`, `onClosePr`, `onReopenPr`, `onMergePr`); `pr` route renders `PullRequestDetail` when `prView` is non-null, else falls back to rendering the list (design's "unknown PR id falls back to the list") |
| `src/components/hosting/__tests__/HostingView.test.tsx` | Modified | Extracted a `baseProps()` helper for the 5 new required props; added 3 new cases (row-click→`onGoToPr`, detail-renders-with-matching-view, fallback-to-list-on-unknown-id) |
| `src/app/useGitPlayground.ts` | Modified | `HostingHandlers` interface extended with `comment`/`close`/`reopen`/`merge`; 4 new `useCallback`s (`hostingComment`/`hostingClose`/`hostingReopen`/`hostingMerge`) following `hostingCreate`'s exact shape; `hosting` memo now aggregates all 5 |
| `src/app/__tests__/useGitPlayground.test.ts` | Modified | 8 new cases (reject/accept pairs for comment, close, reopen, merge) |
| `src/hooks/__tests__/usePersistence.test.ts` | Modified | 2 new cases (pre-hosting fixture tolerance, hosting-bearing round trip) — `usePersistence.ts` itself unchanged (Deviation 12) |
| `src/components/PlaygroundShell.tsx` | Modified | New `activePrView` (`useMemo` keyed on `[repo, hostingView.route]` — avoids recomputing `prView`'s ancestor-walk/diff work on unrelated re-renders, e.g. every terminal keystroke); `<HostingView>` now receives `prView`/`onGoToPr`/`onSetTab`/`onCommentPr`/`onClosePr`/`onReopenPr`/`onMergePr` |
| `src/components/__tests__/PlaygroundShell.test.tsx` | Modified | 1 new end-to-end case: create a PR via the form, open its detail from the list, merge it via the merge box, close the view |
| `openspec/changes/simulated-hosting-merge-requests/qa-checklist.md` | Created | Human-gate manual QA checklist (task 5.2) |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1/1.2 | `hosting/__tests__/state.test.ts` | Unit | N/A (new) | ✅ Written (module-not-found) | ✅ Passed (27/27 incl. `engine/__tests__/state.test.ts` safety net) | ✅ 6 cases (fresh/existing/malformed/ensure) | ➖ None needed |
| 1.3/1.4 | `hosting/__tests__/create.test.ts`, `hosting/__tests__/lifecycle.test.ts` | Unit | N/A (new) | ✅ Written (module-not-found) | ✅ Passed (15/15) | ✅ 7+9 cases (each create rule, comment/close/reopen happy+reject paths) | ➖ None needed |
| 1.5/1.6 | `hosting/__tests__/sync.test.ts`, `hosting/__tests__/wiring.test.ts` | Unit | ✅ `run.test.ts`+`parity.test.ts` 25/25 before editing `run.ts` | ✅ Written (module-not-found, then real assertion failures for wiring) | ✅ Passed (5/5 + 2/2); full regression set 74/74 after wiring | ✅ no-op/close/merge/untouched-open cases | ➖ None needed |
| 1.7/1.8 | `hosting/__tests__/regression.test.ts` | Unit | ✅ (covered by 1.5/1.6 safety net) | ✅ Written (new assertions on already-built code) | ✅ Passed (5/5) immediately — no GREEN fixes needed | ➖ Single pass per scenario (regression checks, not branching logic) | ➖ None needed |
| 1.6 (facade) | `engine/__tests__/hostingApi.test.ts` | Unit | N/A (new) | ✅ Written (`is not a function`) | ✅ Passed | ✅ create+list, then comment/close/reopen (2 cases) | ➖ None needed |
| 2.1/2.2 | `hosting/__tests__/mergeability.test.ts` | Unit | N/A (new) | ✅ Written (module-not-found) | ✅ Passed (6/6) | ✅ 6 cases: clean, conflicts, missing-branch×2, outdated+clean, canRebase:false-while-clean | ➖ None needed |
| 2.3/2.4 (replay) | `hosting/__tests__/replay.test.ts` | Unit | N/A (new) | ⚠️ Written but implemented slightly ahead of schedule as a 2.2 dependency (`mergeability.ts` needs `replayOnto`) — ran GREEN on first execution; `sourceOnlyCommits`/dry-run behavior independently verified via its own 6 cases | ✅ Passed (6/6) | ✅ ordering, skip-no-op, conflict-stop, msg/author preservation | ➖ None needed |
| 2.3/2.4 (merge) | `hosting/__tests__/merge.test.ts` | Unit | N/A (new) | ✅ Written (module-not-found) | ⚠️ First run: 1 failure (test bug — asserted `branches.main` undefined; fixed to assert it stays at the pre-merge tip) → ✅ Passed (7/7) | ✅ merge/squash/rebase/determinism/deleteBranch/conflict-rejection | ➖ None needed |
| 2.4 (view) | `hosting/__tests__/view.test.ts` | Unit | N/A (new) | ✅ Written (`prView is not a function`) | ✅ Passed (6/6) | ✅ unknown-id, live diff, live-update-after-push, null-mergeability-when-not-open | ➖ None needed |
| 2.4 (facade) | `engine/__tests__/hostingApi.test.ts` | Unit | ✅ existing 2 cases still green | ✅ Written (`prView is not a function`) | ✅ Passed (3/3) | ➖ Covered by dedicated module tests | ➖ None needed |
| 2.5/2.6 | `engine/__tests__/explain.test.ts` | Unit | ✅ 14/14 pre-existing cases green before editing | ✅ Written (7 failures: null/`.text` on null) | ✅ Passed (21/21) | ✅ all 5 event types + reason variants (manual vs source-deleted) + strategy variants (named vs external) | ➖ None needed |
| 3.1 | `ui/__tests__/hostingSelectors.test.ts` | Unit | N/A (new) | ✅ Written (module-not-found) | ✅ Passed (11/11) | ✅ per-route URL suffix (3), per-status badge text+color, list sort+subtitle+empty+badge | ➖ None needed |
| 3.1 | `app/__tests__/useHostingView.test.ts` | Unit (hook, `@vitest-environment jsdom` override) | N/A (new) | ✅ Written (module-not-found) | ✅ Passed (6/6) | ✅ boot/open/close/nav/tab-default/tab-no-op | ➖ None needed |
| 3.2/3.3 | `components/hosting/__tests__/PullRequestList.test.tsx` | Integration (Testing Library) | N/A (new) | ✅ Written (module-not-found) | ✅ Passed (4/4) | ✅ single PR, multiple distinct badges, empty state, "Nuevo pull request" click | ➖ None needed |
| 3.2/3.3 | `components/hosting/__tests__/HostingView.test.tsx` | Integration | N/A (new) | ✅ Written (module-not-found) | ✅ Passed (5/5) | ✅ list URL+content, new-route URL+form, nav list→new, close button, create→navigate-back wiring | ➖ None needed |
| 3.4 | `components/__tests__/ActionBar.test.tsx` | Integration | ✅ 6/6 pre-existing cases green before editing | ✅ Written (missing required props) | ✅ Passed (8/8) | ✅ shown-with-count, hidden, click | ➖ None needed |
| 3.4 | `components/__tests__/GraphLayer.test.tsx` | Integration | ✅ 10/10 pre-existing cases green before editing | ✅ Written (`getByRole('button',...)` not found) | ✅ Passed (12/12) | ✅ mouse click + keyboard Enter | ➖ None needed |
| 3.4 | `components/__tests__/PlaygroundShell.test.tsx` | Integration | ✅ 7/7 pre-existing cases green before editing | ✅ Written (URL-bar text not found) | ✅ Passed (9/9) | ✅ ActionBar-button entry point, remote-box entry point (graph still present after) | ➖ None needed |
| 3.6/3.7 | `components/hosting/__tests__/NewPullRequestForm.test.tsx` | Integration | N/A (new) | ✅ Written (module-not-found) | ✅ Passed (6/6) | ✅ submit payload, base-branch default, rejected→inline alert+no-navigate, success→navigate, no-origin-branches guidance+disabled, cancel | ➖ None needed |
| 3.7 | `app/__tests__/useGitPlayground.test.ts` (hosting.create) | Unit (hook) | ✅ 36/36 pre-existing cases green before editing | ✅ Written (`hosting` undefined) | ✅ Passed (38/38) | ✅ rejection (no terminal/no PR/repo untouched) + success (PR created, still no terminal line) | ➖ None needed |
| 4.1/4.2/4.3 | `components/hosting/__tests__/PullRequestDetail.test.tsx` | Integration | N/A (new) | ✅ Written (module-not-found) | ✅ Passed (10/10) | ✅ header content, controlled-tab-prop panel switch, onSetTab callback, post-comment-as-Tú, existing-comment-author, close-click, reopen-shown/hidden-by-closeReason, back-nav, merge-box-presence-by-status, changes-tab content | ➖ None needed |
| 4.4/4.5/4.6 | `components/hosting/__tests__/MergeBox.test.tsx` | Integration | N/A (new) | ✅ Written (module-not-found) | ✅ Passed (7/7) | ✅ clean-shows-everything, conflicts-hides-everything, missing-branch-hides-everything, outdated-warns-but-usable, canRebase:false-disables-only-rebase-option, submits-strategy+deleteBranch, inline-error-on-reject | ➖ None needed |
| 4.7/4.8/4.9 | `app/__tests__/useGitPlayground.test.ts` (comment/close/reopen/merge) | Unit (hook) | ✅ 38/38 pre-existing cases green before editing | ✅ Written (`hosting.comment`/`.close`/`.reopen`/`.merge` not a function) | ✅ Passed (46/46) | ✅ reject+accept pair per handler (comment empty-body / close-already-closed / reopen-not-closed / merge-unknown-id), merge success also asserts source-branch deletion when requested | ➖ None needed |
| 4.10/4.11/4.12 | `hooks/__tests__/usePersistence.test.ts` | Unit (hook) | ✅ 11/11 pre-existing cases green before editing | ✅ Written (new assertions on already-correct code) | ✅ Passed (13/13) immediately — confirms Deviation 12, no GREEN fix needed | ✅ pre-hosting-fixture-tolerance, hosting-bearing-round-trip (with a real PR inside) | ➖ None needed |
| 4.10/4.11/4.12 (supporting edit) | (new UI wiring: `PullRequestList`/`HostingView`/`PlaygroundShell`) | Integration | ✅ pre-existing cases green before each edit | ✅ Written (`onOpen is not a function` / missing props / `getByRole('tablist')` not found) | ✅ Passed (`PullRequestList` 5/5, `HostingView` 8/8, `PlaygroundShell` 10/10) | ✅ row-click nav, detail-vs-fallback-to-list routing, full create→open→merge e2e flow | ➖ None needed |
| 5.1 | (full suite) | N/A | N/A | N/A | ✅ `npm test` 765/765, `npx tsc -b --noEmit` clean, `npm run build` succeeds | N/A | N/A |
| 5.2 | `openspec/changes/simulated-hosting-merge-requests/qa-checklist.md` | Manual (human gate) | N/A | N/A | ⬜ NOT RUN — written, not executed, by design (see Deviation 13) | N/A | N/A |

### Test Summary
- **Total tests written (Phase 1–2)**: 68 — **Phase 3**: 42 — **Phase 4+5**: 47 (15 selectors + 10 PullRequestDetail + 7 MergeBox + 8 useGitPlayground + 2 usePersistence + 1 PullRequestList + 3 HostingView + 1 PlaygroundShell) — **Combined**: 157 new
- **Total tests passing**: 765/765 (full suite; 609 original baseline + 68 Phase 1–2 + 42 Phase 3 + 47 Phase 4-5 = 765, matching `npm test`'s own report) — `npx tsc -b --noEmit` clean, `npm run build` succeeds
- **Layers used (Phase 4-5)**: Unit (25 — selectors + hook handlers + persistence), Integration/DOM (22 — `PullRequestDetail`/`MergeBox`/`PullRequestList`/`HostingView`/`PlaygroundShell`), Manual (1 checklist, not executed), E2E (0 automated)
- **Approval tests** (refactoring): None — Phase 4-5 added new files plus additive prop/handler edits to `useGitPlayground.ts`/`PullRequestList.tsx`/`HostingView.tsx`/`PlaygroundShell.tsx`; `usePersistence.ts` received NO edit (Deviation 12)
- **Pure functions created (Phase 4-5)**: `strategyLabel`, `timelineText`, `mergeBlockedExplanation`, `mergeOutdatedWarning`, `rebaseDisabledHint`, `canReopen` (6); new handlers: `hosting.comment`/`close`/`reopen`/`merge` in `useGitPlayground` (impure — call the engine, dispatch)

## Deviations from Design

1. **File-creation ordering**: `hosting/replay.ts` was implemented one step ahead of its nominal task (2.3/2.4) because `hosting/mergeability.ts` (task 2.2) needs `replayOnto` to compute `canRebase`. `replay.ts` still has its own full RED→GREEN cycle and dedicated 6-case test suite (`hosting/__tests__/replay.test.ts`), so coverage is intact — only the *implementation* sequencing shifted, not the verification.
2. **Internal pure/wrapped split**: `hosting/create.ts` exports both a pure `createPr(s, input): PullRequest` (unit-tested directly, no `envolver` boilerplate) and the public `createPullRequest(estado, input): CommandResult` (the design-contract shape, `envolver`-wrapped). This mirrors the Strict TDD "prefer pure functions" guidance and is not visible to API consumers — `GitEngine.createPullRequest` is exactly the design's signature.
3. **`CloseReason`/`target-deleted` behavior**: design.md's main "Automatic Status Mirrors GitHub" prose only calls out source-branch deletion, but the `CloseReason` type (`'manual' | 'source-deleted' | 'target-deleted'`) and the design's "Open Questions" note ("a deleted target closes the PR") both call for `target-deleted` auto-close too. Implemented it in `syncHosting` for symmetry; not separately spec-scenario-tested since the spec's explicit scenario only covers `source-deleted`, but the type contract requires it to exist and be reachable.
4. **No changes to `usePersistence.ts`**: out of scope for this batch (Phase 4, task 4.10/4.11). The engine-level regression test (`hostingOf tolerates a round-tripped old gitpg:v1-style save`) confirms the underlying selector already tolerates a pre-hosting `RepoState` shape; the React hook itself is untouched until Phase 4.
5. **Toast copy wording**: design.md gives two exact quoted strings (source-deleted close, and the merge-strategy toast) — both reproduced verbatim (and asserted verbatim in `explain.test.ts`). The remaining PR event toasts (`pr-opened`, `pr-commented`, `pr-reopened`, `target-deleted` close, auto-merge/`external` merge) have no quoted text in design.md, so their Spanish copy was authored fresh, matching the tone/structure of the two given examples and the rest of `explain.ts`'s existing copy.

### Phase 3 deviations

6. **Free-text source/target instead of closed dropdowns**: design says the form lets the user "pick source/target"; a `<select>` restricted to `Object.keys(repo.remote.branches)` would make the engine's own "source not pushed to origin" rejection (spec scenario, task 3.6) unreachable from the UI, since an unpushed branch could never appear in that list. Implemented as free-text `<input>`s with a shared `<datalist>` of origin branches for discoverability/suggestions — the user can still type any branch name, matching the real GitHub "compare" flow where you can reference a branch that doesn't (yet) satisfy the merge-base requirements and get told so inline.
7. **`hosting.create` added to `useGitPlayground.ts` ahead of task 4.7**: task 4.7 ("add `hosting` handler group create/comment/close/reopen/merge") is nominally Phase 4, but `NewPullRequestForm`'s task 3.7 ("form submit → `createPullRequest` handler") needs a real, persisted, toast-producing handler now — a throwaway/local-only stand-in would have been replaced wholesale in Phase 4 anyway. Added `HostingOutcome`, `HostingHandlers`, and `hosting.create` now, following exactly the pattern design's data-flow diagram describes for `hosting.merge` (`res = GitEngine.X(...)`; error → skip `applyResult`, return `{ok:false,lines}`; success → `applyResult(res,null)`, return `{ok:true}`). Phase 4 (task 4.7) now only needs to EXTEND the same `hosting` object with `comment`/`close`/`reopen`/`merge`, reusing this pattern — no rework, strictly additive.
8. **PR route (`useHostingView`'s `pr{id,tab}` state) has no renderer yet**: `HostingView` already models the route (forward-compatible with `hostingSelectors`'s `HostingRoute`/`urlBarText`), but there is intentionally no `PullRequestDetail` component to render it — `PullRequestList`'s rows are not clickable in this batch (the spec's "Pull Request List" requirement only calls for status/title/branches visibility, not navigation into detail; click-through is Phase 4's `PullRequestDetail`/tabs work, tasks 4.1–4.3).
9. **"Pull requests (n)" count is the OPEN-PR count**, not the total PR count — mirrors a notification-badge convention (open items needing attention); not explicitly specified by design/spec, which only shows the literal string `"Pull requests (n)"` without defining `n`.

### Phase 4 + 5 deviations

10. **"Reabrir pull request" visibility rule simplified to `closeReason`, not live branch existence**: spec's "Automatic Status Explanation Copy" requirement says the branch-deleted explanation "hides reopen". The engine's own `reopenPullRequest` rejects only while the source branch is STILL missing (`lifecycle.ts`: `closeReason==='source-deleted' && !s.remote.branches[pr.source]`) — i.e. it would allow reopening again once the branch is recreated. `ui/hostingSelectors.canReopen` instead hides the button whenever `pr.closeReason === 'source-deleted'`, full stop, regardless of whether the branch was later recreated. Exposing "is the source currently back on origin" to the UI for a CLOSED PR would need a new field on `PrView` (today `sourceHash`/`mergeability` are only computed for `status==='open'` PRs in `hosting/view.ts`) — out of scope for this batch's task list. Net effect: if a user recreates a deleted source branch, the "Reabrir" button stays hidden in the UI even though the engine would technically accept the call; the user would need to open a NEW PR instead. Flagged here as a known gap, not silently worked around.
11. **Merge-box copy centralized in `ui/hostingSelectors.ts` rather than inlined in `MergeBox.tsx`**: `mergeBlockedExplanation`/`mergeOutdatedWarning`/`rebaseDisabledHint`/`strategyLabel` live as pure, independently unit-tested functions in the selectors module (same convention `urlBarText`/`statusBadge`/`noOriginBranchesHint` already established in Phase 3), rather than as string literals inside the component. Not explicitly required by tasks.md, but keeps the Spanish wording consistent, testable without rendering React, and easy to adjust in one place if the maintainer wants to tweak copy later.
12. **No code change to `usePersistence.ts`** (tasks.md 4.10/4.12 nominally say "Modify"): `readInitial()`/`save()` both treat `repo` as an opaque value — the only validation is `value.v === 1` — so an absent OR present `hosting` key passes through unchanged on both read and write paths. This matches design.md's own "Migration / Rollout" note ("No migration. Old saves have no `hosting` and read as empty."). Two tests were added (RED, per Strict TDD) and both passed on the FIRST run with zero implementation changes — logged here rather than silently treated as "nothing to do," per the instruction to flag when a task's planned GREEN step turns out to require no code.
13. **`qa-checklist.md` is written but explicitly NOT executed**: task 5.2 says "write" the checklist; this batch does exactly that and marks it "Status: NOT RUN" at the top of the file, per the explicit instruction that this is a human gate and the agent must not claim it passed. Automated verification (5.1: `npm test`/`tsc`/`build`) IS claimed as passing, since those were actually run by this batch.
14. **`PullRequestDetail`'s merge/close/reopen handlers take `id` as their first argument** (`onComment(id, body)`, `onClose(id)`, `onReopen(id)`, `onMerge(id, strategy, deleteBranch)`), matching `HostingHandlers`' shape 1:1 (`playground.hosting.comment`/`close`/`reopen`/`merge` are passed straight through `HostingView` → `PullRequestDetail` with no wrapping, same convention `onCreate={playground.hosting.create}` already used in Phase 3). `MergeBox`'s own `onMerge` prop, by contrast, is ALREADY bound to the PR id by `PullRequestDetail` (`(strategy, deleteBranch) => onMerge(pr.id, strategy, deleteBranch)`) — `MergeBox` itself has no concept of PR id, only mergeability + target branch name, since it's meant to be a reusable, self-contained "ready to submit" widget.

## Issues Found

None — no pre-existing test broke in any of the 3 batches, no TypeScript errors, `npm run build` succeeds after all batches.

## Workload / PR Boundary

- Mode: size:exception (per orchestrator-resolved `delivery_strategy: exception-ok`)
- Batch 1 work unit: Suggested Work Units 1–2 (Engine hosting model + lifecycle; server-side merge + mergeability) — completed
- Batch 2 work unit: Suggested Work Unit 3 (Web view shell, PR list, new PR form) — completed
- Batch 3 work unit: Suggested Work Units 4–5 (PR detail tabs, merge box, handler/persistence wiring, verification + QA checklist) — completed this batch, FINAL batch
- Boundary (batch 3): Starts from the Phase 3 baseline (718/718 green, PR list/create but no detail view, no merge UI) and ends with the full feature wired end-to-end — create → view detail → comment/close/reopen → merge (3 strategies) — through the UI with no terminal output on any hosting action, plus full regression (765/765 green). Rollback = delete `src/components/hosting/{PullRequestDetail,ConversationTab,CommentForm,CommitsTab,ChangesTab,MergeBox}.tsx` (+ their `.module.css`/`__tests__`); revert the additive edits to `PullRequestList.tsx` (`onOpen` prop + button-ized rows), `HostingView.tsx` (new props + `pr`-route rendering), `PlaygroundShell.tsx` (`activePrView` memo + new `HostingView` props), `useGitPlayground.ts` (remove `comment`/`close`/`reopen`/`merge` from `hosting`), `ui/hostingSelectors.ts` (remove the 6 new pure functions); delete `openspec/changes/simulated-hosting-merge-requests/qa-checklist.md`. `usePersistence.ts` has NO edit to roll back (Deviation 12). No persisted-data migration needed in either direction.
- Estimated review budget impact: Phase 4-5 added ~7 new component files + 2 new CSS modules + 5 modified files + 1 new markdown checklist (~900-1100 changed lines incl. tests/CSS) — this closes out the full tasks.md plan; the original forecast's "size:exception, single PR" path is now fully realized across 3 batches/commits-worth of work (no PR has actually been opened by this agent — see Rules: "Do NOT create git commits").

## Remaining Tasks

None — all 39 task lines across Phase 1–5 are `[x]`. The only open item is the manual QA pass itself (`qa-checklist.md`'s own checkboxes), which is explicitly a human gate, not an agent task.

## Status

39/39 total task lines in tasks.md are complete (Phase 1 through Phase 5). `npm test` 765/765, `npx tsc -b --noEmit` clean, `npm run build` succeeds. Ready for `sdd-verify`. The manual QA checklist (`qa-checklist.md`) still needs a human to actually run it before this change is considered fully verified end-to-end in a browser.
