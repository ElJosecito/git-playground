# app-shell Specification

## Purpose

Cross-cutting shell concerns: theme, `gitpg:v1` persistence, mobile layout,
the `window.GitPlayground` debug API, and accessibility live-region
announcements. These are load-bearing, undocumented contracts that MUST be
preserved exactly for forward compatibility (e.g. a future lessons layer).

## Requirements

### Requirement: Theme Toggle

The shell MUST support dark (default) and light themes via a `data-theme`
attribute driving CSS custom properties, toggleable from the action bar and
persisted.

#### Scenario: Toggle to light theme
- GIVEN the app is in dark theme (default)
- WHEN the user toggles theme
- THEN `data-theme` updates accordingly and the choice persists across reload

### Requirement: `gitpg:v1` Persistence Schema

The shell MUST persist `{repo, theme, hist}` under `localStorage` key
`gitpg:v1`, writing `hist` capped to the last 100 entries, and MUST load and
apply this exact schema on boot if present.

#### Scenario: Reload restores state
- GIVEN a repo state, theme, and command history exist under `gitpg:v1`
- WHEN the page reloads
- THEN the same repo, theme, and history are restored without data loss

#### Scenario: Corrupt or missing storage
- GIVEN `localStorage.getItem('gitpg:v1')` is missing or invalid JSON
- WHEN the app boots
- THEN it falls back to a fresh/seed state without throwing

### Requirement: `window.GitPlayground` Debug API

The shell MUST expose `window.GitPlayground = {estado, ejecutar, motor,
cargar}` where `estado()` returns the current repo state, `ejecutar(cmd)`
runs a command, `motor()` returns the engine module, and `cargar(estado)`
loads an arbitrary state.

#### Scenario: Load external state via debug API
- GIVEN a valid `RepoState` object
- WHEN `window.GitPlayground.cargar(estado)` is called
- THEN the app's current state updates to the provided state and re-renders

#### Scenario: Run a command via debug API
- GIVEN the app is running
- WHEN `window.GitPlayground.ejecutar('git log')` is called
- THEN it behaves identically to typing the command in the terminal

### Requirement: Mobile Layout

The shell MUST branch layout (terminal bottom-sheet, files-strip mobile
variant, camera safe-area math accounting for `vh`/bottom-sheet height) based
on viewport size, as one cohesive responsive concern.

#### Scenario: Narrow viewport switches layout
- GIVEN the viewport width is below the mobile breakpoint
- WHEN the app renders
- THEN terminal, files strip, and camera safe-area all use their mobile
  variants consistently (no partial/mixed layout)

### Requirement: Accessibility Live Region

The shell MUST maintain an `aria-live` region announcing significant state
changes (e.g. command results, errors) for screen-reader users.

#### Scenario: Command result announced
- GIVEN a screen reader is active
- WHEN a command produces output or an error
- THEN the live region's content updates to reflect it

### Requirement: Spanish UI Copy

All shell-level UI copy (toasts, confirmations, tooltips, labels) MUST remain
in Spanish, matching the prototype's text.

#### Scenario: Reset confirmation text
- GIVEN the user opens the reset-repo confirmation
- WHEN the confirmation text renders
- THEN it is in Spanish, matching the oracle's wording
