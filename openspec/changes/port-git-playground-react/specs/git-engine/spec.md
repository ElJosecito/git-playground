# git-engine Specification

## Purpose

A pure, synchronous, JSON-serializable TypeScript engine that simulates git and
shell commands. The oracle for correctness is `design-handoff/git-engine.js`
(untouched, never modified) — parity against it, not "real git" semantics, is
the acceptance bar. Prototype bugs/quirks are ported as-is, not fixed.

## Requirements

### Requirement: Golden Parity Against Oracle

The engine MUST produce output (`salida`), `eventos`, `error`, and resulting
`estado` equal to `git-engine.js` for the same input sequence, excluding
non-deterministic fields (`commits[].t`, locale-formatted dates).

#### Scenario: Identical command corpus
- GIVEN the same seed state fed to both engines
- WHEN a scripted command sequence (init/add/commit, branch/switch/merge incl.
  conflicts, rebase incl. conflicts, cherry-pick, revert, reset soft/mixed/hard,
  stash push/pop/apply/drop, tag, push/fetch/pull incl. divergence,
  `companero()`, `clean`, unknown-command) runs on both
- THEN `salida`, `eventos`, `error`, and `estado` (minus non-deterministic
  fields) are deep-equal between oracle and port

#### Scenario: Prototype bug parity
- GIVEN an oracle behavior that is arguably a bug (e.g. a curated "not
  supported" message or an edge-case quirk)
- WHEN the same input runs on the port
- THEN the port reproduces the same behavior, not a "corrected" one

### Requirement: Command Surface Coverage

The engine MUST implement the full command dispatch table: `init, status, add,
restore, rm, mv, commit (-m/-a/-am/--amend), log (--oneline/--graph/--all),
show, diff (--staged), branch (-d/-D/-m/-a), switch (-c/-d), checkout
(-b/--/-- <file>), tag (-d), merge (--no-ff/--abort), rebase
(--continue/--abort/-i→unsupported), cherry-pick, revert, reset
(--soft/--mixed/--hard), stash (push/pop/apply/drop/list/show/clear), reflog,
remote (-v), push (-u/-f), fetch, pull (--rebase), clean (-n/-f), help,
version`, plus shell-level `ls, cat, touch, echo (>/>>), rm, mv, clear, pwd,
cd (stub), mkdir (fails), edit`.

#### Scenario: Unsupported subcommand
- GIVEN an unsupported or unknown git subcommand/flag
- WHEN it is executed
- THEN the engine returns the same curated "not supported" message or
  Levenshtein-based typo suggestion as the oracle

### Requirement: Deterministic Hashing

`hashStr` MUST be a bit-exact port (same `Math.imul`, unsigned-shift rounds)
so commit hashes are self-consistent given identical `(msg, parents, tree,
author, seq)` input.

#### Scenario: Same inputs, same hash
- GIVEN identical command sequences on fresh states
- WHEN commits are created
- THEN resulting hashes match the oracle's hashes exactly

### Requirement: State Shape and Lane/Color Order

The `RepoState` type MUST preserve the oracle's shape (`files, index, commits,
order, branches, colorOf, laneOf, lanes, head, stash, reflog, remote,
tracking, upstream, op, seq`) and MUST assign lanes/colors in first-seen
insertion order.

#### Scenario: Branch lane assignment
- GIVEN two branches created in a specific order
- WHEN `layout()` is computed
- THEN lane/color indices match the order they were first seen, per oracle

### Requirement: Event Vocabulary

The engine MUST emit the full event set (`repo-init, branch-created,
branch-deleted, branch-renamed, switched, detached, tag-created, tag-deleted,
commit-created, commit-amended, merge-commit, cherry-picked, reverted,
fast-forward, up-to-date, merge-conflict, rebase-done, commits-copied,
op-aborted, reset, stash-pushed, stash-popped, stash-dropped, push-sent,
fetch-received, pull-done, remote-commit, file-restored, conflict-resolved,
error`, plus diff-derived `file-created, file-deleted, file-modified,
file-staged, file-unstaged, head-moved, head-detached, ref-moved,
commits-orphaned, commits-restored`) with identical payload shapes.

#### Scenario: Diff-derived events
- GIVEN a state transition that changes HEAD and staged files
- WHEN `diffEventos(prev, next)`-equivalent logic runs
- THEN the same diff-derived events fire as in the oracle

### Requirement: Output Markup Encoding

All command output lines MUST use the `\x01kind\x02text\x03` segment encoding
(`kind` ∈ `m,g,r,y,w,e,h,cy,bold,c:<hexcolor>`) as the wire format to the UI.

#### Scenario: Colored output line
- GIVEN a command that emits colored output (e.g. `status`)
- WHEN the output is produced
- THEN each segment uses the exact `\x01kind\x02text\x03` markup the oracle uses

### Requirement: Three-Way Merge and Conflict Detection

The engine MUST implement LCS-diff + hunk-based 3-way merge (`fusionar3`) with
the same conflict-detection semantics, including partial-overlap hunks.

#### Scenario: Auto-mergeable change
- GIVEN non-overlapping edits on two branches
- WHEN merged
- THEN the result auto-merges without conflict, matching the oracle

#### Scenario: Conflicting change
- GIVEN overlapping edits on the same lines
- WHEN merged
- THEN a `merge-conflict` event fires and conflict data matches the oracle's
  `ours`/`theirs` shape

### Requirement: Operation State Machine

The engine MUST model `op` (merge/rebase/cherry-pick/revert) as a typed
discriminated union carrying conflicts, per-file ours/theirs data, abort
snapshots, and rebase pairs — supporting `--continue`/`--abort` resuming the
exact same op.

#### Scenario: Abort restores pre-op state
- GIVEN an in-progress merge with conflicts
- WHEN `merge --abort` runs
- THEN working dir/index are restored to the pre-merge snapshot, matching
  the oracle

### Requirement: Remote and Teammate Simulation

The engine MUST simulate a single fixed `origin` remote (`remote.branches`,
`remote.known`, `tracking`, `upstream`) independent of local `branches`, and
MUST support `companero()` simulating a teammate pushing to origin.

#### Scenario: Push rejected by diverged remote
- GIVEN local and remote branches have diverged
- WHEN `push` runs without `-f`
- THEN the push is rejected with the same message/event as the oracle

### Requirement: Explain, Completion, and Layout

The engine MUST provide `explicar(eventos, estado)` (Spanish, human-readable,
one mapping per event type), `completar(estado, linea)` (Tab-completion
pools), and `layout(estado)` (full SVG geometry: `pos, nodes, edges, links,
labels, phantom, rpos, rnodes, redges, rlabels, rbox, stash, bbox`) with
output equal to the oracle for the same state.

#### Scenario: Explain text for a commit event
- GIVEN a `commit-created` event
- WHEN `explicar` runs
- THEN the returned `{icon, tone, text}` matches the oracle's Spanish text
