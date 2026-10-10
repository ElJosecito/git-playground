// Module-level layout memoization (design D7): "Recompute per render, or
// cache per repo" -> "Module-level WeakMap<RepoState, Layout>. The engine
// deep-clones on every change, so repo objects are effectively immutable."
// `GraphLayer` calls `layoutOf(repo)` on every render instead of `layout(repo)`
// directly, so repeated renders with the same repo object (e.g. from an
// unrelated parent re-render) skip recomputing the full SVG geometry.
import { layout } from '../engine/layout';
import type { Layout, RepoState } from '../engine/types';

const cache = new WeakMap<RepoState, Layout>();

/** Cached `layout(repo)`, memoized per repo object identity. */
export function layoutOf(repo: RepoState): Layout {
  let cached = cache.get(repo);
  if (!cached) {
    cached = layout(repo);
    cache.set(repo, cached);
  }
  return cached;
}
