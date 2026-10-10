import { describe, it, expect } from 'vitest';
import { vacio, nuevoCommit, setHead, laneFor } from '../state';
import { estadoArchivos, sucio, untracked, cambiarArbol, expand, validName } from '../files';
import { GitError } from '../errors';
import type { RepoState } from '../types';

function committedState(tree: Record<string, string>): RepoState {
  const s = vacio();
  s.inited = true;
  const lane = laneFor(s, 'main');
  const c = nuevoCommit(s, { msg: 'root', parents: [], tree, lane, t: 1 });
  setHead(s, c.hash, 'commit (initial): root');
  s.index = { ...tree };
  s.files = { ...tree };
  return s;
}

describe('files (working tree / index state, ported from git-engine.js)', () => {
  describe('estadoArchivos', () => {
    it('reports no changes for a clean tree', () => {
      const s = committedState({ 'a.txt': 'hola' });
      const { st, un, ut, conf } = estadoArchivos(s);
      expect(st).toEqual([]);
      expect(un).toEqual([]);
      expect(ut).toEqual([]);
      expect(conf).toEqual([]);
    });

    it('reports a staged new file', () => {
      const s = committedState({});
      s.index['b.txt'] = 'nuevo';
      s.files['b.txt'] = 'nuevo';
      expect(estadoArchivos(s).st).toEqual([{ f: 'b.txt', t: 'nuevo' }]);
    });

    it('reports a staged modification and a staged deletion', () => {
      const s = committedState({ 'a.txt': 'v1' });
      s.index['a.txt'] = 'v2';
      s.files['a.txt'] = 'v2';
      expect(estadoArchivos(s).st).toEqual([{ f: 'a.txt', t: 'modificado' }]);

      const s2 = committedState({ 'a.txt': 'v1' });
      delete s2.index['a.txt'];
      delete s2.files['a.txt'];
      expect(estadoArchivos(s2).st).toEqual([{ f: 'a.txt', t: 'borrado' }]);
    });

    it('reports an unstaged working-tree modification', () => {
      const s = committedState({ 'a.txt': 'v1' });
      s.files['a.txt'] = 'v2'; // index still v1
      expect(estadoArchivos(s).un).toEqual([{ f: 'a.txt', t: 'modificado' }]);
    });

    it('reports an untracked file (in files but never indexed)', () => {
      const s = committedState({});
      s.files['new.txt'] = 'hi';
      expect(estadoArchivos(s).ut).toEqual([{ f: 'new.txt' }]);
    });

    it('excludes conflicted files from st/un/ut', () => {
      const s = committedState({ 'a.txt': 'base' });
      s.op = {
        kind: 'merge',
        other: 'x',
        otherName: 'x',
        conflicts: ['a.txt'],
        data: {},
        msg: 'merge',
        origW: {},
        origI: {},
      };
      s.index['a.txt'] = 'ours';
      s.files['a.txt'] = '<<<<<<<';
      const r = estadoArchivos(s);
      expect(r.st).toEqual([]);
      expect(r.un).toEqual([]);
      expect(r.conf).toEqual(['a.txt']);
    });
  });

  describe('sucio', () => {
    it('is false for a clean tree and true when something is staged or unstaged', () => {
      const clean = committedState({ 'a.txt': 'v1' });
      expect(sucio(clean)).toBe(false);

      const dirty = committedState({ 'a.txt': 'v1' });
      dirty.files['a.txt'] = 'v2';
      expect(sucio(dirty)).toBe(true);
    });
  });

  describe('untracked', () => {
    it('returns files present in the working tree but never indexed', () => {
      const s = committedState({ 'a.txt': 'v1' });
      s.files['new.txt'] = 'hi';
      expect(untracked(s)).toEqual({ 'new.txt': 'hi' });
    });
  });

  describe('cambiarArbol', () => {
    it('applies the target tree cleanly when there are no local changes', () => {
      const s = committedState({ 'a.txt': 'v1' });
      const lane = laneFor(s, 'feature');
      const c2 = nuevoCommit(s, { msg: 'other', parents: [], tree: { 'a.txt': 'v2' }, lane, t: 2 });
      cambiarArbol(s, c2.hash);
      expect(s.files).toEqual({ 'a.txt': 'v2' });
      expect(s.index).toEqual({ 'a.txt': 'v2' });
    });

    it('preserves untouched staged/unstaged changes when switching', () => {
      const s = committedState({ 'a.txt': 'v1', 'b.txt': 'v1' });
      s.files['b.txt'] = 'locally-edited'; // unstaged change to b.txt, untouched by target
      const lane = laneFor(s, 'feature');
      const c2 = nuevoCommit(s, { msg: 'other', parents: [], tree: { 'a.txt': 'v2', 'b.txt': 'v1' }, lane, t: 2 });
      cambiarArbol(s, c2.hash);
      expect(s.files.b).toBeUndefined();
      expect(s.files['b.txt']).toBe('locally-edited');
      expect(s.files['a.txt']).toBe('v2');
    });

    it('fails and leaves state untouched when local changes would be overwritten', () => {
      const s = committedState({ 'a.txt': 'v1' });
      s.files['a.txt'] = 'locally-edited';
      const lane = laneFor(s, 'feature');
      const c2 = nuevoCommit(s, { msg: 'other', parents: [], tree: { 'a.txt': 'v2' }, lane, t: 2 });
      expect(() => cambiarArbol(s, c2.hash)).toThrowError(GitError);
      expect(s.files['a.txt']).toBe('locally-edited');
    });
  });

  describe('expand', () => {
    it('passes through literal paths unchanged', () => {
      const s = vacio();
      expect(expand(s, ['a.txt', 'b.txt'], ['a.txt', 'b.txt', 'c.txt'])).toEqual(['a.txt', 'b.txt']);
    });

    it('expands a glob pattern against the pool', () => {
      const s = vacio();
      expect(expand(s, ['*.txt'], ['a.txt', 'b.md', 'c.txt'])).toEqual(['a.txt', 'c.txt']);
    });

    it('dedupes repeated matches', () => {
      const s = vacio();
      expect(expand(s, ['a.txt', 'a.txt'], ['a.txt'])).toEqual(['a.txt']);
    });

    it('fails when a glob matches nothing', () => {
      const s = vacio();
      expect(() => expand(s, ['*.nope'], ['a.txt'])).toThrowError(GitError);
    });
  });

  describe('validName', () => {
    it('accepts word characters, dots and dashes', () => {
      expect(validName('a.txt')).toBe(true);
      expect(validName('my-file_v2.md')).toBe(true);
    });

    it('rejects ".", "..", ".git" and names with slashes or spaces', () => {
      expect(validName('.')).toBe(false);
      expect(validName('..')).toBe(false);
      expect(validName('.git')).toBe(false);
      expect(validName('a/b.txt')).toBe(false);
      expect(validName('a b.txt')).toBe(false);
    });
  });
});
