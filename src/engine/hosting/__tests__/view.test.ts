import { describe, it, expect } from 'vitest';
import { ejemplo } from '../../run';
import { vacio, laneFor, nuevoCommit } from '../../state';
import { createPr } from '../create';
import { listPullRequests, prView } from '../view';
import type { RepoState } from '../../types';

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

function commitTo(s: RepoState, branch: string, tree: Record<string, string>): string {
  const parent = s.remote.branches[branch] ?? s.branches[branch];
  const lane = laneFor(s, branch);
  const c = nuevoCommit(s, { msg: `${branch} commit`, parents: parent ? [parent] : [], tree, lane, t: 0 });
  s.branches[branch] = c.hash;
  s.remote.branches[branch] = c.hash;
  s.remote.known[c.hash] = 1;
  return c.hash;
}

describe('listPullRequests (new behavior, no oracle equivalent)', () => {
  it('returns an empty list when the repo has no hosting state', () => {
    const s = ejemplo();
    expect(listPullRequests(s)).toEqual([]);
  });

  it('returns every PR created on the repo, in creation order', () => {
    const s = ejemplo();
    s.branches.feature = s.branches.main!;
    s.remote.branches.feature = s.remote.branches.main!;
    const parent = s.branches.main!;
    const tree = { ...s.commits[parent]!.tree, 'feature.txt': 'contenido' };
    const c = { hash: 'h-feature-1', n: s.order.length + 1, msg: 'add feature.txt', parents: [parent], tree, author: 'Tú <tu@ejemplo.com>', t: 0, lane: 0, x: s.order.length, local: true };
    s.commits[c.hash] = c;
    s.order.push(c.hash);
    s.branches.feature = c.hash;
    s.remote.branches.feature = c.hash;
    s.remote.known[c.hash] = 1;
    createPr(s, { source: 'feature', target: 'main', title: 'Mi PR', body: '' });
    const prs = listPullRequests(s);
    expect(prs).toHaveLength(1);
    expect(prs[0]!.title).toBe('Mi PR');
  });
});

describe('prView (new behavior, no oracle equivalent)', () => {
  it('returns null for an unknown PR id', () => {
    const s = rootRepo({ 'f.txt': 'A' });
    expect(prView(s, 999)).toBeNull();
  });

  it('derives commits/files/diff from the live remote branches and includes mergeability for an open PR', () => {
    const s = rootRepo({ 'f.txt': 'A' });
    s.remote.branches.feature = s.remote.branches.main!;
    const sourceHash = commitTo(s, 'feature', { 'f.txt': 'A2' });
    createPr(s, { source: 'feature', target: 'main', title: 'Mi PR', body: '' });

    const view = prView(s, 1)!;
    expect(view.pr.title).toBe('Mi PR');
    expect(view.commits.map((c) => c.hash)).toEqual([sourceHash]);
    expect(view.files).toEqual([{ f: 'f.txt', t: '~' }]);
    expect(view.diff.join('\n')).toContain('f.txt');
    expect(view.mergeability).toMatchObject({ state: 'clean', canRebase: true });
  });

  it('updates commits/diff live after a new push, without the view selector mutating the PR record', () => {
    const s = rootRepo({ 'f.txt': 'A' });
    s.remote.branches.feature = s.remote.branches.main!;
    commitTo(s, 'feature', { 'f.txt': 'A2' });
    createPr(s, { source: 'feature', target: 'main', title: 'Mi PR', body: '' });

    const before = prView(s, 1)!;
    expect(before.commits).toHaveLength(1);

    const h2 = commitTo(s, 'feature', { 'f.txt': 'A3' });
    const after = prView(s, 1)!;
    expect(after.commits.map((c) => c.hash)).toContain(h2);
    expect(after.commits).toHaveLength(2);
  });

  it('returns a null mergeability for a merged/closed PR instead of recomputing it', () => {
    const s = rootRepo({ 'f.txt': 'A' });
    s.remote.branches.feature = s.remote.branches.main!;
    commitTo(s, 'feature', { 'f.txt': 'A2' });
    createPr(s, { source: 'feature', target: 'main', title: 'Mi PR', body: '' });
    s.hosting!.prs[0]!.status = 'closed';
    s.hosting!.prs[0]!.closeReason = 'manual';
    expect(prView(s, 1)!.mergeability).toBeNull();
  });
});
