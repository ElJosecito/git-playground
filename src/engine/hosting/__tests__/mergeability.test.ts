import { describe, it, expect } from 'vitest';
import { vacio, laneFor, nuevoCommit } from '../../state';
import { computeMergeability } from '../mergeability';
import type { RepoState } from '../../types';

/** Minimal repo builder: `main` is the root branch; `files` seeds the root commit's tree. */
function rootRepo(files: Record<string, string>): RepoState {
  const s = vacio();
  s.inited = true;
  const lane = laneFor(s, 'main');
  const c = nuevoCommit(s, { msg: 'root', parents: [], tree: files, lane, t: 0 });
  s.branches.main = c.hash;
  s.remote.branches.main = c.hash;
  s.remote.known[c.hash] = 1;
  return s;
}

/** Appends one commit with the given tree onto `branch`'s current tip, pushing it to origin too. */
function commitTo(s: RepoState, branch: string, tree: Record<string, string>): string {
  const parent = s.remote.branches[branch] ?? s.branches[branch];
  const lane = laneFor(s, branch);
  const c = nuevoCommit(s, { msg: `${branch} commit`, parents: parent ? [parent] : [], tree, lane, t: 0 });
  s.branches[branch] = c.hash;
  s.remote.branches[branch] = c.hash;
  s.remote.known[c.hash] = 1;
  return c.hash;
}

describe('computeMergeability (new behavior, no oracle equivalent)', () => {
  it('reports clean + canRebase:true for a non-overlapping divergence (mergeable PR)', () => {
    const s = rootRepo({ 'f.txt': 'A' });
    s.remote.branches.feature = s.remote.branches.main!;
    commitTo(s, 'feature', { 'f.txt': 'A2' });
    const m = computeMergeability(s, 'feature', 'main');
    expect(m).toMatchObject({ state: 'clean', conflicts: [], ahead: 1, behind: 0, outdated: false, canRebase: true });
  });

  it('reports conflicts (mirrors merge conflict shape) when both sides edit the same line incompatibly', () => {
    const s = rootRepo({ 'f.txt': 'A' });
    s.remote.branches.feature = s.remote.branches.main!;
    commitTo(s, 'main', { 'f.txt': 'B' });
    commitTo(s, 'feature', { 'f.txt': 'C' });
    const m = computeMergeability(s, 'feature', 'main');
    expect(m.state).toBe('conflicts');
    expect(m.conflicts).toEqual(['f.txt']);
    expect(m.canRebase).toBe(false);
  });

  it('reports missing-branch when the source no longer exists on origin', () => {
    const s = rootRepo({ 'f.txt': 'A' });
    const m = computeMergeability(s, 'ghost', 'main');
    expect(m.state).toBe('missing-branch');
    expect(m.canRebase).toBe(false);
  });

  it('reports missing-branch when the target no longer exists on origin', () => {
    const s = rootRepo({ 'f.txt': 'A' });
    s.remote.branches.feature = s.remote.branches.main!;
    const m = computeMergeability(s, 'feature', 'ghost');
    expect(m.state).toBe('missing-branch');
  });

  it('warns outdated:true without blocking (clean, canRebase:true) when target advanced on a non-overlapping file', () => {
    const s = rootRepo({ 'f.txt': 'A', 'g.txt': '1' });
    s.remote.branches.feature = s.remote.branches.main!;
    commitTo(s, 'main', { 'f.txt': 'A', 'g.txt': '2' });
    commitTo(s, 'feature', { 'f.txt': 'A2', 'g.txt': '1' });
    const m = computeMergeability(s, 'feature', 'main');
    expect(m).toMatchObject({ state: 'clean', outdated: true, canRebase: true, ahead: 1, behind: 1 });
  });

  it('sets canRebase:false even when the base 3-way merge is clean (rebase-only conflict)', () => {
    // base "A" -> target changes it to "B"; source's FIRST commit independently
    // changes the same base value to "A2" (conflicts when replayed onto "B"),
    // then a SECOND source commit reverts it back to "A" — so the squashed
    // source-head tree equals base again and the overall 3-way merge picks
    // the target's "B" cleanly (the "theirs===base" shortcut), even though
    // step-by-step replay would hit a real conflict at the first commit.
    const s = rootRepo({ 'f.txt': 'A' });
    s.remote.branches.feature = s.remote.branches.main!;
    commitTo(s, 'main', { 'f.txt': 'B' });
    commitTo(s, 'feature', { 'f.txt': 'A2' });
    commitTo(s, 'feature', { 'f.txt': 'A' });
    const m = computeMergeability(s, 'feature', 'main');
    expect(m.state).toBe('clean');
    expect(m.conflicts).toEqual([]);
    expect(m.canRebase).toBe(false);
  });
});
