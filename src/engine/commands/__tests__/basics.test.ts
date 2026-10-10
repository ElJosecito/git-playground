import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkR } from '../../recorder';
import { vacio, nuevoCommit, laneFor, setHead } from '../../state';
import { GitError } from '../../errors';
import { init, status, add, restore, rm, mv, commit, clean } from '../basics';
import type { RepoState } from '../../types';

function out(r: ReturnType<typeof mkR>): string[] {
  return r.salida;
}

describe('commands/basics (init/status/add/restore/rm/mv/commit)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 9, 6, 9, 12));
  });
  afterEach(() => vi.useRealTimers());

  describe('init', () => {
    it('initializes an empty repo on main and emits repo-init', () => {
      const s = vacio();
      const r = mkR();
      init(s, [], r);
      expect(s.inited).toBe(true);
      expect(s.head).toEqual({ type: 'branch', name: 'main' });
      expect(s.colorOf.main).toBe(0);
      expect(r.eventos).toEqual([{ type: 'repo-init' }]);
      expect(out(r)).toEqual(['Inicializado repositorio Git vacío en /home/tu/proyecto/.git/']);
    });

    it('re-running init on an existing repo reports "Reinicializado" and emits nothing', () => {
      const s = vacio();
      init(s, [], mkR());
      const r = mkR();
      init(s, [], r);
      expect(out(r)).toEqual(['Reinicializado el repositorio Git existente en /home/tu/proyecto/.git/']);
      expect(r.eventos).toEqual([]);
    });
  });

  describe('status', () => {
    it('reports the branch name and a clean tree before any commit shows "no hay commits todavía"', () => {
      const s = vacio();
      init(s, [], mkR());
      const r = mkR();
      status(s, [], r);
      expect(out(r)).toContain('No hay commits todavía');
    });

    it('lists staged changes and untracked files separately', () => {
      const s = vacio();
      init(s, [], mkR());
      s.files['new.txt'] = 'hi';
      s.index['new.txt'] = 'hi';
      s.files['loose.txt'] = 'untracked';
      const r = mkR();
      status(s, [], r);
      const joined = out(r).join('\n');
      expect(joined).toContain('Cambios a ser confirmados');
      expect(joined).toContain('new.txt');
      expect(joined).toContain('Archivos sin seguimiento');
      expect(joined).toContain('loose.txt');
    });
  });

  describe('add', () => {
    it('fails with a helpful hint when called with no path and no "."', () => {
      const s = vacio();
      init(s, [], mkR());
      expect(() => add(s, [], mkR())).toThrowError(GitError);
    });

    it('stages a specific untracked file', () => {
      const s = vacio();
      init(s, [], mkR());
      s.files['a.txt'] = 'hi';
      add(s, ['a.txt'], mkR());
      expect(s.index['a.txt']).toBe('hi');
    });

    it('stages everything with "."', () => {
      const s = vacio();
      init(s, [], mkR());
      s.files['a.txt'] = '1';
      s.files['b.txt'] = '2';
      add(s, ['.'], mkR());
      expect(s.index).toEqual({ 'a.txt': '1', 'b.txt': '2' });
    });

    it('fails for a path that matches no file', () => {
      const s = vacio();
      init(s, [], mkR());
      expect(() => add(s, ['missing.txt'], mkR())).toThrowError(GitError);
    });

    it('resolves a conflict entry when the conflicted file is added', () => {
      const s = vacio();
      init(s, [], mkR());
      s.op = { kind: 'merge', other: 'x', otherName: 'x', conflicts: ['a.txt'], data: {}, msg: 'm', origW: {}, origI: {} };
      s.files['a.txt'] = 'resolved';
      s.index['a.txt'] = 'resolved';
      const r = mkR();
      add(s, ['a.txt'], r);
      expect(s.op.conflicts).toEqual([]);
      expect(r.eventos).toEqual([{ type: 'conflict-resolved', file: 'a.txt' }]);
    });
  });

  describe('restore', () => {
    it('restores a working-tree file from the index', () => {
      const s = vacio();
      init(s, [], mkR());
      s.index['a.txt'] = 'saved';
      s.files['a.txt'] = 'edited';
      restore(s, ['a.txt'], mkR());
      expect(s.files['a.txt']).toBe('saved');
    });

    it('unstages a file with --staged, restoring the index to HEAD', () => {
      const s = vacio();
      init(s, [], mkR());
      const lane = laneFor(s, 'main');
      const c = nuevoCommit(s, { msg: 'root', parents: [], tree: { 'a.txt': 'head-value' }, lane, t: 1 });
      setHead(s, c.hash, 'commit (initial): root');
      s.index['a.txt'] = 'staged-value';
      s.files['a.txt'] = 'staged-value';
      restore(s, ['--staged', 'a.txt'], mkR());
      expect(s.index['a.txt']).toBe('head-value');
    });

    it('fails for an untracked path', () => {
      const s = vacio();
      init(s, [], mkR());
      expect(() => restore(s, ['nope.txt'], mkR())).toThrowError(GitError);
    });
  });

  describe('rm', () => {
    it('removes a file from the index and the working tree', () => {
      const s = vacio();
      init(s, [], mkR());
      s.index['a.txt'] = 'x';
      s.files['a.txt'] = 'x';
      rm(s, ['a.txt'], mkR());
      expect('a.txt' in s.index).toBe(false);
      expect('a.txt' in s.files).toBe(false);
    });

    it('keeps the working file with --cached', () => {
      const s = vacio();
      init(s, [], mkR());
      s.index['a.txt'] = 'x';
      s.files['a.txt'] = 'x';
      rm(s, ['--cached', 'a.txt'], mkR());
      expect('a.txt' in s.index).toBe(false);
      expect(s.files['a.txt']).toBe('x');
    });

    it('fails for a file git does not track', () => {
      const s = vacio();
      init(s, [], mkR());
      expect(() => rm(s, ['nope.txt'], mkR())).toThrowError(GitError);
    });
  });

  describe('mv', () => {
    it('renames a tracked file in both files and index', () => {
      const s = vacio();
      init(s, [], mkR());
      s.index['old.txt'] = 'x';
      s.files['old.txt'] = 'x';
      mv(s, ['old.txt', 'new.txt'], mkR());
      expect(s.files['new.txt']).toBe('x');
      expect('old.txt' in s.files).toBe(false);
      expect(s.index['new.txt']).toBe('x');
    });

    it('fails when the source is not under version control', () => {
      const s = vacio();
      init(s, [], mkR());
      expect(() => mv(s, ['nope.txt', 'new.txt'], mkR())).toThrowError(GitError);
    });
  });

  describe('commit', () => {
    function initedState(): RepoState {
      const s = vacio();
      init(s, [], mkR());
      return s;
    }

    it('creates a root commit with -m and emits commit-created', () => {
      const s = initedState();
      s.files['a.txt'] = 'hi';
      s.index['a.txt'] = 'hi';
      const r = mkR();
      commit(s, ['-m', 'first'], r);
      expect(Object.keys(s.commits)).toHaveLength(1);
      expect(r.eventos).toEqual([{ type: 'commit-created', hash: expect.any(String), files: ['a.txt'], branch: 'main', root: true }]);
    });

    it('fails when the working tree matches HEAD (nothing to commit)', () => {
      const s = initedState();
      expect(() => commit(s, ['-m', 'x'], mkR())).toThrowError(GitError);
    });

    it('fails on an empty message', () => {
      const s = initedState();
      s.files['a.txt'] = 'hi';
      s.index['a.txt'] = 'hi';
      expect(() => commit(s, ['-m', '   '], mkR())).toThrowError(GitError);
    });

    it('-a stages tracked modifications before committing', () => {
      const s = initedState();
      s.files['a.txt'] = 'v1';
      s.index['a.txt'] = 'v1';
      commit(s, ['-m', 'root'], mkR());
      s.files['a.txt'] = 'v2'; // tracked, modified, not yet added
      commit(s, ['-a', '-m', 'second'], mkR());
      expect(s.index['a.txt']).toBe('v2');
      expect(Object.keys(s.commits)).toHaveLength(2);
    });

    it('--amend replaces the last commit and offsets the old one visually', () => {
      const s = initedState();
      s.files['a.txt'] = 'v1';
      s.index['a.txt'] = 'v1';
      commit(s, ['-m', 'root'], mkR());
      const oldHash = Object.keys(s.commits)[0]!;
      const r = mkR();
      commit(s, ['--amend', '-m', 'root fixed'], r);
      expect(s.commits[oldHash]!.dy).toBe(-46);
      expect(r.eventos[0]).toMatchObject({ type: 'commit-amended', old: oldHash });
    });

    it('finalizes a merge commit with two parents when s.op.kind is merge', () => {
      const s = initedState();
      s.files['a.txt'] = 'v1';
      s.index['a.txt'] = 'v1';
      commit(s, ['-m', 'root'], mkR());
      const root = Object.keys(s.commits)[0]!;
      s.op = { kind: 'merge', other: root, otherName: 'feature', conflicts: [], data: {}, msg: 'Merge branch feature', origW: {}, origI: {} };
      const r = mkR();
      commit(s, [], r);
      expect(r.eventos[0]).toMatchObject({ type: 'merge-commit', theirs: 'feature', into: 'main' });
      expect(s.op).toBeNull();
    });

    it('fails while a rebase is in progress', () => {
      const s = initedState();
      s.op = { kind: 'rebase', onto: 'x', ontoName: 'x', todo: [], pairs: [], branch: 'main', orig: 'x', ut: {}, lane: 0, conflicts: [] };
      expect(() => commit(s, ['-m', 'x'], mkR())).toThrowError(GitError);
    });
  });

  describe('clean', () => {
    it('refuses to delete without -n or -f', () => {
      const s = vacio();
      init(s, [], mkR());
      s.files['loose.txt'] = 'x';
      expect(() => clean(s, [], mkR())).toThrowError(GitError);
    });

    it('-n (dry run) reports what would be deleted without deleting it', () => {
      const s = vacio();
      init(s, [], mkR());
      s.files['loose.txt'] = 'x';
      const r = mkR();
      clean(s, ['-n'], r);
      expect(out(r)).toEqual(['Se borraría loose.txt']);
      expect(s.files['loose.txt']).toBe('x');
    });

    it('-f deletes every untracked file', () => {
      const s = vacio();
      init(s, [], mkR());
      s.files['loose.txt'] = 'x';
      const r = mkR();
      clean(s, ['-f'], r);
      expect(out(r)).toEqual(['Borrando loose.txt']);
      expect('loose.txt' in s.files).toBe(false);
    });

    it('reports nothing to clean when there are no untracked files', () => {
      const s = vacio();
      init(s, [], mkR());
      const r = mkR();
      clean(s, ['-f'], r);
      expect(out(r).join('\n')).toContain('No hay archivos sin seguimiento');
    });

    it('never touches tracked (indexed) files', () => {
      const s = vacio();
      init(s, [], mkR());
      s.files['tracked.txt'] = 'x';
      s.index['tracked.txt'] = 'x';
      clean(s, ['-f'], mkR());
      expect(s.files['tracked.txt']).toBe('x');
    });
  });
});
