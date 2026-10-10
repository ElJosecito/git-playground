# Delta for git-engine

## ADDED Requirements

### Requirement: Optional, Lazily-Created Hosting Field

`RepoState.hosting` MUST be an OPTIONAL field, absent by default. `vacio()`
and `ejemplo()` output MUST remain unchanged from today (no `hosting` key,
still deep-equal to the oracle's shape — `parity.test.ts` compares the seed
state directly). The field MUST be created only lazily, on the first hosting
write operation. All reads MUST go through a `hostingOf(s)` selector that
returns `s.hosting` when well-formed, otherwise a fresh default container,
without mutating the input state as a read side effect.

#### Scenario: Fresh state has no hosting key
- GIVEN `vacio()` is called
- WHEN the resulting `RepoState` is inspected
- THEN it has no `hosting` key, matching the oracle's shape exactly

#### Scenario: Repos with no PRs never gain a hosting key
- GIVEN a repo with no PR activity
- WHEN any sequence of standard git/shell commands (including `companero()`)
  runs
- THEN the resulting `estado` still has no `hosting` key

#### Scenario: Old gitpg:v1 saves load unchanged
- GIVEN a `gitpg:v1` save written before `hosting` existed
- WHEN it is loaded
- THEN it loads exactly as before; `hostingOf(s)` returns a fresh default
  container on first read, without mutating the loaded state

### Requirement: Hosting Determinism

Once created, `hosting.nextId` and `hosting.clock` MUST be plain incrementing
counters, never `Date.now()` or `Math.random()`. Commit hashes produced by
server-side merges MUST use the existing `s.seq`-based hashing, unaffected by
hosting activity.

#### Scenario: Deterministic ids and timestamps across runs
- GIVEN the same command sequence creating two PRs from a fresh state
- WHEN run twice independently
- THEN both runs produce identical PR ids, identical `hosting.clock` values,
  and identical commit hashes
