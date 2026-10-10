import { describe, it, expect } from 'vitest';
import { vacio, nuevoCommit, laneFor, setHead, ensureColor } from '../state';
import { layout } from '../layout';
import { DX, DY, PALETA } from '../constants';

describe('layout (SVG geometry assembly, ported from git-engine.js)', () => {
  it('places a single root commit at (0,0) in its lane, with a pos entry', () => {
    const s = vacio();
    s.inited = true;
    const lane = laneFor(s, 'main');
    const c = nuevoCommit(s, { msg: 'root', parents: [], tree: {}, lane, t: 1 });
    setHead(s, c.hash, 'commit (initial): root');
    const L = layout(s);
    expect(L.pos[c.hash]).toEqual({ X: 0, Y: 0 });
    expect(L.nodes).toHaveLength(1);
    expect(L.nodes[0]).toMatchObject({ h: c.hash, X: 0, Y: 0, color: PALETA[0], merge: false, n: 1, msg: 'root' });
  });

  it('places a second same-lane commit one DX to the right', () => {
    const s = vacio();
    s.inited = true;
    const lane = laneFor(s, 'main');
    const c1 = nuevoCommit(s, { msg: 'root', parents: [], tree: {}, lane, t: 1 });
    const c2 = nuevoCommit(s, { msg: 'second', parents: [c1.hash], tree: {}, lane, t: 2 });
    setHead(s, c2.hash, 'commit: second');
    const L = layout(s);
    expect(L.pos[c2.hash]).toEqual({ X: DX, Y: 0 });
    expect(L.edges).toHaveLength(1);
    expect(L.edges[0]).toMatchObject({ child: c2.hash, color: PALETA[0] });
  });

  it('positions a second branch at lane*DY and labels the current branch + HEAD at the tip', () => {
    const s = vacio();
    s.inited = true;
    const lane0 = laneFor(s, 'main');
    const c1 = nuevoCommit(s, { msg: 'root', parents: [], tree: {}, lane: lane0, t: 1 });
    setHead(s, c1.hash, 'commit (initial): root');
    ensureColor(s, 'feature');
    const lane1 = laneFor(s, 'feature');
    const c2 = nuevoCommit(s, { msg: 'feature work', parents: [c1.hash], tree: {}, lane: lane1, t: 2 });
    s.branches.feature = c2.hash;
    s.head = { type: 'branch', name: 'feature' };
    const L = layout(s);
    expect(L.pos[c2.hash]).toEqual({ X: DX, Y: lane1 * DY });
    const headLabel = L.labels.find((l) => l.kind === 'head');
    expect(headLabel).toMatchObject({ h: c2.hash });
    const branchLabel = L.labels.find((l) => l.kind === 'branch' && l.text === 'feature');
    expect(branchLabel).toMatchObject({ current: true });
  });

  it('includes a tag label and a tracking (origin/*) label at the right commit', () => {
    const s = vacio();
    s.inited = true;
    const lane = laneFor(s, 'main');
    const c = nuevoCommit(s, { msg: 'root', parents: [], tree: {}, lane, t: 1 });
    setHead(s, c.hash, 'commit (initial): root');
    s.tags.v1 = c.hash;
    s.tracking.main = c.hash;
    const L = layout(s);
    expect(L.labels.some((l) => l.kind === 'tag' && l.text === 'v1')).toBe(true);
    expect(L.labels.some((l) => l.kind === 'track' && l.text === 'origin/main')).toBe(true);
  });

  it('draws two edges for a merge commit, one per parent', () => {
    const s = vacio();
    s.inited = true;
    const lane = laneFor(s, 'main');
    const c1 = nuevoCommit(s, { msg: 'root', parents: [], tree: {}, lane, t: 1 });
    const c2 = nuevoCommit(s, { msg: 'other', parents: [c1.hash], tree: {}, lane, t: 2 });
    const merge = nuevoCommit(s, { msg: 'merge', parents: [c1.hash, c2.hash], tree: {}, lane, t: 3 });
    setHead(s, merge.hash, 'merge');
    const L = layout(s);
    expect(L.nodes.find((n) => n.h === merge.hash)).toMatchObject({ merge: true });
    expect(L.edges.filter((e) => e.child === merge.hash)).toHaveLength(2);
  });

  it('builds a phantom node ahead of HEAD and the conflicting side while an op is in progress', () => {
    const s = vacio();
    s.inited = true;
    const lane = laneFor(s, 'main');
    const c1 = nuevoCommit(s, { msg: 'root', parents: [], tree: {}, lane, t: 1 });
    const c2 = nuevoCommit(s, { msg: 'other', parents: [c1.hash], tree: {}, lane, t: 2 });
    setHead(s, c1.hash, 'commit (initial): root');
    s.op = { kind: 'merge', other: c2.hash, otherName: 'feature', conflicts: ['a.txt'], data: {}, msg: 'm', origW: {}, origI: {} };
    const L = layout(s);
    expect(L.phantom).not.toBeNull();
    expect(L.phantom!.edges.length).toBeGreaterThan(0);
  });

  it('places remote-graph nodes above the local graph using RY/RDY', () => {
    const s = vacio();
    s.inited = true;
    const lane = laneFor(s, 'main');
    const c = nuevoCommit(s, { msg: 'root', parents: [], tree: {}, lane, t: 1 });
    setHead(s, c.hash, 'commit (initial): root');
    s.remote.branches.main = c.hash;
    s.remote.known[c.hash] = 1;
    const L = layout(s);
    expect(L.rnodes).toHaveLength(1);
    expect(L.rnodes[0]).toMatchObject({ h: c.hash });
    expect(L.rbox).not.toBeNull();
  });

  it('shows a stash marker when the stash is non-empty', () => {
    const s = vacio();
    s.inited = true;
    const lane = laneFor(s, 'main');
    const c = nuevoCommit(s, { msg: 'root', parents: [], tree: {}, lane, t: 1 });
    setHead(s, c.hash, 'commit (initial): root');
    s.stash.push({ msg: 'WIP', base: c.hash, w: {}, i: {} });
    const L = layout(s);
    expect(L.stash).toMatchObject({ n: 1 });
  });

  it('returns a non-null bbox enclosing every node when there is at least one commit', () => {
    const s = vacio();
    s.inited = true;
    const lane = laneFor(s, 'main');
    const c = nuevoCommit(s, { msg: 'root', parents: [], tree: {}, lane, t: 1 });
    setHead(s, c.hash, 'commit (initial): root');
    const L = layout(s);
    expect(L.bbox).not.toBeNull();
  });

  it('returns a null bbox for an empty repo with no commits/labels', () => {
    const L = layout(vacio());
    expect(L.bbox).toBeNull();
    expect(L.nodes).toEqual([]);
  });
});
