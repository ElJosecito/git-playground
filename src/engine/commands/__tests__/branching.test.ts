import { describe, it, expect } from 'vitest';
import { mkR } from '../../recorder';
import { vacio, nuevoCommit, laneFor, setHead, ensureColor } from '../../state';
import { GitError } from '../../errors';
import { crearRama, irARama, separar } from '../branching';
import type { RepoState } from '../../types';

function committed(): RepoState {
  const s = vacio();
  s.inited = true;
  const lane = laneFor(s, 'main');
  const c = nuevoCommit(s, { msg: 'root', parents: [], tree: { a: '1' }, lane, t: 1 });
  setHead(s, c.hash, 'commit (initial): root');
  s.index = { a: '1' };
  s.files = { a: '1' };
  return s;
}

describe('commands/branching (crearRama/irARama/separar helpers)', () => {
  describe('crearRama', () => {
    it('creates a branch pointing at the given hash and emits branch-created', () => {
      const s = committed();
      const r = mkR();
      crearRama(s, 'feature', s.branches.main!, r);
      expect(s.branches.feature).toBe(s.branches.main);
      expect(r.eventos).toEqual([{ type: 'branch-created', name: 'feature', hash: s.branches.main }]);
    });

    it('rejects an invalid branch name', () => {
      const s = committed();
      expect(() => crearRama(s, 'bad name', s.branches.main!, mkR())).toThrowError(GitError);
      expect(() => crearRama(s, '-dash', s.branches.main!, mkR())).toThrowError(GitError);
      expect(() => crearRama(s, 'HEAD', s.branches.main!, mkR())).toThrowError(GitError);
    });

    it('rejects a duplicate branch name', () => {
      const s = committed();
      expect(() => crearRama(s, 'main', s.branches.main!, mkR())).toThrowError(GitError);
    });
  });

  describe('irARama', () => {
    it('is a no-op (prints "Ya en") when already on that branch', () => {
      const s = committed();
      const r = mkR();
      irARama(s, 'main', r);
      expect(r.salida[0]).toContain("Ya en 'main'");
      expect(r.eventos).toEqual([]);
    });

    it('switches branches, updates files/index to the target tree, and records prev + reflog', () => {
      const s = committed();
      ensureColor(s, 'feature');
      const lane = laneFor(s, 'feature');
      const c2 = nuevoCommit(s, { msg: 'feature work', parents: [], tree: { a: '2' }, lane, t: 2 });
      s.branches.feature = c2.hash;
      const r = mkR();
      irARama(s, 'feature', r);
      expect(s.head).toEqual({ type: 'branch', name: 'feature' });
      expect(s.files.a).toBe('2');
      expect(s.prev).toBe('main');
      expect(r.eventos).toEqual([{ type: 'switched', name: 'feature' }]);
    });

    it('fails while an operation (merge/rebase/...) is in progress', () => {
      const s = committed();
      s.branches.feature = s.branches.main!;
      s.op = { kind: 'merge', other: 'x', otherName: 'x', conflicts: [], data: {}, msg: 'm', origW: {}, origI: {} };
      expect(() => irARama(s, 'feature', mkR())).toThrowError(GitError);
    });
  });

  describe('separar', () => {
    it('detaches HEAD at the given hash and updates files to its tree', () => {
      const s = committed();
      const lane = laneFor(s, 'main');
      const c2 = nuevoCommit(s, { msg: 'other', parents: [s.branches.main!], tree: { a: '3' }, lane, t: 2 });
      const r = mkR();
      separar(s, c2.hash, c2.hash, r);
      expect(s.head).toEqual({ type: 'detached', hash: c2.hash });
      expect(s.files.a).toBe('3');
      expect(r.eventos).toEqual([{ type: 'detached', hash: c2.hash }]);
    });

    it('is a no-op when HEAD is already detached at that hash', () => {
      const s = committed();
      s.head = { type: 'detached', hash: s.branches.main! };
      const r = mkR();
      separar(s, s.branches.main!, 'x', r);
      expect(r.salida[0]).toContain('HEAD ya está en');
      expect(r.eventos).toEqual([]);
    });
  });
});
