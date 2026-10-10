# Delta for app-shell

## MODIFIED Requirements

### Requirement: `gitpg:v1` Persistence Schema

The shell MUST persist `{repo, theme, hist}` under `localStorage` key
`gitpg:v1`, writing `hist` capped to the last 100 entries, and MUST load and
apply this exact schema on boot if present, tolerating a `repo` saved before
the `hosting` field existed.
(Previously: schema assumed `repo` always matched the current `RepoState`
shape exactly.)

#### Scenario: Reload restores state
- GIVEN a repo state, theme, and command history exist under `gitpg:v1`
- WHEN the page reloads
- THEN the same repo, theme, and history are restored without data loss

#### Scenario: Corrupt or missing storage
- GIVEN `localStorage.getItem('gitpg:v1')` is missing or invalid JSON
- WHEN the app boots
- THEN it falls back to a fresh/seed state without throwing

#### Scenario: Load pre-hosting save
- GIVEN a `gitpg:v1` save written before `hosting` existed (`repo` has no
  `hosting` key)
- WHEN the app boots
- THEN the repo loads successfully with `hosting` defaulted to an empty
  container and no crash

## ADDED Requirements

### Requirement: Hosting Web View Entry Point

The shell MUST provide a toggle, reachable from the ActionBar and from the
origin remote box, that swaps the main canvas to the full-area simulated
hosting web view and back.

#### Scenario: Toggle opens web view
- GIVEN the playground is showing the graph canvas
- WHEN the user activates the hosting view toggle
- THEN the canvas is replaced by the full-area hosting web view

#### Scenario: Toggle returns to graph
- GIVEN the hosting web view is open
- WHEN the user activates the toggle again (or a back action)
- THEN the graph canvas is restored with state unchanged
