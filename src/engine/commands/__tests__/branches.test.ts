import { describe, it, expect } from 'vitest';
import { mkR } from '../../recorder';
import { vacio, nuevoCommit, laneFor, setHead } from '../../state';
import { GitError } from '../../errors';
import { branch, switchCmd, checkout, tag } from '../branches';
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

describe('commands/branches (branch/switch/checkout/tag)', () => {
  describe('branch', () => {
    it('creates a new branch at HEAD when given just a name', () => {
      const s = committed();
      branch(s, ['feature'], mkR());
      expect(s.branches.feature).toBe(s.branches.main);
    });

    it('lists branches, marking the current one', () => {
      const s = committed();
      branch(s, ['feature'], mkR());
      const r = mkR();
      branch(s, [], r);
      expect(r.salida.some((l) => l.includes('* ') && l.includes('main'))).toBe(true);
      expect(r.salida.some((l) => l.includes('feature'))).toBe(true);
    });

    it('-d deletes a fully-merged branch, -D force-deletes', () => {
      const s = committed();
      branch(s, ['feature'], mkR());
      const r = mkR();
      branch(s, ['-d', 'feature'], r);
      expect('feature' in s.branches).toBe(false);
      expect(r.eventos).toEqual([{ type: 'branch-deleted', name: 'feature' }]);
    });

    it('-d refuses to delete an unmerged branch without force', () => {
      const s = committed();
      const lane = laneFor(s, 'feature');
      const c2 = nuevoCommit(s, { msg: 'feature work', parents: [s.branches.main!], tree: { a: '2' }, lane, t: 2 });
      s.branches.feature = c2.hash;
      expect(() => branch(s, ['-d', 'feature'], mkR())).toThrowError(GitError);
      branch(s, ['-D', 'feature'], mkR());
      expect('feature' in s.branches).toBe(false);
    });

    it('refuses to delete the current branch', () => {
      const s = committed();
      expect(() => branch(s, ['-d', 'main'], mkR())).toThrowError(GitError);
    });

    it('-m renames a branch, carrying color/lane/upstream, and updates HEAD if current', () => {
      const s = committed();
      const r = mkR();
      branch(s, ['-m', 'main', 'trunk'], r);
      expect(s.branches.trunk).toBeDefined();
      expect('main' in s.branches).toBe(false);
      expect(s.head).toEqual({ type: 'branch', name: 'trunk' });
      expect(r.eventos).toEqual([{ type: 'branch-renamed', from: 'main', to: 'trunk' }]);
    });
  });

  describe('switch', () => {
    it('-c creates and switches to a new branch at HEAD', () => {
      const s = committed();
      const r = mkR();
      switchCmd(s, ['-c', 'feature'], r);
      expect(s.head).toEqual({ type: 'branch', name: 'feature' });
      expect(s.branches.feature).toBe(s.branches.main);
    });

    it('switches to an existing branch by name', () => {
      const s = committed();
      const lane = laneFor(s, 'feature');
      const c2 = nuevoCommit(s, { msg: 'feature work', parents: [s.branches.main!], tree: { a: '2' }, lane, t: 2 });
      s.branches.feature = c2.hash;
      switchCmd(s, ['feature'], mkR());
      expect(s.head).toEqual({ type: 'branch', name: 'feature' });
      expect(s.files.a).toBe('2');
    });

    it('-d detaches HEAD at a resolvable ref', () => {
      const s = committed();
      const r = mkR();
      switchCmd(s, ['-d', 'HEAD'], r);
      expect(s.head.type).toBe('detached');
    });

    it('"-" switches back to the previous branch', () => {
      const s = committed();
      switchCmd(s, ['-c', 'feature'], mkR());
      const r = mkR();
      switchCmd(s, ['-'], r);
      expect(s.head).toEqual({ type: 'branch', name: 'main' });
    });

    it('fails with a suggestion for an unknown branch name', () => {
      const s = committed();
      expect(() => switchCmd(s, ['mian'], mkR())).toThrowError(GitError);
    });
  });

  describe('checkout', () => {
    it('-- <file> restores a file from the index', () => {
      const s = committed();
      s.files.a = 'edited';
      checkout(s, ['--', 'a'], mkR());
      expect(s.files.a).toBe('1');
    });

    it('-b is an alias for switch -c', () => {
      const s = committed();
      checkout(s, ['-b', 'feature'], mkR());
      expect(s.head).toEqual({ type: 'branch', name: 'feature' });
    });

    it('checking out a branch name switches to it', () => {
      const s = committed();
      const lane = laneFor(s, 'feature');
      const c2 = nuevoCommit(s, { msg: 'feature work', parents: [s.branches.main!], tree: { a: '2' }, lane, t: 2 });
      s.branches.feature = c2.hash;
      checkout(s, ['feature'], mkR());
      expect(s.head).toEqual({ type: 'branch', name: 'feature' });
    });

    it('checking out a bare commit hash detaches HEAD', () => {
      const s = committed();
      checkout(s, [s.branches.main!], mkR());
      expect(s.head.type).toBe('detached');
    });
  });

  describe('tag', () => {
    it('creates a tag at HEAD by default', () => {
      const s = committed();
      const r = mkR();
      tag(s, ['v1'], r);
      expect(s.tags.v1).toBe(s.branches.main);
      expect(r.eventos).toEqual([{ type: 'tag-created', name: 'v1', hash: s.branches.main }]);
    });

    it('lists tags, or a hint when there are none', () => {
      const s = committed();
      const r = mkR();
      tag(s, [], r);
      expect(r.salida.join('\n')).toContain('no hay tags todavía');
    });

    it('-d deletes an existing tag', () => {
      const s = committed();
      tag(s, ['v1'], mkR());
      const r = mkR();
      tag(s, ['-d', 'v1'], r);
      expect('v1' in s.tags).toBe(false);
      expect(r.eventos).toEqual([{ type: 'tag-deleted', name: 'v1' }]);
    });

    it('fails to create a duplicate tag', () => {
      const s = committed();
      tag(s, ['v1'], mkR());
      expect(() => tag(s, ['v1'], mkR())).toThrowError(GitError);
    });
  });
});
