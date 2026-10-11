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
Geist/Geist Mono font families already loaded by the app, and MUST NOT
introduce a second font family. Display accents and numbers use bold Geist
(weight 700, upright) with the branch-colored gradient — no thin or italic
serif display faces.

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

## Landing Redesign Delta (scroll narrative)

### ADDED Requirement: Scroll-Driven History Narrative

The landing page MUST present "scrolling as time-travelling through a
repo's history": a main-branch rail runs down the page and draws itself
with scroll progress (with a HEAD marker at its tip); each section is a
commit node (short hash + commit message eyebrow) that lands on the rail
when the rail's read-head (60% of the viewport) reaches it. Sections, in
order: Hero (first commit, live HeroDemo), Features ("Por qué aprender
aquí" — a `por-que` feature branch forks off the rail, carries 3 feature
commits with self-typing terminal / self-drawing graph visuals, and merges
back, scroll-scrubbed), How it works ("Cómo funciona" — 3 steps: terminal →
graph → PR merge, animated on reveal), Worlds ("6 mundos, 30 niveles" —
the 6 worlds from `worldsMeta.ts` as stations on the rail that light up
sequentially), and the CTA finale ("Tu primer commit te está esperando." —
lines converge into one HEAD node; command-styled CTAs). Animations MUST
use only IntersectionObserver, CSS transitions/keyframes, scroll-driven CSS
(`animation-timeline`, inside `@supports`) and a single shared
rAF-batched passive scroll listener — no animation runtime dependencies.
Decorative layers (grid, glows, noise, rail) MUST be separate
`aria-hidden` elements; masks/fades MUST NEVER be applied to content.

#### Scenario: Content is visible without animation
- GIVEN IntersectionObserver is unavailable or JS animation never fires
- WHEN the landing page renders
- THEN no element carries a reveal ("hidden") state and every section,
  heading and CTA is fully visible

#### Scenario: Sections reveal on scroll
- GIVEN motion is allowed and IntersectionObserver is supported
- WHEN a section enters the viewport
- THEN its armed (`data-reveal="hidden"`) elements switch to
  `data-reveal="shown"` and animate in

### MODIFIED Requirement: Reduced Motion Respect (landing-wide)

In addition to the hero's static final frame, when
`prefers-reduced-motion: reduce` is set the landing page MUST NOT arm any
scroll reveal, scrub any scroll-driven visual, or run parallax/count-up
motion: all content renders in its final, fully visible state. Any
auto-playing motion longer than 5s (the hero demo) MUST remain pausable.

#### Scenario: Reduced motion disables scroll animation
- GIVEN the OS/browser reports `prefers-reduced-motion: reduce`
- WHEN the landing page mounts
- THEN no element has `data-reveal` or `data-scroll-live`, and no
  IntersectionObserver is created for reveals
