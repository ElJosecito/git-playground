# Delta for app-shell

## MODIFIED Requirements

### Requirement: `window.GitPlayground` Debug API

The shell MUST expose `window.GitPlayground = {estado, ejecutar, motor,
cargar}` where `estado()` returns the current repo state, `ejecutar(cmd)`
runs a command, `motor()` returns the engine module, and `cargar(estado)`
loads an arbitrary state. The debug API MUST always bind to whichever
shell instance is currently mounted — the sandbox at `#/playground` or the
active level at `#/niveles/:id` — rebinding automatically on route change.
(Previously: bound to the single always-mounted `PlaygroundShell` instance;
no route-aware rebinding existed, since there was no router.)

#### Scenario: Load external state via debug API
- GIVEN a valid `RepoState` object
- WHEN `window.GitPlayground.cargar(estado)` is called
- THEN the active shell's current state updates to the provided state and
  re-renders

#### Scenario: Run a command via debug API
- GIVEN the app is running
- WHEN `window.GitPlayground.ejecutar('git log')` is called
- THEN it behaves identically to typing the command in the active shell's
  terminal

#### Scenario: Debug API rebinds on navigation
- GIVEN `window.GitPlayground` is bound to the sandbox at `#/playground`
- WHEN the user navigates to `#/niveles/:id`
- THEN `estado()`/`ejecutar()` subsequently operate on that level's
  `RepoState`, not the sandbox's

### Requirement: Theme Toggle

The shell MUST support dark (default) and light themes via a `data-theme`
attribute driving CSS custom properties, toggleable from the action bar
and persisted. The theme MUST be global across the app: a change made on
any route (landing, sandbox, or a level) MUST apply immediately to every
other route and persist across navigation and reload.
(Previously: theme scope was implicitly sandbox-only, since no other
routes existed; cross-route propagation was undefined.)

#### Scenario: Toggle to light theme
- GIVEN the app is in dark theme (default)
- WHEN the user toggles theme
- THEN `data-theme` updates accordingly and the choice persists across
  reload

#### Scenario: Theme set on one route applies to another
- GIVEN the user is on `#/niveles` and switches to light theme
- WHEN they navigate to `#/playground`
- THEN the playground renders in light theme without a manual re-toggle

### Requirement: `gitpg:v1` Persistence Schema

The shell MUST persist `{repo, theme, hist}` under `localStorage` key
`gitpg:v1`, writing `hist` capped to the last 100 entries, and MUST load
and apply this exact schema on boot if present, tolerating a `repo` saved
before the `hosting` field existed. A theme change made from any route
MUST be persisted by rewriting only the `theme` field of this record —
`repo` and `hist` MUST NOT be touched by a theme-only update, and the
overall schema shape MUST NOT change.
(Previously: schema assumed `repo` always matched the current `RepoState`
shape exactly; theme writes were not scoped to a single-field rewrite,
since theme had no cross-route concern.)

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

#### Scenario: Theme-only update preserves repo and hist
- GIVEN a saved `gitpg:v1` record with a non-trivial `repo` and `hist`
- WHEN the user toggles theme from the landing page or a level
- THEN only the `theme` field changes in storage; `repo` and `hist` remain
  byte-identical

## ADDED Requirements

### Requirement: Route Switch Owns the App Root

The app root MUST become a route switch rendering the landing page, the
sandbox, or levels by hash, with the sandbox moving from the root to
`#/playground`. Loading the app with no hash present MUST behave as the
landing route.

#### Scenario: Loading with no hash shows the landing page
- GIVEN the user opens the app's URL with no `#` fragment
- WHEN the app mounts
- THEN the landing page renders, equivalent to `#/`
