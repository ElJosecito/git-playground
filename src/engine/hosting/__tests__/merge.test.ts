import { describe, it, expect } from 'vitest';
import { vacio, laneFor, nuevoCommit } from '../../state';
import { createPr } from '../create';
import { mergePullRequest } from '../merge';
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

function seedOpenPr(): { s: RepoState; sourceHash: string; targetHash: string } {
  const s = rootRepo({ 'f.txt': 'A' });
  const targetHash = s.remote.branches.main!;
  s.remote.branches.feature = targetHash;
  const sourceHash = commitTo(s, 'feature', { 'f.txt': 'A2' });
  createPr(s, { source: 'feature', target: 'main', title: 'Mi PR', body: '' });
  return { s, sourceHash, targetHash };
}

describe('mergePullRequest (new behavior, no oracle equivalent)', () => {
  it('merge strategy: creates a 2-parent commit [target,source], advances target only, writes local:false and remote.known', () => {
    const { s, sourceHash, targetHash } = seedOpenPr();
    const res = mergePullRequest(s, 1, 'merge', false);
    expect(res.error).toBe(false);
    const head = res.estado.remote.branches.main!;
    expect(head).not.toBe(targetHash);
    const c = res.estado.commits[head]!;
    expect(c.parents).toEqual([targetHash, sourceHash]);
    expect(c.local).toBe(false);
    expect(res.estado.remote.known[head]).toBe(1);
    expect(res.estado.branches.main).toBe(targetHash); // local repo untouched: still at the pre-merge tip
    expect(res.estado.hosting!.prs[0]!.status).toBe('merged');
    expect(res.estado.hosting!.prs[0]!.mergedHash).toBe(head);
  });

  it('merge strategy always creates a merge commit even when a fast-forward would be possible', () => {
    const { s, targetHash } = seedOpenPr();
    const res = mergePullRequest(s, 1, 'merge', false);
    const head = res.estado.remote.branches.main!;
    expect(res.estado.commits[head]!.parents).toHaveLength(2);
    expect(head).not.toBe(targetHash);
  });

  it('squash strategy: creates a single-parent commit [target] with the same resulting tree as merge', () => {
    const { s, targetHash } = seedOpenPr();
    const res = mergePullRequest(s, 1, 'squash', false);
    const head = res.estado.remote.branches.main!;
    const c = res.estado.commits[head]!;
    expect(c.parents).toEqual([targetHash]);
    expect(c.tree).toEqual({ 'f.txt': 'A2' });
    expect(c.msg).toBe('Mi PR (#1)');
  });

  it('rebase strategy: replays source-only commits in order, preserving original messages/authors via copyOf', () => {
    const { s, sourceHash, targetHash } = seedOpenPr();
    const res = mergePullRequest(s, 1, 'rebase', false);
    const head = res.estado.remote.branches.main!;
    const c = res.estado.commits[head]!;
    expect(c.parents).toEqual([targetHash]);
    expect(c.copyOf).toBe(sourceHash);
    expect(c.local).toBe(false);
  });

  it('produces identical hashes across two independent runs from the same input (determinism)', () => {
    const run1 = seedOpenPr();
    const run2 = seedOpenPr();
    const res1 = mergePullRequest(run1.s, 1, 'merge', false);
    const res2 = mergePullRequest(run2.s, 1, 'merge', false);
    expect(res1.estado.remote.branches.main).toBe(res2.estado.remote.branches.main);
  });

  it('deletes the source branch on origin when deleteBranch is requested, leaving the target unaffected', () => {
    const { s } = seedOpenPr();
    const res = mergePullRequest(s, 1, 'merge', true);
    expect(res.estado.remote.branches.feature).toBeUndefined();
    expect(res.estado.remote.branches.main).toBeDefined();
  });

  it('rejects merging when the base mergeability reports conflicts', () => {
    const s = rootRepo({ 'f.txt': 'A' });
    s.remote.branches.feature = s.remote.branches.main!;
    commitTo(s, 'main', { 'f.txt': 'B' });
    commitTo(s, 'feature', { 'f.txt': 'C' });
    createPr(s, { source: 'feature', target: 'main', title: 'Mi PR', body: '' });
    const res = mergePullRequest(s, 1, 'merge', false);
    expect(res.error).toBe(true);
    expect(res.estado.hosting!.prs[0]!.status).toBe('open');
  });
});
