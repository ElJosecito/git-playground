import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkR } from '../../recorder';
import { vacio } from '../../state';
import { GitError } from '../../errors';
import { init, add, commit } from '../basics';
import { reset, stash } from '../undo';
import type { RepoState } from '../../types';

function build(): RepoState {
  const s = vacio();
  init(s, [], mkR());
  s.files['a.txt'] = 'v1';
  add(s, ['a.txt'], mkR());
  commit(s, ['-m', 'root'], mkR());
  s.files['a.txt'] = 'v2';
  add(s, ['a.txt'], mkR());
  commit(s, ['-m', 'segundo'], mkR());
  return s;
}

describe('commands/undo (reset/stash)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 9, 6, 9, 12));
  });
  afterEach(() => vi.useRealTimers());

  describe('reset', () => {
    it('--soft moves HEAD but keeps the index at its current value', () => {
      const s = build();
      const root = s.order[0]!;
      s.index['a.txt'] = 'uncommitted-staged';
      const r = mkR();
      reset(s, ['--soft', root], r);
      expect(s.branches.main).toBe(root);
      expect(s.index['a.txt']).toBe('uncommitted-staged');
      expect(r.eventos[0]).toMatchObject({ type: 'reset', mode: 'soft', to: root });
    });

    it('--mixed (default) moves HEAD and resets the index, keeping working files', () => {
      const s = build();
      const root = s.order[0]!;
      const r = mkR();
      reset(s, [root], r);
      expect(s.index['a.txt']).toBe('v1');
      expect(s.files['a.txt']).toBe('v2'); // working tree untouched by mixed reset
    });

    it('--hard moves HEAD, index and working files all to the target', () => {
      const s = build();
      const root = s.order[0]!;
      const r = mkR();
      reset(s, ['--hard', root], r);
      expect(s.index['a.txt']).toBe('v1');
      expect(s.files['a.txt']).toBe('v1');
      expect(r.salida.join('\n')).toContain('HEAD está ahora en');
    });

    it('fails when there are no commits yet', () => {
      const s = vacio();
      init(s, [], mkR());
      expect(() => reset(s, [], mkR())).toThrowError(GitError);
    });
  });

  describe('stash', () => {
    it('push saves local changes and restores the tree to HEAD', () => {
      const s = build();
      s.files['a.txt'] = 'dirty';
      const r = mkR();
      stash(s, [], r);
      expect(s.stash).toHaveLength(1);
      expect(s.files['a.txt']).toBe('v2');
      expect(r.eventos).toEqual([{ type: 'stash-pushed', files: ['a.txt'] }]);
    });

    it('list shows saved entries, or a hint when empty', () => {
      const r1 = mkR();
      stash(build(), ['list'], r1);
      expect(r1.salida.join('\n')).toContain('(el stash está vacío)');
    });

    it('pop restores the stashed changes and removes the entry', () => {
      const s = build();
      s.files['a.txt'] = 'dirty';
      stash(s, ['push'], mkR());
      const r = mkR();
      stash(s, ['pop'], r);
      expect(s.files['a.txt']).toBe('dirty');
      expect(s.stash).toHaveLength(0);
    });

    it('apply restores the stashed changes but keeps the entry', () => {
      const s = build();
      s.files['a.txt'] = 'dirty';
      stash(s, ['push'], mkR());
      stash(s, ['apply'], mkR());
      expect(s.files['a.txt']).toBe('dirty');
      expect(s.stash).toHaveLength(1);
    });

    it('drop removes a stash entry without applying it', () => {
      const s = build();
      s.files['a.txt'] = 'dirty';
      stash(s, ['push'], mkR());
      const r = mkR();
      stash(s, ['drop'], r);
      expect(s.stash).toHaveLength(0);
      expect(s.files['a.txt']).toBe('v2'); // not restored
    });

    it('reports nothing-to-stash instead of pushing an empty entry', () => {
      const s = build();
      const r = mkR();
      stash(s, [], r);
      expect(s.stash).toHaveLength(0);
      expect(r.salida.join('\n')).toContain('No hay cambios locales para guardar');
    });
  });
});
