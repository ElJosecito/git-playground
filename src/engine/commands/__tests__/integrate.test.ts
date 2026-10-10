import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkR } from '../../recorder';
import { vacio } from '../../state';
import { GitError } from '../../errors';
import { init, add, commit } from '../basics';
import { switchCmd } from '../branches';
import { merge, rebase, cherryPick, revert } from '../integrate';
import type { RepoState } from '../../types';

function rootRepo(): RepoState {
  const s = vacio();
  init(s, [], mkR());
  s.files['a.txt'] = 'v1';
  add(s, ['a.txt'], mkR());
  commit(s, ['-m', 'root'], mkR());
  return s;
}

describe('commands/integrate (merge/rebase/cherry-pick/revert)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 9, 6, 9, 12));
  });
  afterEach(() => vi.useRealTimers());

  describe('merge', () => {
    it('fast-forwards when ours is an ancestor of theirs', () => {
      const s = rootRepo();
      switchCmd(s, ['-c', 'feature'], mkR());
      s.files['a.txt'] = 'v2';
      add(s, ['a.txt'], mkR());
      commit(s, ['-m', 'feature work'], mkR());
      switchCmd(s, ['main'], mkR());
      const r = mkR();
      merge(s, ['feature'], r);
      expect(s.files['a.txt']).toBe('v2');
      expect(r.eventos[0]).toMatchObject({ type: 'fast-forward' });
    });

    it('reports up-to-date when theirs is already an ancestor of ours', () => {
      const s = rootRepo();
      switchCmd(s, ['-c', 'feature'], mkR());
      switchCmd(s, ['main'], mkR());
      const r = mkR();
      merge(s, ['feature'], r);
      expect(r.eventos).toEqual([{ type: 'up-to-date' }]);
    });

    it('creates a real merge commit for non-fast-forward disjoint changes', () => {
      const s = rootRepo();
      switchCmd(s, ['-c', 'feature'], mkR());
      s.files['b.txt'] = 'on-feature';
      add(s, ['b.txt'], mkR());
      commit(s, ['-m', 'feature work'], mkR());
      switchCmd(s, ['main'], mkR());
      s.files['c.txt'] = 'on-main';
      add(s, ['c.txt'], mkR());
      commit(s, ['-m', 'main work'], mkR());
      const r = mkR();
      merge(s, ['feature'], r);
      expect(r.eventos[0]).toMatchObject({ type: 'merge-commit' });
      expect(s.files['b.txt']).toBe('on-feature');
      expect(s.files['c.txt']).toBe('on-main');
    });

    it('records a conflict and --abort restores the pre-merge snapshot', () => {
      const s = rootRepo();
      switchCmd(s, ['-c', 'feature'], mkR());
      s.files['a.txt'] = 'feature-value';
      add(s, ['a.txt'], mkR());
      commit(s, ['-m', 'feature edit'], mkR());
      switchCmd(s, ['main'], mkR());
      s.files['a.txt'] = 'main-value';
      add(s, ['a.txt'], mkR());
      commit(s, ['-m', 'main edit'], mkR());
      const r = mkR();
      merge(s, ['feature'], r);
      expect(s.op?.kind).toBe('merge');
      expect(r.eventos[0]).toMatchObject({ type: 'merge-conflict' });
      merge(s, ['--abort'], mkR());
      expect(s.op).toBeNull();
      expect(s.files['a.txt']).toBe('main-value');
    });

    it('fails when a merge is already in progress', () => {
      const s = rootRepo();
      s.op = { kind: 'merge', other: 'x', otherName: 'x', conflicts: ['a.txt'], data: {}, msg: 'm', origW: {}, origI: {} };
      expect(() => merge(s, ['main'], mkR())).toThrowError(GitError);
    });
  });

  describe('rebase', () => {
    it('fast-forwards when ours is an ancestor of the target', () => {
      const s = rootRepo();
      switchCmd(s, ['-c', 'feature'], mkR());
      switchCmd(s, ['main'], mkR());
      s.files['a.txt'] = 'v2';
      add(s, ['a.txt'], mkR());
      commit(s, ['-m', 'main work'], mkR());
      switchCmd(s, ['feature'], mkR());
      const r = mkR();
      rebase(s, ['main'], r);
      expect(r.eventos[0]).toMatchObject({ type: 'fast-forward' });
    });

    it('replays commits on top of the target and reports rebase-done', () => {
      const s = rootRepo();
      switchCmd(s, ['-c', 'feature'], mkR());
      s.files['b.txt'] = 'feature-file';
      add(s, ['b.txt'], mkR());
      commit(s, ['-m', 'feature work'], mkR());
      switchCmd(s, ['main'], mkR());
      s.files['c.txt'] = 'main-file';
      add(s, ['c.txt'], mkR());
      commit(s, ['-m', 'main work'], mkR());
      switchCmd(s, ['feature'], mkR());
      const r = mkR();
      rebase(s, ['main'], r);
      const doneEvent = r.eventos.find((e) => e.type === 'rebase-done');
      expect(doneEvent).toMatchObject({ type: 'rebase-done', count: 1 });
      expect(s.files['b.txt']).toBe('feature-file');
      expect(s.files['c.txt']).toBe('main-file');
      expect(s.op).toBeNull();
    });

    it('stops on conflict, and --continue after resolving finishes the rebase', () => {
      const s = rootRepo();
      switchCmd(s, ['-c', 'feature'], mkR());
      s.files['a.txt'] = 'feature-value';
      add(s, ['a.txt'], mkR());
      commit(s, ['-m', 'feature edit'], mkR());
      switchCmd(s, ['main'], mkR());
      s.files['a.txt'] = 'main-value';
      add(s, ['a.txt'], mkR());
      commit(s, ['-m', 'main edit'], mkR());
      switchCmd(s, ['feature'], mkR());
      const r = mkR();
      rebase(s, ['main'], r);
      expect(s.op?.kind).toBe('rebase');
      expect(r.eventos.some((e) => e.type === 'merge-conflict')).toBe(true);
      s.files['a.txt'] = 'resolved-value';
      add(s, ['a.txt'], mkR());
      const r2 = mkR();
      rebase(s, ['--continue'], r2);
      expect(s.op).toBeNull();
      expect(r2.eventos.some((e) => e.type === 'rebase-done')).toBe(true);
    });

    it('--abort restores the original branch position', () => {
      const s = rootRepo();
      switchCmd(s, ['-c', 'feature'], mkR());
      s.files['a.txt'] = 'feature-value';
      add(s, ['a.txt'], mkR());
      const featureCommitFiles = { ...s.files };
      commit(s, ['-m', 'feature edit'], mkR());
      const featureTip = s.branches.feature!;
      switchCmd(s, ['main'], mkR());
      s.files['a.txt'] = 'main-value';
      add(s, ['a.txt'], mkR());
      commit(s, ['-m', 'main edit'], mkR());
      switchCmd(s, ['feature'], mkR());
      rebase(s, ['main'], mkR());
      expect(s.op?.kind).toBe('rebase');
      const r = mkR();
      rebase(s, ['--abort'], r);
      expect(s.op).toBeNull();
      expect(s.branches.feature).toBe(featureTip);
      expect(s.files['a.txt']).toBe(featureCommitFiles['a.txt']);
    });
  });

  describe('cherry-pick', () => {
    it('applies a commit from another branch on top of HEAD', () => {
      const s = rootRepo();
      switchCmd(s, ['-c', 'feature'], mkR());
      s.files['b.txt'] = 'feature-file';
      add(s, ['b.txt'], mkR());
      commit(s, ['-m', 'feature work'], mkR());
      const pickHash = s.branches.feature!;
      switchCmd(s, ['main'], mkR());
      const r = mkR();
      cherryPick(s, [pickHash], r);
      expect(s.files['b.txt']).toBe('feature-file');
      expect(r.eventos[0]).toMatchObject({ type: 'cherry-picked', of: pickHash });
    });

    it('fails when the cherry-pick would be empty', () => {
      const s = rootRepo();
      const h = s.branches.main!;
      expect(() => cherryPick(s, [h], mkR())).toThrowError(GitError);
    });
  });

  describe('revert', () => {
    it('creates a commit that undoes the target commit', () => {
      const s = rootRepo();
      s.files['a.txt'] = 'v2';
      add(s, ['a.txt'], mkR());
      commit(s, ['-m', 'second'], mkR());
      const toRevert = s.branches.main!;
      const r = mkR();
      revert(s, [toRevert], r);
      expect(s.files['a.txt']).toBe('v1');
      expect(r.eventos[0]).toMatchObject({ type: 'reverted', of: toRevert });
    });
  });
});
