# graph-canvas Specification

## Purpose

Renders the SVG commit graph (local + remote lanes, phantom conflict nodes,
labels, stash) over a pannable/zoomable camera, with WAAPI-driven birth/move
choreography between consecutive `layout()` snapshots. Visual/timing parity
with the prototype is judged by manual QA ("close enough"), not pixel-exact
automated comparison.

## Requirements

### Requirement: Graph Rendering from Layout Output

The canvas MUST render nodes, edges, labels, and phantom conflict markers
directly from `engine.layout(estado)` geometry (`pos, nodes, edges, links,
labels, phantom, rpos, rnodes, redges, rlabels, rbox, stash, bbox`), as a
single memoized layer keyed per node/edge/label.

#### Scenario: Commit graph reflects state
- GIVEN a repo state with branches, merges, and a stash entry
- WHEN the canvas renders
- THEN every commit, edge, branch label, and stash marker from `layout()`
  appears with matching position and color

### Requirement: Pan and Zoom Camera

The camera (`cam = {x, y, k}`) MUST support pan, wheel/pinch zoom, and MUST be
applied imperatively via `transform` on a ref'd `<g>` element without
triggering React re-renders on every frame.

#### Scenario: Drag pans the canvas
- GIVEN the canvas is idle
- WHEN the user drags the background
- THEN the graph translates by the drag delta without state re-render thrash

#### Scenario: Pinch/wheel zooms around a focal point
- GIVEN the canvas is idle
- WHEN the user scrolls/pinches at a point
- THEN zoom level changes centered on that point, matching the prototype's
  zoom math

### Requirement: Safe-Area Fit and Center

The camera MUST compute a "safe area" rectangle (excluding the terminal
window's footprint) and use it for auto-fit (frame all nodes) and
auto-center-on-HEAD actions.

#### Scenario: Fit button frames the graph
- GIVEN a repo with multiple branches spread across lanes
- WHEN the user triggers "fit"
- THEN the camera adjusts so the full graph bounding box is visible within
  the safe area

#### Scenario: Center-on-HEAD
- GIVEN HEAD points to a commit off-screen
- WHEN the user triggers "center on HEAD"
- THEN the camera pans/zooms so that commit is centered in the safe area

### Requirement: WAAPI Birth/Move Choreography

Transitioning between two consecutive `layout()` snapshots MUST produce a
`plan` (per-node birth delay/origin, label move paths, camera moves) executed
via `Element.animate`, with each DOM node animating at most once per plan
version (ref-callback identity guard, equivalent to `el.__born === plan`).

#### Scenario: New commit animates in
- GIVEN a commit is created
- WHEN the graph re-renders with the new `layout()` snapshot
- THEN the new node plays a birth animation once, and existing nodes that
  moved play a move animation, without duplicate replays on subsequent
  re-renders of the same plan

#### Scenario: Cross-DOM fly animation
- GIVEN an action that moves a visual chip between two arbitrary DOM
  elements (e.g. staging a file)
- WHEN the action completes
- THEN a "fly" animation plays between the two elements' rects and cleans up
  after finishing

### Requirement: Choreography Does Not Block Logic

Animation failures or a stubbed `Element.animate` (e.g. in automated test
environments) MUST NOT throw or block state updates.

#### Scenario: Animate unavailable
- GIVEN `Element.prototype.animate` is stubbed/unavailable
- WHEN a state transition requiring choreography occurs
- THEN the state update still completes without an unhandled exception
