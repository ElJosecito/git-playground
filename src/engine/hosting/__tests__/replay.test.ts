import { describe, it, expect } from 'vitest';
import { vacio, laneFor, nuevoCommit } from '../../state';
import { replayOnto, sourceOnlyCommits } from '../replay';
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

function commitTo(s: RepoState, branch: string, tree: Record<string, string>, msg = `${branch} commit`): string {
  const parent = s.remote.branches[branch] ?? s.branches[branch];
  const lane = laneFor(s, branch);
  const c = nuevoCommit(s, { msg, parents: parent ? [parent] : [], tree, lane, t: 0, author: 'Tú <tu@ejemplo.com>' });
  s.branches[branch] = c.hash;
  s.remote.branches[branch] = c.hash;
  s.remote.known[c.hash] = 1;
  return c.hash;
}

describe('sourceOnlyCommits (new behavior, no oracle equivalent)', () => {
  it('returns only non-merge commits reachable from source but not target, oldest first', () => {
    const s = rootRepo({ 'f.txt': 'A' });
    s.remote.branches.feature = s.remote.branches.main!;
    const h1 = commitTo(s, 'feature', { 'f.txt': 'A2' });
    const h2 = commitTo(s, 'feature', { 'f.txt': 'A3' });
    const todo = sourceOnlyCommits(s, s.remote.branches.feature!, s.remote.branches.main!);
    expect(todo).toEqual([h1, h2]);
  });

  it('excludes commits already reachable from target', () => {
    const s = rootRepo({ 'f.txt': 'A' });
    s.remote.branches.feature = s.remote.branches.main!;
    commitTo(s, 'feature', { 'f.txt': 'A2' });
    expect(sourceOnlyCommits(s, s.remote.branches.feature!, s.remote.branches.feature!)).toEqual([]);
  });
});

describe('replayOnto (dry run, new behavior, no oracle equivalent)', () => {
  it('replays a clean, non-conflicting commit onto a new base without mutating any state', () => {
    const s = rootRepo({ 'f.txt': 'A', 'g.txt': '1' });
    s.remote.branches.feature = s.remote.branches.main!;
    commitTo(s, 'main', { 'f.txt': 'A', 'g.txt': '2' });
    commitTo(s, 'feature', { 'f.txt': 'A2', 'g.txt': '1' });
    const before = JSON.stringify(s);
    const todo = sourceOnlyCommits(s, s.remote.branches.feature!, s.remote.branches.main!);
    const result = replayOnto(s, todo, s.remote.branches.main!);
    expect(result.ok).toBe(true);
    expect(result.commits).toHaveLength(1);
    expect(result.commits[0]!.tree).toEqual({ 'f.txt': 'A2', 'g.txt': '2' });
    expect(JSON.stringify(s)).toBe(before);
  });

  it('skips a commit whose replayed tree is unchanged from the current accumulated tree', () => {
    const s = rootRepo({ 'f.txt': 'A' });
    s.remote.branches.feature = s.remote.branches.main!;
    commitTo(s, 'feature', { 'f.txt': 'A' }); // no-op commit: same tree as parent
    const todo = sourceOnlyCommits(s, s.remote.branches.feature!, s.remote.branches.main!);
    const result = replayOnto(s, todo, s.remote.branches.main!);
    expect(result.ok).toBe(true);
    expect(result.commits).toEqual([]);
  });

  it('stops at the first conflicting commit and reports which one', () => {
    const s = rootRepo({ 'f.txt': 'A' });
    s.remote.branches.feature = s.remote.branches.main!;
    commitTo(s, 'main', { 'f.txt': 'B' });
    const conflictHash = commitTo(s, 'feature', { 'f.txt': 'A2' });
    const todo = sourceOnlyCommits(s, s.remote.branches.feature!, s.remote.branches.main!);
    const result = replayOnto(s, todo, s.remote.branches.main!);
    expect(result.ok).toBe(false);
    expect(result.conflictAt).toBe(conflictHash);
    expect(result.commits).toEqual([]);
  });

  it('preserves each commit message and author in the replayed result, in order', () => {
    const s = rootRepo({ 'f.txt': 'A' });
    s.remote.branches.feature = s.remote.branches.main!;
    commitTo(s, 'feature', { 'f.txt': 'A2' }, 'primer cambio');
    commitTo(s, 'feature', { 'f.txt': 'A3' }, 'segundo cambio');
    const todo = sourceOnlyCommits(s, s.remote.branches.feature!, s.remote.branches.main!);
    const result = replayOnto(s, todo, s.remote.branches.main!);
    expect(result.commits.map((c) => c.msg)).toEqual(['primer cambio', 'segundo cambio']);
    expect(result.commits.every((c) => c.author === 'Tú <tu@ejemplo.com>')).toBe(true);
  });
});
