import { describe, it, expect } from 'vitest';
import { vacio, nuevoCommit, laneFor, setHead, ensureColor } from '../state';
import { infoRama, refsDe } from '../info';

describe('info (infoRama / refsDe, ported from git-engine.js)', () => {
  describe('infoRama', () => {
    it('reports hash/msg/actual for the current branch', () => {
      const s = vacio();
      const lane = laneFor(s, 'main');
      const c = nuevoCommit(s, { msg: 'root', parents: [], tree: {}, lane, t: 1 });
      setHead(s, c.hash, 'commit (initial): root');
      const r = infoRama(s, 'main');
      expect(r).toMatchObject({ hash: c.hash, msg: 'root', actual: true });
    });

    it('reports an empty msg and null-ish hash for a branch with no commits', () => {
      const s = vacio();
      ensureColor(s, 'empty');
      const r = infoRama(s, 'empty');
      expect(r.msg).toBe('');
      expect(r.actual).toBe(false);
    });

    it('includes vsMain ahead/behind counts for a non-main branch', () => {
      const s = vacio();
      const lane = laneFor(s, 'main');
      const c1 = nuevoCommit(s, { msg: 'root', parents: [], tree: {}, lane, t: 1 });
      setHead(s, c1.hash, 'commit (initial): root');
      ensureColor(s, 'feature');
      const c2 = nuevoCommit(s, { msg: 'feature work', parents: [c1.hash], tree: {}, lane: laneFor(s, 'feature'), t: 2 });
      s.branches.feature = c2.hash;
      const r = infoRama(s, 'feature');
      expect(r.vsMain).toEqual([1, 0]);
    });
  });

  describe('refsDe', () => {
    it('lists every branch, tracking ref and tag pointing at a hash', () => {
      const s = vacio();
      const lane = laneFor(s, 'main');
      const c = nuevoCommit(s, { msg: 'root', parents: [], tree: {}, lane, t: 1 });
      setHead(s, c.hash, 'commit (initial): root');
      s.tracking.main = c.hash;
      s.tags.v1 = c.hash;
      expect(refsDe(s, c.hash).sort()).toEqual(['main', 'origin/main', 'tag: v1'].sort());
    });

    it('returns an empty list for a hash nothing points at', () => {
      expect(refsDe(vacio(), 'nope')).toEqual([]);
    });
  });
});
