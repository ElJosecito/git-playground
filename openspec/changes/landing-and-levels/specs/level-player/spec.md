# level-player Specification

## Purpose

`LevelShell` and `LessonPanel`: the UI that runs a level session —
objective/theory, live checklist, hints, solution reveal, budget counter,
reset, and the success screen — built from the same leaf components as the
sandbox.

## Requirements

### Requirement: Shared Component Reuse

`LevelShell` MUST compose `Canvas`, `GraphLayer`, the terminal, and (only
when `allowHostingUI`) `HostingView` from the exact same components
`PlaygroundShell` uses — not forked copies.

#### Scenario: Level without a PR goal hides HostingView
- GIVEN a level with `allowHostingUI` unset
- WHEN the level player renders
- THEN no hosting entry point appears anywhere in the shell

### Requirement: Live Checklist Panel

`LessonPanel` MUST display the level's objective, theory, and checklist,
and the checklist MUST re-render from `validar()`'s derived result after
every applied command or hosting action.

#### Scenario: Checklist item flips to done live
- GIVEN a checklist item is unmet
- WHEN the player's command satisfies it
- THEN the item shows as done without further interaction

### Requirement: Progressive Hints and Solution Reveal

Hints MUST reveal one at a time on explicit request, in order. The full
solution MUST be viewable on demand. Both revealing a hint and viewing the
solution MUST be recorded as "hints used" for that attempt.

#### Scenario: Revealing one hint leaves the rest hidden
- GIVEN a level with 3 hints and none revealed
- WHEN the player requests the next hint
- THEN exactly 1 hint is visible and 2 remain hidden

#### Scenario: Viewing the solution counts as a hint used
- GIVEN a level with zero hints revealed yet
- WHEN the player opens the solution view
- THEN the attempt's "hints used" flag becomes true, capping stars per
  level-progress's star rule

### Requirement: Command Budget Counter

The player MUST display a live count against the level's budget, counting
every submitted non-empty command that is not read-only (failed attempts
included) plus every PR web-view action (including a failed/rejected PR
action, e.g. a merge blocked by conflicts) plus every conflict-resolver
"Resolver" action and every editor "Guardar" (file save) action; read-only
commands (`git status`, `git log`, `git show`, `git diff`, `git reflog`,
`git branch` with no args/`-a`/`-v`, `git remote -v`, `git stash list`/
`show`, `help`, `ls`, `cat`, `pwd`, `clear`/`cls`) MUST NOT increment it.

#### Scenario: Resolving a conflict counts as one action
- GIVEN the player opens the conflict resolver for a file
- WHEN they confirm a resolution ("mia"/"suya"/"ambas")
- THEN the budget counter increments by 1

#### Scenario: Saving a file via the editor counts as one action
- GIVEN the player opens the mini editor for a file
- WHEN they save it
- THEN the budget counter increments by 1

#### Scenario: A failed PR web-view action still increments the counter
- GIVEN the player attempts a PR action the hosting facade rejects (e.g. a
  blocked merge)
- WHEN the rejection is shown
- THEN the budget counter increments by 1

#### Scenario: A failed command attempt still increments the counter
- GIVEN the player submits a command the engine rejects
- WHEN the rejection is shown
- THEN the budget counter increments by 1

#### Scenario: A read-only command does not increment the counter
- GIVEN the player runs `git status`
- WHEN the terminal shows the result
- THEN the budget counter is unchanged

### Requirement: Level Reset

"Reiniciar nivel" MUST replay `setupScript` fresh, reset the attempt's
hints-used flag and action counter to zero, and MUST NOT affect any other
level's saved progress.

#### Scenario: Reset restores the pristine setup state
- GIVEN the player has run several commands and revealed a hint
- WHEN they activate "Reiniciar nivel"
- THEN the repo state matches a fresh `setupScript` replay and the hint/
  counter state is cleared

### Requirement: Success Screen

On checklist completion, the player MUST show a success screen with the
stars earned and a "Siguiente nivel" action; the action MUST be absent or
disabled when there is no next level, or when the next level's world is
still locked.

#### Scenario: Last level of a world shows no shortcut into a locked world
- GIVEN the player completes the final level of a world whose next world
  is not yet unlocked
- WHEN the success screen renders
- THEN "Siguiente nivel" is absent or disabled
