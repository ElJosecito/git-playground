import { describe, it, expect } from 'vitest';
import { layoutOf } from '../layoutCache';
import { layout } from '../../engine/layout';
import { vacio } from '../../engine/state';
import { GitEngine } from '../../engine';

// Ported from design D7: "Module-level WeakMap<RepoState, Layout>. The
// engine deep-clones on every change, so repo objects are effectively
// immutable" — so `layoutOf` must memoize per repo object identity instead
// of recomputing `layout()` on every render.
describe('layoutOf', () => {
  it('returns the same Layout reference for the same repo object (D7 cache hit)', () => {
    const repo = GitEngine.ejemplo();
    const a = layoutOf(repo);
    const b = layoutOf(repo);
    expect(a).toBe(b);
  });

  it('computes a fresh (but structurally equal) Layout for a different repo object', () => {
    const repoA = vacio();
    const repoB = vacio();
    const a = layoutOf(repoA);
    const b = layoutOf(repoB);
    expect(a).not.toBe(b);
    expect(a).toEqual(layout(repoB));
  });

  it('matches the engine facade layout() output exactly for a populated repo', () => {
    const repo = GitEngine.ejemplo();
    expect(layoutOf(repo)).toEqual(layout(repo));
  });
});
