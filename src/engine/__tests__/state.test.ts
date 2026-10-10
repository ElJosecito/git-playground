import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { vacio, ensureColor, colorRama, laneFor, nuevoCommit, headHash, setHead } from '../state';
import { PALETA, NEUTRO, AUTOR } from '../constants';

describe('state primitives (ported from git-engine.js)', () => {
  it('vacio() returns the oracle default shape', () => {
    const s = vacio();
    expect(s).toEqual({
      v: 1,
      inited: false,
      files: {},
      index: {},
      commits: {},
      order: [],
      branches: {},
      colorOf: {},
      nColors: 0,
      laneOf: {},
      lanes: [],
      detLane: null,
      tags: {},
      head: { type: 'branch', name: 'main' },
      prev: null,
      stash: [],
      reflog: [],
      remote: { branches: {}, known: {} },
      tracking: {},
      upstream: {},
      op: null,
      seq: 0,
      tm: 0,
    });
  });

  describe('ensureColor / colorRama', () => {
    it('assigns colors in first-seen insertion order and is idempotent', () => {
      const s = vacio();
      ensureColor(s, 'main');
      ensureColor(s, 'feature');
      ensureColor(s, 'main'); // re-seeing 'main' must not bump nColors
      expect(s.colorOf).toEqual({ main: 0, feature: 1 });
      expect(s.nColors).toBe(2);
    });

    it('wraps around PALETA when more branches exist than colors', () => {
      const s = vacio();
      for (let i = 0; i < PALETA.length + 2; i++) ensureColor(s, `b${i}`);
      expect(colorRama(s, `b${PALETA.length}`)).toBe(PALETA[0]);
      expect(colorRama(s, `b${PALETA.length + 1}`)).toBe(PALETA[1]);
    });

    it('returns NEUTRO for a name with no assigned color', () => {
      const s = vacio();
      expect(colorRama(s, 'unknown')).toBe(NEUTRO);
    });

    it('returns the correct PALETA entry for a known branch', () => {
      const s = vacio();
      ensureColor(s, 'main');
      expect(colorRama(s, 'main')).toBe(PALETA[0]);
    });
  });

  describe('laneFor', () => {
    it('assigns lanes to branches in first-seen order with matching color', () => {
      const s = vacio();
      const laneMain = laneFor(s, 'main');
      const laneFeature = laneFor(s, 'feature');
      expect(laneMain).toBe(0);
      expect(laneFeature).toBe(1);
      expect(s.lanes).toEqual([
        { name: 'main', color: PALETA[0] },
        { name: 'feature', color: PALETA[1] },
      ]);
    });

    it('is idempotent for the same branch name', () => {
      const s = vacio();
      const first = laneFor(s, 'main');
      const second = laneFor(s, 'main');
      expect(first).toBe(second);
      expect(s.lanes).toHaveLength(1);
    });

    it('assigns a single shared detached lane for null, created lazily once', () => {
      const s = vacio();
      laneFor(s, 'main');
      const det1 = laneFor(s, null);
      const det2 = laneFor(s, null);
      expect(det1).toBe(det2);
      expect(s.lanes[det1]).toEqual({ name: '', color: NEUTRO });
    });
  });

  describe('headHash', () => {
    it('reads the branch tip when HEAD is a branch', () => {
      const s = vacio();
      s.branches.main = 'abc123';
      expect(headHash(s)).toBe('abc123');
    });

    it('returns null for a branch with no commits yet', () => {
      const s = vacio();
      expect(headHash(s)).toBeNull();
    });

    it('reads the detached hash when HEAD is detached', () => {
      const s = vacio();
      s.head = { type: 'detached', hash: 'deadbeef' };
      expect(headHash(s)).toBe('deadbeef');
    });
  });

  describe('setHead', () => {
    it('updates the current branch tip and pushes a reflog entry', () => {
      const s = vacio();
      setHead(s, 'h1', 'commit (initial): hola');
      expect(s.branches.main).toBe('h1');
      expect(s.reflog[0]).toEqual({ h: 'h1', msg: 'commit (initial): hola' });
    });

    it('updates head.hash directly when detached', () => {
      const s = vacio();
      s.head = { type: 'detached', hash: 'h0' };
      setHead(s, 'h1', 'checkout: moving to h1');
      expect(s.head).toEqual({ type: 'detached', hash: 'h1' });
    });

    it('records the reflog entry using the NEW head hash (oracle order: branch tip is reassigned before reflogPush reads headHash)', () => {
      const s = vacio();
      s.branches.main = 'h0';
      setHead(s, 'h1', 'commit: segundo');
      expect(s.reflog[0]).toEqual({ h: 'h1', msg: 'commit: segundo' });
      expect(s.branches.main).toBe('h1');
    });

    it('caps the reflog at 200 entries, dropping the oldest', () => {
      const s = vacio();
      for (let i = 0; i < 205; i++) setHead(s, `h${i}`, `msg${i}`);
      expect(s.reflog).toHaveLength(200);
      expect(s.reflog[0]!.msg).toBe('msg204');
    });
  });

  describe('nuevoCommit', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(Date.UTC(2026, 9, 6, 9, 12));
    });
    afterEach(() => vi.useRealTimers());

    it('matches the oracle hash for a root commit (ejemplo() vector)', () => {
      const s = vacio();
      const lane = laneFor(s, 'main');
      const c = nuevoCommit(s, { msg: 'Primer commit', parents: [], tree: { 'README.md': '# Mi proyecto' }, lane, t: Date.UTC(2026, 9, 6, 9, 12) });
      expect(c.hash).toBe('f11da2e1adbb6de63246cb16584c5ae700ef7510');
      expect(c.n).toBe(1);
      expect(c.x).toBe(0);
      expect(c.author).toBe(AUTOR);
      expect(c.local).toBe(true);
      expect(s.order).toEqual([c.hash]);
      expect(s.seq).toBe(1);
    });

    it('matches the oracle hash for a second commit with a parent', () => {
      const s = vacio();
      const lane = laneFor(s, 'main');
      const c1 = nuevoCommit(s, { msg: 'Primer commit', parents: [], tree: { 'README.md': '# Mi proyecto' }, lane, t: Date.UTC(2026, 9, 6, 9, 12) });
      const c2 = nuevoCommit(s, {
        msg: 'Añade descripción al README',
        parents: [c1.hash],
        tree: { 'README.md': '# Mi proyecto\n\nUn lugar para practicar Git sin miedo.' },
        lane,
        t: Date.UTC(2026, 9, 6, 10, 12),
      });
      expect(c2.hash).toBe('135e841974d1b7c8858d4b8eb16575c58c709940');
      expect(c2.n).toBe(2);
      expect(c2.x).toBe(1);
    });

    it('deep-clones the tree so later mutation of the source object does not affect the commit', () => {
      const s = vacio();
      const lane = laneFor(s, 'main');
      const tree = { 'a.txt': 'hi' };
      const c = nuevoCommit(s, { msg: 'm', parents: [], tree, lane, t: 1 });
      tree['a.txt'] = 'changed';
      expect(c.tree).toEqual({ 'a.txt': 'hi' });
    });

    it('advances x past occupied slots within the same lane to avoid overlap', () => {
      const s = vacio();
      const lane = laneFor(s, 'main');
      const c1 = nuevoCommit(s, { msg: 'm1', parents: [], tree: {}, lane, t: 1 });
      expect(c1.x).toBe(0);
      // A manually-inserted commit occupies x=1 in the same lane (e.g. a copy).
      s.commits['fake'] = { ...c1, hash: 'fake', x: 1, msg: 'manual' };
      const c2 = nuevoCommit(s, { msg: 'm2', parents: [c1.hash], tree: {}, lane, t: 2 });
      expect(c2.x).toBe(2);
    });

    it('defaults author to AUTOR and t to Date.now() when not provided', () => {
      const s = vacio();
      const lane = laneFor(s, 'main');
      const c = nuevoCommit(s, { msg: 'm', parents: [], tree: {}, lane });
      expect(c.author).toBe(AUTOR);
      expect(c.t).toBe(Date.UTC(2026, 9, 6, 9, 12));
    });

    it('merges extra fields (e.g. cherryOf) onto the commit', () => {
      const s = vacio();
      const lane = laneFor(s, 'main');
      const c = nuevoCommit(s, { msg: 'm', parents: [], tree: {}, lane, t: 1, extra: { cherryOf: 'abc' } });
      expect(c.cherryOf).toBe('abc');
    });
  });
});
