# terminal Specification

## Purpose

A draggable, resizable terminal window that is the primary command input
surface: history navigation, Tab completion, and colored prompt/output
rendering of the engine's `\x01kind\x02text\x03` markup.

## Requirements

### Requirement: Command Input and Output Rendering

The terminal MUST send submitted input to `engine.ejecutar(estado, input)`
and render the returned `salida` lines by parsing the
`\x01kind\x02text\x03` markup into colored spans (`kind` ∈
`m,g,r,y,w,e,h,cy,bold,c:<hexcolor>`).

#### Scenario: Colored command output
- GIVEN the user submits `git status`
- WHEN the engine returns markup-encoded output
- THEN the terminal renders each segment with the color/style mapped from
  its `kind` code

### Requirement: History Navigation

The terminal MUST keep a command history and support `↑`/`↓` navigation
through previously entered commands, persisted (last 100 entries) under the
`gitpg:v1` schema's `hist` field.

#### Scenario: Recall previous command
- GIVEN the user has entered several commands
- WHEN the user presses `↑` repeatedly
- THEN each press shows progressively older commands in the input, and `↓`
  moves back toward the most recent

### Requirement: Tab Completion

The terminal MUST call `engine.completar(estado, linea)` on Tab and apply
the returned completion pool to the current input token.

#### Scenario: Complete a branch name
- GIVEN the user types `git switch fea` and presses Tab
- WHEN a unique branch name starts with `fea`
- THEN the input completes to the full branch name

#### Scenario: Ambiguous completion
- GIVEN multiple candidates match the current token
- WHEN Tab is pressed
- THEN the terminal presents the same candidate-listing behavior as the
  oracle (no silent single guess)

### Requirement: Colored Prompt Reflecting State

The prompt MUST reflect the current branch/HEAD state and any in-progress
operation (merge/rebase/cherry-pick/revert), matching the oracle's prompt
composition.

#### Scenario: Prompt during conflict
- GIVEN a merge is in progress with conflicts
- WHEN the prompt renders
- THEN it indicates the in-progress merge state as the oracle does

### Requirement: Drag, Resize, Minimize, Maximize

The terminal window MUST support dragging by its header, resizing via raw
pointer events, minimizing, and maximizing, with a distinct mobile
bottom-sheet layout.

#### Scenario: Drag repositions the window
- GIVEN the terminal is at a given position
- WHEN the user drags its header
- THEN the window follows the pointer and stays within viewport bounds

#### Scenario: Mobile bottom-sheet
- GIVEN the viewport is mobile-sized
- WHEN the terminal is shown
- THEN it renders as a bottom-sheet instead of a floating draggable window

### Requirement: Unknown Command Suggestions

When the engine returns a typo-suggestion for an unrecognized command, the
terminal MUST render it as regular output, unmodified.

#### Scenario: Typo suggestion shown
- GIVEN the user types a misspelled git subcommand
- WHEN the engine suggests the nearest valid command
- THEN the terminal displays that suggestion text
