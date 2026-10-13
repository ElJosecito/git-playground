// Single place that owns the lazy-loading boundary for the sandbox and
// levels bundles, plus the cheatsheet and roadmap pages (app-routing spec "Route-Level Code Splitting": the
// sandbox/`PlaygroundShell` and levels/`LevelShell` bundles MUST be lazily
// loaded so visiting `#/` never pulls them into the initial chunk).
// `scripts/check-chunks.mjs` asserts the built entry excludes everything
// reachable only through these `import()` calls.
import { lazy } from 'react';

export const PlaygroundRouteLazy = lazy(() => import('../../routes/PlaygroundRoute'));
export const LevelMapRouteLazy = lazy(() => import('../../routes/LevelMapRoute'));
export const LevelRouteLazy = lazy(() => import('../../routes/LevelRoute'));
export const CheatsheetRouteLazy = lazy(() => import('../../routes/CheatsheetRoute'));
export const RoadmapRouteLazy = lazy(() => import('../../routes/RoadmapRoute'));

/** Preload hooks for CTA hover/focus (design.md: "Route loaders live in
 * routes.ts and are preloaded on CTA hover/focus."), so the chunk is
 * already in flight by the time the user actually clicks through. */
export function preloadPlayground() {
  return import('../../routes/PlaygroundRoute');
}
export function preloadLevelMap() {
  return import('../../routes/LevelMapRoute');
}
export function preloadLevel() {
  return import('../../routes/LevelRoute');
}
export function preloadCheatsheet() {
  return import('../../routes/CheatsheetRoute');
}
export function preloadRoadmap() {
  return import('../../routes/RoadmapRoute');
}
