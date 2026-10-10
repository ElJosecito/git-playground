# workspace-panels Specification

## Purpose

Supporting UI panels around the graph/terminal: the files strip (working
dir/staging/last-commit), conflict resolver, inline file editor, toasts,
tooltip, top-right action bar, and the empty-state overlay. UI copy is
Spanish, matching the prototype.

## Requirements

### Requirement: Files Strip

The files strip MUST show three collapsible columns (working directory,
staging, last commit) reflecting `estadoArchivos(estado)`, with a mobile
variant.

#### Scenario: File staged moves column
- GIVEN a modified file in the working directory
- WHEN the user stages it (`git add`)
- THEN the file moves from the working-directory column to the staging
  column

### Requirement: Conflict Resolver and Pill

During an in-progress op with conflicts, the resolver panel MUST show each
conflicted file's ours/theirs diff with actions `mine`/`theirs`/`both`/`edit`,
calling `engine.resolver(estado, file, modo)` with the chosen mode; a
collapsed pill MUST represent the resolver when minimized.

#### Scenario: Resolve with "mine"
- GIVEN a file has a merge conflict
- WHEN the user selects "mine" for that file
- THEN `resolver(estado, file, 'mia')` is called and a `conflict-resolved`
  event is reflected in the UI

#### Scenario: Collapse to pill
- GIVEN the resolver panel is open
- WHEN the user collapses it
- THEN it becomes a pill summarizing remaining conflicts, without losing
  resolver state

### Requirement: Inline File Editor Modal

The editor modal MUST open on an `edit` action (`accion:{tipo:'editar',
archivo}`), support `Ctrl+Enter` to save (calling `escribir(estado, file,
text)`) and `Esc` to cancel without saving.

#### Scenario: Save with Ctrl+Enter
- GIVEN the editor is open with modified text
- WHEN the user presses Ctrl+Enter
- THEN the file content is written via `escribir` and the modal closes

#### Scenario: Cancel with Esc
- GIVEN the editor is open with unsaved changes
- WHEN the user presses Esc
- THEN the modal closes and the file content is unchanged

### Requirement: Toast Notifications

Toasts MUST stack at top-center, cap at 2 concurrent, and auto-dismiss after
4 seconds.

#### Scenario: Third toast while two are showing
- GIVEN two toasts are visible
- WHEN a third toast is triggered
- THEN the stack still shows at most 2 at a time, consistent with the
  oracle's queue behavior

### Requirement: Tooltip

Hover/focus on a commit, branch, HEAD, tracking ref, tag, stash entry, or
phantom conflict node MUST show a tooltip positioned from world-to-screen
coordinates.

#### Scenario: Hover a commit node
- GIVEN the pointer hovers a commit node
- WHEN the hover triggers
- THEN a tooltip with that commit's info appears near the node's screen
  position

### Requirement: Top-Right Action Bar

The action bar MUST provide a teammate-commit trigger (`companero()`), a
theme toggle, and a reset-repo control with two confirmation options.

#### Scenario: Reset with confirmation
- GIVEN the user opens the reset-repo dropdown
- WHEN they pick a reset option
- THEN a second confirmation step is required before the repo resets

### Requirement: Empty State

When the repo is uninitialized, an empty-state overlay MUST be shown
in place of the graph.

#### Scenario: Before `git init`
- GIVEN a fresh/empty state (`!estado.inited`)
- WHEN the canvas renders
- THEN the empty-state overlay is shown instead of graph content
