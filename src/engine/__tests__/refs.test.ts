import { describe, it, expect } from 'vitest';
import { vacio } from '../state';
import { treeOf, anc, isAnc, mergeBase, aheadBehind, curName, resolve, resolveOr } from '../refs';
import { GitError } from '../errors';
import type { Commit, RepoState } from '../types';

/** Minimal commit fixture builder for pure-graph-function tests (no command layer yet). */
function mkCommit(hash: string, parents: string[], n: number, tree: Record<string, string> = {}): Commit {
  return { hash, n, msg: `commit ${hash}`, parents, tree, author: 'Tú <tu@ejemplo.com>', t: n, lane: 0, x: n, local: true };
}

// Graph: c1111111 -> c2222222 -> c4444444 (main)
//                \-> c3333333 -> c4444444 (merge: parents [c2222222, c3333333])
function diamondState(): RepoState {
  const s = vacio();
  const c1 = mkCommit('c1111111', [], 1, { f: 'a' });
  const c2 = mkCommit('c2222222', ['c1111111'], 2, { f: 'b' });
  const c3 = mkCommit('c3333333', ['c1111111'], 3, { f: 'c' });
  const c4 = mkCommit('c4444444', ['c2222222', 'c3333333'], 4, { f: 'd' });
  s.commits = { [c1.hash]: c1, [c2.hash]: c2, [c3.hash]: c3, [c4.hash]: c4 };
  s.order = [c1.hash, c2.hash, c3.hash, c4.hash];
  s.branches = { main: c4.hash, main2: c3.hash };
  s.inited = true;
  return s;
}

describe('refs (ancestry + ref resolution, ported from git-engine.js)', () => {
  it('treeOf returns the commit tree, or {} for a null/unknown hash', () => {
    const s = diamondState();
    expect(treeOf(s, 'c2222222')).toEqual({ f: 'b' });
    expect(treeOf(s, null)).toEqual({});
    expect(treeOf(s, 'nope')).toEqual({});
  });

  it('anc collects every reachable ancestor hash (inclusive) across merge parents', () => {
    const s = diamondState();
    expect(Object.keys(anc(s, 'c4444444')).sort()).toEqual(['c1111111', 'c2222222', 'c3333333', 'c4444444']);
    expect(Object.keys(anc(s, 'c2222222')).sort()).toEqual(['c1111111', 'c2222222']);
  });

  it('isAnc checks ancestry inclusively', () => {
    const s = diamondState();
    expect(isAnc(s, 'c1111111', 'c4444444')).toBe(true);
    expect(isAnc(s, 'c4444444', 'c1111111')).toBe(false);
    expect(isAnc(s, 'c4444444', 'c4444444')).toBe(true);
  });

  it('mergeBase picks the common ancestor with the highest commit number', () => {
    const s = diamondState();
    expect(mergeBase(s, 'c2222222', 'c3333333')).toBe('c1111111');
    expect(mergeBase(s, 'c4444444', 'c2222222')).toBe('c2222222');
  });

  it('aheadBehind counts commits unique to each side', () => {
    const s = diamondState();
    const [ahead, behind] = aheadBehind(s, 'c2222222', 'c3333333');
    expect(ahead).toBe(1); // c2 not in anc(c3)
    expect(behind).toBe(1); // c3 not in anc(c2)
    expect(aheadBehind(s, 'c2222222', 'c2222222')).toEqual([0, 0]);
  });

  it('curName reads the branch name, or null when detached', () => {
    const s = diamondState();
    expect(curName(s)).toBe('main');
    s.head = { type: 'detached', hash: 'c4444444' };
    expect(curName(s)).toBeNull();
  });

  describe('resolve', () => {
    it('resolves HEAD and @ to the current branch tip', () => {
      const s = diamondState();
      expect(resolve(s, 'HEAD')).toBe('c4444444');
      expect(resolve(s, '@')).toBe('c4444444');
    });

    it('resolves a branch name and a tag', () => {
      const s = diamondState();
      s.tags.v1 = 'c2222222';
      expect(resolve(s, 'main2')).toBe('c3333333');
      expect(resolve(s, 'v1')).toBe('c2222222');
    });

    it('resolves origin/<branch> via tracking refs', () => {
      const s = diamondState();
      s.tracking.main = 'c2222222';
      expect(resolve(s, 'origin/main')).toBe('c2222222');
      expect(resolve(s, 'remotes/origin/main')).toBe('c2222222');
    });

    it('resolves a unique short hash prefix among local commits', () => {
      const s = diamondState();
      expect(resolve(s, 'c1111111')).toBe('c1111111');
    });

    it('returns null for a ref that does not exist', () => {
      const s = diamondState();
      expect(resolve(s, 'nope')).toBeNull();
      expect(resolve(s, '')).toBeNull();
    });

    it('walks ~N (first-parent chain) and ^N (nth parent) suffixes', () => {
      const s = diamondState();
      expect(resolve(s, 'HEAD~1')).toBe('c2222222'); // c4's first parent
      expect(resolve(s, 'HEAD~2')).toBe('c1111111');
      expect(resolve(s, 'HEAD^2')).toBe('c3333333'); // c4's second parent
      expect(resolve(s, 'HEAD~')).toBe('c2222222'); // bare ~ means ~1
      expect(resolve(s, 'HEAD^')).toBe('c2222222'); // bare ^ means ^1
    });

    it('returns null when a suffix walk runs past the root', () => {
      const s = diamondState();
      expect(resolve(s, 'HEAD~10')).toBeNull();
    });
  });

  describe('resolveOr', () => {
    it('returns the resolved hash when it exists', () => {
      const s = diamondState();
      expect(resolveOr(s, 'main')).toBe('c4444444');
    });

    it('throws a GitError with a "¿Quisiste decir...?" suggestion for a near-miss ref', () => {
      const s = diamondState();
      try {
        resolveOr(s, 'man');
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(GitError);
        expect((e as GitError).lines.join('\n')).toContain('main');
      }
    });

    it('throws "no existe" (not ambiguous) when the base ref resolves but the suffix overruns history', () => {
      const s = diamondState();
      try {
        resolveOr(s, 'main~10');
        expect.unreachable();
      } catch (e) {
        expect((e as GitError).lines[0]).toContain('no existe');
      }
    });
  });
});
