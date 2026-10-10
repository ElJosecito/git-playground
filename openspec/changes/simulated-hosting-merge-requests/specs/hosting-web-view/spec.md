# hosting-web-view Specification

## Purpose

A simulated GitHub-style web view of the `origin` remote — PR list, creation
form, PR detail with tabs, and merge box — reachable as a full-area canvas
swap, in Spanish, so learners practice the real PR review/merge loop.

## Requirements

### Requirement: View Toggle

The web view MUST be reachable via a toggle in the ActionBar and from the
origin remote box, swapping the full-area canvas (not a modal) between the
graph view and the hosting web view.

#### Scenario: Open from ActionBar
- GIVEN the graph canvas is showing
- WHEN the user clicks the hosting view toggle in the ActionBar
- THEN the canvas swaps to the hosting web view

#### Scenario: Open from remote box
- GIVEN the graph canvas is showing
- WHEN the user clicks the origin remote box's hosting entry point
- THEN the canvas swaps to the hosting web view

### Requirement: Pull Request List

The web view MUST show a list of PRs with status, title, source→target, and
a "Nuevo pull request" action.

#### Scenario: List shows PRs by status
- GIVEN PRs in various statuses exist
- WHEN the list renders
- THEN each PR's status, title, and source→target branches are visible

### Requirement: Creation Form

The web view MUST provide a form to pick source/target branches, title, and
description, surfacing the engine's rejection reasons inline.

#### Scenario: Rejected creation shows guidance
- GIVEN the user selects a source branch not pushed to origin
- WHEN they submit the form
- THEN the form shows the `git push -u origin <rama>` guidance and no PR is
  created

### Requirement: Pull Request Detail Tabs

A PR's detail view MUST show three tabs — "Commits", "Cambios" (diff),
"Comentarios" — each reflecting live engine-derived data.

#### Scenario: Switch between tabs
- GIVEN a PR detail view is open
- WHEN the user switches from "Commits" to "Cambios"
- THEN the diff view renders the same source/target diff the engine derives

#### Scenario: Post a comment
- GIVEN the "Comentarios" tab is open
- WHEN the user submits a comment
- THEN the new comment appears attributed to "Tú"

### Requirement: Merge Box

An open PR's detail view MUST show a merge box offering the three merge
strategies and an "Eliminar rama" checkbox, triggering the corresponding
engine merge call, UNLESS mergeability is `conflicts` (base 3-way merge
conflicts), in which case the merge box is disabled/hidden entirely. An
`outdated` PR MUST still show a usable merge box with a non-blocking warning.
If `canRebase` is `false` while the base state is `clean`, only the
"Rebase" option MUST be disabled; "Fusionar" (merge-commit) and "Squash"
remain available.

#### Scenario: Merge via UI
- GIVEN an open, mergeable PR
- WHEN the user picks "Squash" in the merge box and confirms
- THEN the squash merge runs and the detail view reflects `merged` status

#### Scenario: Merge box disabled on conflict
- GIVEN a PR with `conflicts` mergeability
- WHEN the detail view renders
- THEN the merge box is disabled/hidden and a conflict explanation shows
  instead

#### Scenario: Outdated PR still shows a usable merge box
- GIVEN a PR with `outdated: true` and no conflicts
- WHEN the detail view renders
- THEN the merge box is shown and usable, alongside a non-blocking "rama
  base desactualizada" warning

#### Scenario: Rebase option disabled on rebase-only conflict
- GIVEN a PR whose base mergeability is `clean` but `canRebase: false`
- WHEN the detail view renders
- THEN only the "Rebase" option in the merge box is disabled; "Fusionar" and
  "Squash" remain available

### Requirement: Automatic Status Explanation Copy

When the engine auto-transitions a PR, the detail/list view MUST show the
Spanish explanation copy for that transition.

#### Scenario: Branch-deleted explanation shown
- GIVEN a PR auto-closed because its source branch was deleted
- WHEN the PR detail renders
- THEN it shows "La rama <source> fue eliminada" and hides the reopen action

#### Scenario: Auto-merged explanation shown
- GIVEN a PR auto-merged because source was already contained in target
- WHEN the PR detail renders
- THEN it explains the changes were already merged via existing commits

### Requirement: Action Feedback — Inline Errors and Toasts

Every hosting action (create, comment, close, reopen, merge) MUST surface
its outcome in the UI, never in the terminal. A FAILED action MUST show an
inline error in the originating form/view (creation form, comment form,
merge box, close/reopen control). A SUCCESSFUL action MUST produce a toast
notification derived from the engine's `explicar()` output for that PR
event, with no terminal output line.

#### Scenario: Failed action shows inline error, no terminal output
- GIVEN any hosting action that the engine rejects (e.g. a blocked merge or
  a duplicate PR)
- WHEN the rejection is received
- THEN the originating view shows the error inline and the terminal shows
  no new output line

#### Scenario: Successful action shows a toast, no terminal output
- GIVEN any hosting action that the engine accepts (e.g. a successful
  merge or a posted comment)
- WHEN the action succeeds
- THEN a toast appears with the `explicar()`-derived Spanish text and the
  terminal shows no new output line

### Requirement: Spanish UI Copy

All hosting web view copy (buttons, labels, statuses, guidance) MUST be in
Spanish, matching terms like "Nuevo pull request" and "Fusionar pull
request".

#### Scenario: Button labels in Spanish
- GIVEN the PR list and detail views render
- WHEN labels are inspected
- THEN primary actions read "Nuevo pull request" and "Fusionar pull request"
