# level-progress Specification

## Purpose

Star scoring, linear world-unlock rules, and the `gitpg:levels:v1`
persisted ledger — fully independent of the sandbox's `gitpg:v1`.

## Requirements

### Requirement: Star Scoring Rule

A completed level MUST earn: **1 star** if any hint or the solution was
viewed during the attempt (regardless of budget); **2 stars** if zero
hints/solution were used, regardless of the budget; **3 stars** only if
zero hints/solution were used AND the attempt's counted action total is
within the level's command budget.

#### Scenario: One hint caps stars at 1 even within budget
- GIVEN the player revealed one hint but finished within budget
- WHEN the level completes
- THEN exactly 1 star is awarded

#### Scenario: No hints but over budget earns 2 stars
- GIVEN the player used no hints but exceeded the command budget
- WHEN the level completes
- THEN exactly 2 stars are awarded

#### Scenario: No hints and within budget earns 3 stars
- GIVEN the player used no hints and stayed within the command budget
- WHEN the level completes
- THEN exactly 3 stars are awarded

### Requirement: Linear World Unlock

Levels MUST unlock in `order` within a world. The next world MUST unlock
only once every level in the current world has at least 1 star.

#### Scenario: Completing a world unlocks the next world's first level
- GIVEN all levels in world N have >=1 star
- WHEN progress is recomputed
- THEN world N+1's first level becomes reachable from the level map

#### Scenario: An incomplete world keeps the next world locked
- GIVEN at least one level in world N has 0 stars
- WHEN the level map renders
- THEN every level in world N+1 shows as locked

### Requirement: `gitpg:levels:v1` Schema

Progress MUST persist as `{v:1, completed: Record<levelId, {stars,
bestCommandCount, completedAt}>, unlocked: string[]}` under its own
`localStorage` key, independent of `gitpg:v1`.

#### Scenario: Reload restores completed levels and unlocks
- GIVEN `gitpg:levels:v1` holds completed levels and unlocks
- WHEN the page reloads
- THEN the level map shows the same stars and unlock state

#### Scenario: Corrupt or missing ledger falls back safely
- GIVEN `gitpg:levels:v1` is missing or invalid JSON
- WHEN the app boots
- THEN it falls back to a fresh, all-locked-except-world-1 ledger without
  throwing

### Requirement: In-Progress Snapshot Versioning

An in-progress snapshot (repo, hist, hints used, action count) MAY be kept
per level, tagged with the level's content version. On version mismatch at
load, the snapshot MUST be discarded and the level restarted from
`setupScript` instead of applied.

#### Scenario: Stale snapshot after a level edit is discarded
- GIVEN a saved snapshot tagged with an older level version
- WHEN the player reopens that level after a content update
- THEN the snapshot is discarded and the level starts fresh from
  `setupScript`

### Requirement: Reset Progress

"Reiniciar progreso" MUST clear only the `gitpg:levels:v1` key.

#### Scenario: Resetting progress leaves the sandbox save intact
- GIVEN both `gitpg:v1` and `gitpg:levels:v1` hold data
- WHEN the user confirms "Reiniciar progreso"
- THEN `gitpg:levels:v1` is cleared and `gitpg:v1` is untouched
