import { describe, it, expect } from 'vitest';
import { mkR } from '../recorder';
import { vacio, nuevoCommit, laneFor, setHead, ensureColor } from '../state';
import { diffEventos } from '../events';
import type { RepoState } from '../types';

function snapshot(s: RepoState): RepoState {
  return JSON.parse(JSON.stringify(s));
}

describe('events (diffEventos, ported from git-engine.js)', () => {
  it('emits file-created / file-modified / file-deleted for working-tree changes', () => {
    const p = vacio();
    p.files = { a: '1', b: '1' };
    const s = vacio();
    s.files = { a: '2', c: '1' }; // a modified, b deleted, c created
    const r = mkR();
    diffEventos(p, s, r);
    expect(r.eventos).toEqual(
      expect.arrayContaining([
        { type: 'file-modified', file: 'a' },
        { type: 'file-deleted', file: 'b' },
        { type: 'file-created', file: 'c' },
      ]),
    );
  });

  it('emits file-staged when the index gains a value that differs from HEAD', () => {
    const p = vacio();
    p.inited = true;
    const lane = laneFor(p, 'main');
    const c = nuevoCommit(p, { msg: 'root', parents: [], tree: { a: 'head' }, lane, t: 1 });
    setHead(p, c.hash, 'commit (initial): root');
    p.index = {};
    const s = snapshot(p);
    s.index = { b: 'new-staged-content' }; // 'b' is not in HEAD's tree at all
    const r = mkR();
    diffEventos(p, s, r);
    expect(r.eventos).toContainEqual({ type: 'file-staged', file: 'b' });
  });

  it('emits file-unstaged when the index is reset back to match HEAD', () => {
    const p = vacio();
    p.inited = true;
    const lane = laneFor(p, 'main');
    const c = nuevoCommit(p, { msg: 'root', parents: [], tree: { a: 'head' }, lane, t: 1 });
    setHead(p, c.hash, 'commit (initial): root');
    p.index = { a: 'staged-edit' };
    const s = snapshot(p);
    s.index = { a: 'head' }; // restored to match HEAD
    const r = mkR();
    diffEventos(p, s, r);
    expect(r.eventos).toContainEqual({ type: 'file-unstaged', file: 'a' });
  });

  it('emits head-moved (and head-detached) when HEAD changes', () => {
    const p = vacio();
    p.inited = true;
    const lane = laneFor(p, 'main');
    const c = nuevoCommit(p, { msg: 'root', parents: [], tree: {}, lane, t: 1 });
    setHead(p, c.hash, 'commit (initial): root');
    const s = snapshot(p);
    s.head = { type: 'detached', hash: c.hash };
    const r = mkR();
    diffEventos(p, s, r);
    expect(r.eventos).toContainEqual({ type: 'head-moved', from: c.hash, to: c.hash });
    expect(r.eventos).toContainEqual({ type: 'head-detached', to: c.hash });
  });

  it('emits ref-moved for branch/tag/tracking changes', () => {
    const p = vacio();
    ensureColor(p, 'main');
    p.branches.main = 'h1';
    const s = snapshot(p);
    s.branches.main = 'h2';
    s.tags.v1 = 'h2';
    const r = mkR();
    diffEventos(p, s, r);
    expect(r.eventos).toContainEqual({ type: 'ref-moved', kind: 'branch', ref: 'main', from: 'h1', to: 'h2' });
    expect(r.eventos).toContainEqual({ type: 'ref-moved', kind: 'tag', ref: 'v1', from: null, to: 'h2' });
  });

  it('emits commits-orphaned when a reachable local commit becomes unreachable', () => {
    const p = vacio();
    p.inited = true;
    const lane = laneFor(p, 'main');
    const c1 = nuevoCommit(p, { msg: 'root', parents: [], tree: {}, lane, t: 1 });
    const c2 = nuevoCommit(p, { msg: 'second', parents: [c1.hash], tree: {}, lane, t: 2 });
    setHead(p, c2.hash, 'commit: second');
    const s = snapshot(p);
    s.branches.main = c1.hash; // reset --hard HEAD~1 style move
    const r = mkR();
    diffEventos(p, s, r);
    expect(r.eventos).toContainEqual({ type: 'commits-orphaned', hashes: [c2.hash] });
  });

  it('emits commits-restored when an orphaned local commit becomes reachable again', () => {
    const p = vacio();
    p.inited = true;
    const lane = laneFor(p, 'main');
    const c1 = nuevoCommit(p, { msg: 'root', parents: [], tree: {}, lane, t: 1 });
    const c2 = nuevoCommit(p, { msg: 'second', parents: [c1.hash], tree: {}, lane, t: 2 });
    setHead(p, c1.hash, 'reset'); // c2 orphaned in p, but still in p.commits as local
    const s = snapshot(p);
    s.branches.main = c2.hash; // restored
    const r = mkR();
    diffEventos(p, s, r);
    expect(r.eventos).toContainEqual({ type: 'commits-restored', hashes: [c2.hash] });
  });
});
