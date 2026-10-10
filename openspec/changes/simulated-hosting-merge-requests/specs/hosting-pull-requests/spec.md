# hosting-pull-requests Specification

## Purpose

Pure, deterministic engine model and session operations for GitHub-style pull
requests against the simulated `origin` remote: creation, comments, merge
(3 strategies), close/reopen, and derived mergeability — mirroring GitHub's
automatic status behavior.

## Requirements

### Requirement: Pull Request Data Model

`RepoState.hosting` (when present — see git-engine's optional, lazily-created
hosting field) MUST hold `{prs, nextId: number, clock: number}` where each
`PullRequest` stores `source`/`target` branch names, `title`, `description`,
`status` (`open|closed|merged`), `comments`, and `mergeStrategy` (once
merged). No derived data (commits/diff/mergeability) is stored on the PR. The
container itself is created lazily on the first write; it does not exist on
a fresh `vacio()` state.

#### Scenario: Fresh state has no hosting container yet
- GIVEN `vacio()` is called and no PR action has run
- WHEN `hostingOf(s)` is read
- THEN it returns a fresh default container (`nextId: 1`, no PRs), while
  `s.hosting` itself remains absent

### Requirement: Create Pull Request

The engine MUST create a PR only when: source exists on `s.remote.branches`;
source != target; source has at least one commit ahead of target
(`ahead > 0`); no other `open` PR exists for the same `(source, target)`
pair. Each rejection MUST return a distinct, cause-matching error.

#### Scenario: Successful creation
- GIVEN `feature` is pushed to origin and differs from `main`
- WHEN a PR from `feature` to `main` is created
- THEN a new PR with `status: 'open'` is stored under an incrementing id

#### Scenario: Source not pushed to origin
- GIVEN `feature` exists only locally
- WHEN a PR from `feature` to `main` is attempted
- THEN the engine rejects, instructing `git push -u origin feature`

#### Scenario: No commits ahead of target
- GIVEN `feature` has zero commits ahead of `main` (`ahead === 0`)
- WHEN a PR between them is attempted
- THEN the engine rejects with a GitHub-style "nothing to compare" error,
  regardless of whether `main` is ahead of `feature`

#### Scenario: Duplicate open PR
- GIVEN an open PR already exists for `feature` → `main`
- WHEN another PR for the same pair is attempted
- THEN the engine rejects as a duplicate

### Requirement: Live Commit and Diff Tracking

A PR's commits and diff MUST be derived from `s.remote.branches[source]` and
`[target]` on demand, never cached on the PR, so new pushes are reflected
immediately.

#### Scenario: Push after PR creation updates diff
- GIVEN an open PR from `feature` to `main`
- WHEN a new commit is pushed to origin `feature`
- THEN the PR's next-derived commit list/diff includes the new commit,
  without mutating the PR record

### Requirement: Pull Request Comments

The engine MUST append comments authored "Tú" with an incrementing id to any
PR regardless of status.

#### Scenario: Add comment
- GIVEN an existing PR
- WHEN a comment is added
- THEN the PR's `comments` array gains an entry authored by "Tú"

### Requirement: Merge Strategies

The engine MUST merge an `open`, non-conflicting PR via `merge-commit`
(2-parent `nuevoCommit` using `fusionar3`), `squash` (1-parent `nuevoCommit`),
or `rebase` (replay source-only commits onto target), writing only to
`s.remote.branches[target]`, then set `status: 'merged'`. An optional
"Eliminar rama" flag MUST delete `s.remote.branches[source]` only.

#### Scenario: Merge commit strategy
- GIVEN an open, mergeable PR
- WHEN merged with `merge-commit`
- THEN `s.remote.branches[target]` advances to a new 2-parent commit and the
  PR becomes `merged`

#### Scenario: Squash strategy
- GIVEN an open, mergeable PR
- WHEN merged with `squash`
- THEN a single 1-parent commit summarizing source commits lands on target

#### Scenario: Rebase strategy
- GIVEN an open, mergeable PR with no conflicts
- WHEN merged with `rebase`
- THEN source-only commits are replayed onto target in order

#### Scenario: Delete source branch on merge
- GIVEN a merge flagged "Eliminar rama"
- WHEN the merge succeeds
- THEN `s.remote.branches[source]` is removed and target is unaffected
  beyond the merge

#### Scenario: Merge blocked by general conflicts
- GIVEN a PR whose derived mergeability reports `conflicts` (the base 3-way
  merge itself conflicts)
- WHEN any of the three merge strategies is attempted
- THEN the engine rejects the merge and the PR stays `open`

#### Scenario: Rebase-specific conflict blocks only rebase
- GIVEN a PR whose base mergeability is `clean` but whose rebase replay
  cannot apply cleanly (`canRebase: false`)
- WHEN `merge-commit` or `squash` is attempted
- THEN the merge proceeds normally
- WHEN `rebase` is attempted instead
- THEN the engine rejects only the rebase attempt and the PR stays `open`

### Requirement: Close and Reopen

The engine MUST allow closing an `open` PR and reopening a `closed` one,
except a PR auto-closed because its source branch was deleted MUST NOT be
reopened until that branch exists again on origin.

#### Scenario: Manual close and reopen
- GIVEN an open PR
- WHEN it is closed then reopened
- THEN its status returns to `open`

#### Scenario: Reopen blocked after source deletion
- GIVEN a PR auto-closed because `source` no longer exists on origin
- WHEN reopen is attempted
- THEN the engine rejects until `source` is pushed again

### Requirement: Derived Mergeability

Mergeability MUST be computed on demand, never persisted, reporting
`conflicts` (`fusionar3` on base/target/source conflicts — blocks all
strategies), `missing-branch`, or `clean`, plus independent `ahead`/`behind`
counts, an `outdated` flag (target advanced past the PR's merge base), and a
`canRebase` flag (whether the rebase-specific replay applies cleanly, which
can be `false` even when the base state is `clean`). `outdated` is
INFORMATIONAL ONLY and MUST NOT block any merge strategy.

#### Scenario: Mergeable PR
- GIVEN source and target diverge without overlapping edits
- WHEN mergeability is computed
- THEN it reports `clean`, `canRebase: true`

#### Scenario: Conflicted PR
- GIVEN overlapping edits between source and target
- WHEN mergeability is computed
- THEN it reports `conflicts`, mirroring `merge`'s conflict shape

#### Scenario: Outdated PR warns but does not block
- GIVEN target has new commits since the PR's merge base, with no conflicts
- WHEN mergeability is computed
- THEN it reports `outdated: true` alongside `clean`, with guidance to
  merge/rebase target locally then push, and all three merge strategies
  remain available

#### Scenario: Clean overall state with rebase-only conflict
- GIVEN the base 3-way merge is `clean` but replaying source-only commits
  individually onto target would conflict
- WHEN mergeability is computed
- THEN it reports `clean`, `canRebase: false`

### Requirement: Automatic Status Mirrors GitHub

A pure `syncHosting` step, appended to the end of every successful
`envolver()`/`ejecutar()` call (no background timers, no `Date.now()`), MUST
derive status transitions: an open PR whose `source` no longer exists on
origin becomes `closed` with an explanatory reason; an open PR whose
`source` is fully contained in `target` becomes `merged` via already-landed
commits. `syncHosting` MUST return immediately (no-op) when the repo has no
hosting state, so repos without PRs are completely unaffected.

#### Scenario: Source branch deleted on origin
- GIVEN an open PR whose `source` branch is deleted from origin
- WHEN the next successful engine operation completes and `syncHosting` runs
- THEN the PR becomes `closed` with reason "La rama <source> fue eliminada"

#### Scenario: Source already contained in target
- GIVEN an open PR whose source commits are all reachable from `target`
- WHEN the next successful engine operation completes and `syncHosting` runs
- THEN the PR becomes `merged` without a new commit

#### Scenario: No-op for repos without hosting state
- GIVEN a repo that has never had any PR activity (no `hosting` key)
- WHEN any engine operation completes
- THEN `syncHosting` performs no work and the resulting `estado` is
  unaffected

### Requirement: Hosting Determinism

All PR ids, comment ids, and ordering MUST use plain incrementing counters,
never `Date.now()` or `Math.random()`.

#### Scenario: Repeated runs produce identical ids
- GIVEN the same command sequence creating two PRs
- WHEN run twice from a fresh state
- THEN both runs assign identical PR ids in identical order

### Requirement: Action Result Feedback (No Terminal Output)

Hosting operations MUST NOT produce terminal/command-line output lines.
On success, the result MUST carry no `salida` lines; the operation's PR
event feeds `explicar()` so the UI can present a toast. On failure, the
result MUST carry no `salida` lines either; the caller MUST be able to
distinguish failure via the result's error and render it inline in the
originating view, never in the terminal.

#### Scenario: Successful hosting action produces no terminal output
- GIVEN a valid merge, close, reopen, create, or comment action
- WHEN it succeeds
- THEN the result's `salida` is empty and its event is available for
  `explicar()` to render as a toast

#### Scenario: Failed hosting action produces no terminal output
- GIVEN an invalid hosting action (e.g. a blocked merge)
- WHEN it fails
- THEN the result's `salida` is empty and the failure reason is only
  available to the caller for inline display
