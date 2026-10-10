import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkR } from '../../recorder';
import { vacio } from '../../state';
import { GitError } from '../../errors';
import { init, add, commit } from '../basics';
import { remote, push, fetch, pull } from '../remote';
import { companero } from '../../run';
import type { RepoState } from '../../types';

function rootRepo(): RepoState {
  const s = vacio();
  init(s, [], mkR());
  s.files['a.txt'] = 'v1';
  add(s, ['a.txt'], mkR());
  commit(s, ['-m', 'root'], mkR());
  return s;
}

describe('commands/remote (remote/push/fetch/pull) + companero', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 9, 6, 9, 12));
  });
  afterEach(() => vi.useRealTimers());

  describe('remote', () => {
    it('reports the fixed "origin" remote with -v', () => {
      const r = mkR();
      remote(vacio(), ['-v'], r);
      expect(r.salida.join('\n')).toContain('origin');
    });

    it('rejects adding/removing remotes (the simulator has one fixed origin)', () => {
      expect(() => remote(vacio(), ['add', 'upstream', 'url'], mkR())).toThrowError(GitError);
    });
  });

  describe('push', () => {
    it('pushes a new branch and sets upstream with -u', () => {
      const s = rootRepo();
      const r = mkR();
      push(s, ['-u', 'origin', 'main'], r);
      expect(s.remote.branches.main).toBe(s.branches.main);
      expect(s.upstream.main).toBe('main');
      expect(r.eventos.some((e) => e.type === 'push-sent')).toBe(true);
    });

    it('fails without an upstream when no remote/branch is given', () => {
      const s = rootRepo();
      expect(() => push(s, [], mkR())).toThrowError(GitError);
    });

    it('rejects a push when the remote has diverged, without -f', () => {
      const s = rootRepo();
      push(s, ['-u', 'origin', 'main'], mkR());
      // Teammate commits to origin/main without us fetching it...
      const afterCompanero = companero(s).estado;
      // ...and we commit locally on top of our (now stale) view of main.
      afterCompanero.files['b.txt'] = 'local-work';
      add(afterCompanero, ['b.txt'], mkR());
      commit(afterCompanero, ['-m', 'local work'], mkR());
      expect(() => push(afterCompanero, ['origin', 'main'], mkR())).toThrowError(GitError);
    });

    it('accepts a diverged push with -f (force)', () => {
      const s = rootRepo();
      push(s, ['-u', 'origin', 'main'], mkR());
      const afterCompanero = companero(s).estado;
      afterCompanero.files['b.txt'] = 'local-work';
      add(afterCompanero, ['b.txt'], mkR());
      commit(afterCompanero, ['-m', 'local work'], mkR());
      const r = mkR();
      push(afterCompanero, ['-f', 'origin', 'main'], r);
      expect(afterCompanero.remote.branches.main).toBe(afterCompanero.branches.main);
    });
  });

  describe('fetch', () => {
    it('pulls remote commits in as local=false until fetched, then marks them local', () => {
      const s = rootRepo();
      push(s, ['-u', 'origin', 'main'], mkR());
      const afterCompanero = companero(s).estado;
      const r = mkR();
      fetch(afterCompanero, [], r);
      expect(r.eventos.some((e) => e.type === 'fetch-received')).toBe(true);
    });

    it('reports nothing new when already up to date', () => {
      const s = rootRepo();
      push(s, ['-u', 'origin', 'main'], mkR());
      const r = mkR();
      fetch(s, [], r);
      expect(r.salida.join('\n')).toContain('Nada nuevo en origin');
    });
  });

  describe('pull', () => {
    it('fetches and merges by default', () => {
      const s = rootRepo();
      push(s, ['-u', 'origin', 'main'], mkR());
      const afterCompanero = companero(s).estado;
      const r = mkR();
      pull(afterCompanero, [], r);
      expect(r.eventos.some((e) => e.type === 'pull-done')).toBe(true);
    });

    it('fails when the current branch has no upstream tracking info', () => {
      const s = rootRepo();
      expect(() => pull(s, [], mkR())).toThrowError(GitError);
    });
  });

  describe('companero', () => {
    it('creates a commit on the remote branch and emits remote-commit', () => {
      const s = rootRepo();
      push(s, ['-u', 'origin', 'main'], mkR());
      const result = companero(s);
      expect(result.eventos).toEqual([{ type: 'remote-commit', hash: expect.any(String), branch: 'main' }]);
      expect(result.estado.remote.branches.main).not.toBe(s.remote.branches.main);
    });

    it('reports an error result (not a thrown exception) when origin has no branches yet', () => {
      const result = companero(vacio());
      expect(result.error).toBe(true);
      expect(result.eventos).toEqual([{ type: 'error' }]);
    });
  });
});
