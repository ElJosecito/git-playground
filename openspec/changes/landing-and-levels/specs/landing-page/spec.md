# landing-page Specification

## Purpose

The marketing/explainer entry point at `#/`: an engine-driven live hero
demo, feature/how-it-works/worlds-preview sections, and dual CTAs into the
sandbox and the levels mode.

## Requirements

### Requirement: Engine-Driven Hero Demo

The hero MUST animate a commit graph by replaying a fixed, canned command
script through the real `GitEngine`, read-only (no terminal input accepted
in the hero), looping when the script finishes.

#### Scenario: Hero builds the graph from the canned script
- GIVEN the landing page mounts
- WHEN the hero demo starts
- THEN the graph builds step by step exactly as the canned script would
  produce via the real engine

#### Scenario: Hero loop restarts after completion
- GIVEN the hero has finished replaying its script once
- WHEN the loop restarts
- THEN the graph resets and replays from the same initial state

### Requirement: Reduced Motion Respect

When `prefers-reduced-motion` is set, the hero MUST skip the step-by-step
animation and show the script's final graph state as a static frame.

#### Scenario: Reduced motion shows a static graph
- GIVEN the OS/browser reports `prefers-reduced-motion: reduce`
- WHEN the landing page mounts
- THEN the hero shows the final graph state immediately, without animating

### Requirement: Core Sections

The landing page MUST render, in order: Hero, Features, How it works,
Worlds preview, and a dual CTA ("Empezar niveles" → `#/niveles`, "Modo
libre" → `#/playground`).

#### Scenario: CTAs navigate to the correct routes
- GIVEN the landing page is rendered
- WHEN the user clicks "Empezar niveles" or "Modo libre"
- THEN the hash changes to `#/niveles` or `#/playground` respectively

### Requirement: Theme-Aware Styling

The landing page MUST use the existing dark/light theme tokens and the
Geist/Geist Mono font families already loaded by the app; it MUST NOT
introduce a second font family.

#### Scenario: Landing respects the active app theme
- GIVEN the app theme is light
- WHEN the landing page renders
- THEN its colors follow the light theme's CSS custom properties

### Requirement: Code-Split Isolation

The landing page's own module graph MUST NOT eagerly import
`PlaygroundShell` or `LevelShell`; it imports only the engine functions and
layout helpers needed for the hero.

#### Scenario: Landing bundle excludes engine-heavy shells
- GIVEN a production build
- WHEN the landing route's chunk is inspected
- THEN it contains no `PlaygroundShell`/`LevelShell` component code
