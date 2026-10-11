# app-routing Specification

## Purpose

Hand-rolled hash routing between the landing page, the sandbox, and the
levels mode, including fallbacks, the locked-level guard, and route-level
code splitting. No router dependency is added.

## Requirements

### Requirement: Hash Route Table

The app MUST support exactly four routes via `window.location.hash`: `#/`
(landing), `#/playground` (sandbox), `#/niveles` (level map), and
`#/niveles/:id` (a level). Navigation MUST use native hash history so
back/forward and deep links work without extra wiring.

#### Scenario: Deep link loads a level directly
- GIVEN a user opens the app at `#/niveles/basics-01-primer-commit`
- WHEN the app mounts
- THEN the level player loads that level directly, without visiting the map

#### Scenario: Back button returns to the previous route
- GIVEN the user navigated from `#/niveles` to `#/niveles/basics-01-primer-commit`
- WHEN the user presses the browser back button
- THEN the app shows `#/niveles` again

### Requirement: Unknown Route Fallback

An unrecognized hash MUST redirect to `#/` using history replace (no extra
back-stack entry).

#### Scenario: Unknown hash redirects to landing
- GIVEN the user opens the app at `#/no-existe`
- WHEN the app mounts
- THEN the hash is replaced with `#/` and the landing page renders

### Requirement: Unknown Level Fallback

A `#/niveles/:id` where `id` is not in the level catalog MUST redirect to
`#/niveles`.

#### Scenario: Invalid level id redirects to the map
- GIVEN the user opens `#/niveles/no-existe`
- WHEN the app mounts
- THEN the hash is replaced with `#/niveles` and the level map renders

### Requirement: Locked Level Guard

A `#/niveles/:id` for a level whose world is not yet unlocked MUST render a
"Nivel bloqueado" view instead of the level, with a link back to the level
map. There MUST be no way to bypass this guard via direct URL entry.

#### Scenario: Direct URL to a locked level shows the blocked view
- GIVEN the player has not completed the prerequisite world
- WHEN they open `#/niveles/<locked-level-id>` directly
- THEN the "Nivel bloqueado" view renders instead of the level content

#### Scenario: Locked view link returns to the map
- GIVEN the "Nivel bloqueado" view is showing
- WHEN the user activates its link
- THEN the app navigates to `#/niveles`

### Requirement: Route-Level Code Splitting

The sandbox (`PlaygroundShell`) and levels (`LevelShell` + curriculum data)
bundles MUST be lazily loaded (`React.lazy`) so visiting `#/` never pulls
them into the initial chunk.

#### Scenario: Landing-only navigation excludes playground/level chunks
- GIVEN a user opens the app at `#/` and never navigates further
- WHEN the network/bundle chunks are inspected
- THEN no `PlaygroundShell` or `LevelShell` chunk has been fetched
