import { describe, it, expect } from 'vitest';
import { diffTxt, hunks, fusionLineas, fusionar3, marcadores, aplicarResultado, cambiosCommit, diffArboles } from '../diff';
import { vacio, nuevoCommit, laneFor } from '../state';

// Expected values below were derived by running the oracle's own diff/merge
// functions (design-handoff/git-engine.js) against these exact fixtures —
// see the apply-progress note for the extraction script. These are NOT
// hand-derived guesses.
describe('diff (LCS diff + 3-way merge, ported from git-engine.js)', () => {
  describe('diffTxt', () => {
    it('produces context/removed/added lines for a single-line change', () => {
      expect(diffTxt('a\nb\nc', 'a\nx\nc')).toEqual([' a', '-b', '+x', ' c']);
    });

    it('handles a pure addition', () => {
      expect(diffTxt('a', 'a\nb')).toEqual([' a', '+b']);
    });

    it('treats null/empty as zero lines', () => {
      expect(diffTxt(null as unknown as string, 'a')).toEqual(['+a']);
      expect(diffTxt('a', '')).toEqual(['-a']);
    });
  });

  describe('hunks', () => {
    it('groups contiguous changed lines into a single hunk with start/end/lines', () => {
      expect(hunks('a\nb\nc', 'a\nx\nc')).toEqual([{ s: 1, e: 2, lines: ['x'] }]);
    });
  });

  describe('fusionLineas', () => {
    it('auto-merges non-overlapping hunks from base', () => {
      expect(fusionLineas('a\nb\nc', 'x\nb\nc', 'a\nb\ny')).toBe('x\nb\ny');
    });

    it('returns null when both sides touch the same region differently', () => {
      expect(fusionLineas('a\nb\nc', 'x\nb\nc', 'z\nb\nc')).toBeNull();
    });
  });

  describe('fusionar3', () => {
    it('auto-merges a file via line-level merge when both sides changed disjoint lines', () => {
      expect(fusionar3({ f: 'a\nb\nc' }, { f: 'x\nb\nc' }, { f: 'a\nb\ny' })).toEqual({
        tree: { f: 'x\nb\ny' },
        conf: [],
        data: {},
      });
    });

    it('reports a conflict with ours/theirs when both sides touch the same line', () => {
      expect(fusionar3({ f: 'a\nb\nc' }, { f: 'x\nb\nc' }, { f: 'z\nb\nc' })).toEqual({
        tree: {},
        conf: ['f'],
        data: { f: { ours: 'x\nb\nc', theirs: 'z\nb\nc' } },
      });
    });

    it('takes the deletion when one side deletes and the other is unchanged', () => {
      expect(fusionar3({ f: 'base' }, {}, { f: 'base' })).toEqual({ tree: {}, conf: [], data: {} });
    });

    it('keeps an identical value added by both sides without conflict', () => {
      expect(fusionar3({}, { g: 'same' }, { g: 'same' })).toEqual({ tree: { g: 'same' }, conf: [], data: {} });
    });
  });

  describe('marcadores', () => {
    it('builds conflict markers with ours/theirs content', () => {
      expect(marcadores('mine', 'theirs', 'feature')).toBe('<<<<<<< HEAD\nmine\n=======\ntheirs\n>>>>>>> feature');
    });

    it('renders a deleted side as an empty section', () => {
      expect(marcadores(undefined, 'theirs', 'feature')).toBe('<<<<<<< HEAD\n\n=======\ntheirs\n>>>>>>> feature');
    });
  });

  describe('aplicarResultado', () => {
    it('stages the merged tree, writes conflict markers for conflicted files, and keeps untracked files', () => {
      const s = vacio();
      s.files = { 'u.txt': 'untracked-content' }; // never indexed
      aplicarResultado(
        s,
        { tree: { 'a.txt': 'merged' }, conf: ['b.txt'], data: { 'b.txt': { ours: 'mine', theirs: 'theirs' } } },
        'feature',
      );
      expect(s.index).toEqual({ 'a.txt': 'merged', 'b.txt': 'mine' });
      expect(s.files['a.txt']).toBe('merged');
      expect(s.files['u.txt']).toBe('untracked-content');
      expect(s.files['b.txt']).toBe('<<<<<<< HEAD\nmine\n=======\ntheirs\n>>>>>>> feature');
    });
  });

  describe('cambiosCommit', () => {
    it('lists files changed versus the first parent with +/−/~ markers', () => {
      const s = vacio();
      const lane = laneFor(s, 'main');
      const c1 = nuevoCommit(s, { msg: 'root', parents: [], tree: { keep: 'x', del: 'y', mod: 'a' }, lane, t: 1 });
      const c2 = nuevoCommit(s, { msg: 'change', parents: [c1.hash], tree: { keep: 'x', mod: 'b', add: 'new' }, lane, t: 2 });
      expect(cambiosCommit(s, c2.hash).sort((a, b) => a.f.localeCompare(b.f))).toEqual([
        { f: 'add', t: '+' },
        { f: 'del', t: '−' },
        { f: 'mod', t: '~' },
      ]);
    });
  });

  describe('diffArboles', () => {
    it('renders a unified-diff-style line set for modified and new files', () => {
      expect(diffArboles({ a: '1\n2' }, { a: '1\n3', b: 'new' })).toEqual([
        '\x01bold\x02diff --git a/a b/a\x03',
        '\x01bold\x02--- a/a\x03',
        '\x01bold\x02+++ b/a\x03',
        '\x01cy\x02@@\x03',
        ' 1',
        '\x01r\x02-2\x03',
        '\x01g\x02+3\x03',
        '\x01bold\x02diff --git a/b b/b\x03',
        '\x01bold\x02nuevo archivo\x03',
        '\x01bold\x02--- /dev/null\x03',
        '\x01bold\x02+++ b/b\x03',
        '\x01cy\x02@@\x03',
        '\x01g\x02+new\x03',
      ]);
    });

    it('skips files outside the "only" filter and files with no diff', () => {
      expect(diffArboles({ a: '1', b: '2' }, { a: '1', b: '3' }, ['a'])).toEqual([]);
    });
  });
});
