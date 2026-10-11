# level-engine Specification

## Purpose

The pure, additive lesson-definition model: `LevelDef` data shape,
deterministic setup replay through the real engine, and pure checklist
predicates. The simulator engine itself (`src/engine/commands/*`,
`design-handoff/git-engine.js`) is never modified.

## Requirements

### Requirement: LevelDef Data Model

Each level MUST be defined as data with: `id`, `world`, `order`, Spanish
`titulo`/`objetivo`/`teoria`, `setupScript` (command strings), `solutionScript`
(command strings and/or hosting-action objects), `hints` (ordered Spanish
strings), `checklist` goals, a command budget (integer), and an optional
`allowHostingUI` flag.

#### Scenario: Level without the hosting flag hides PR UI
- GIVEN a `LevelDef` with `allowHostingUI` unset or `false`
- WHEN the level player mounts
- THEN no hosting/PR entry point is rendered for that level

### Requirement: Deterministic Setup Replay

A level's starting `RepoState` MUST be produced by replaying `setupScript`
through `GitEngine.ejecutar` starting from `vacio()`. Hand-built `RepoState`
JSON MUST NOT be used to seed a level.

#### Scenario: Setup replay is reproducible
- GIVEN the same `setupScript`
- WHEN it is replayed from `vacio()` twice
- THEN both resulting `RepoState` values are identical

### Requirement: Supported-Commands-Only Constraint

Every entry in `setupScript` and `solutionScript` MUST use only commands
present in the `GIT` dispatch table (`src/engine/commands/index.ts`), the
shell file commands (`touch`/`echo`/`edit`/`rm`/`mv`), or the hosting facade
actions (`createPullRequest`/`commentPullRequest`/`closePullRequest`/
`reopenPullRequest`/`mergePullRequest`). Subcommands in `unsupported.ts`'s
`NO` map (e.g. `rebase -i`, `clone`) MUST NOT appear.

#### Scenario: An unsupported command fails the catalog check
- GIVEN a `LevelDef` whose script contains an unsupported subcommand
- WHEN the catalog's solvability suite runs
- THEN the real dispatch rejects it and the test fails loudly

### Requirement: Pure Checklist Predicates

`validar(estado, eventos?, hist?)` MUST be a pure function with no engine
mutation, returning `{done, checklist}`. Its result MUST be computed as
derived/memoized render state in the level shell, not wired into the
command-apply pipeline as a side effect.

#### Scenario: Checklist re-evaluates after a command
- GIVEN a level with an incomplete checklist
- WHEN the player runs a command that satisfies a goal
- THEN the checklist item flips to done on the next render, without an
  explicit extra action

#### Scenario: Checklist re-evaluates after a PR action
- GIVEN a level whose goal depends on PR state (`allowHostingUI: true`)
- WHEN the player merges the PR through the web view
- THEN the checklist reflects the merge without a page reload
