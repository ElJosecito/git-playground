import { describe, it, expect } from 'vitest';
import { vacio, ensureColor } from '../state';
import { explicar } from '../explain';
import type { RepoState } from '../types';

function withBranch(name = 'main'): RepoState {
  const s = vacio();
  ensureColor(s, name);
  return s;
}

describe('explain (explicar, ported from git-engine.js)', () => {
  it('returns null for an error event', () => {
    expect(explicar([{ type: 'error' }], withBranch())).toBeNull();
  });

  it('explains a merge-conflict with file list and the right continuation hint per op kind', () => {
    const r = explicar([{ type: 'merge-conflict', files: ['a.txt', 'b.txt'], kind: 'merge' }], withBranch());
    expect(r).toMatchObject({ icon: '!', tone: 'danger' });
    expect(r!.text).toContain('a.txt');
    expect(r!.text).toContain('git commit');
  });

  it('explains rebase-done with the commit count', () => {
    const r = explicar([{ type: 'rebase-done', count: 2, branch: 'feature', onto: 'main' }], withBranch());
    expect(r!.text).toContain('2 commits se copiaron');
  });

  it('explains a pull that merged in new commits', () => {
    const r = explicar(
      [
        { type: 'pull-done', branch: 'main' },
        { type: 'merge-commit', hash: 'h1', theirs: 'origin/main', into: 'main' },
      ],
      withBranch(),
    );
    expect(r!.text).toContain('Trajiste los cambios de origin');
  });

  it('explains a pull that was already up to date', () => {
    const r = explicar([{ type: 'pull-done', branch: 'main' }, { type: 'up-to-date' }], withBranch());
    expect(r!.text).toContain('ya tenía todo lo de origin');
  });

  it('explains a fast-forward merge', () => {
    const r = explicar([{ type: 'fast-forward', ref: 'main', theirs: 'feature', from: 'h0', to: 'h1' }], withBranch());
    expect(r).toMatchObject({ icon: '→', tone: 'success' });
    expect(r!.text).toContain('fast-forward');
  });

  it('explains a root commit vs a branch commit vs a detached commit', () => {
    const root = explicar([{ type: 'commit-created', hash: 'h1', files: [], branch: 'main', root: true }], withBranch());
    expect(root!.text).toContain('Primer commit');

    const onBranch = explicar([{ type: 'commit-created', hash: 'h1', files: [], branch: 'main', root: false }], withBranch());
    expect(onBranch!.text).toContain('main');

    const detached = explicar([{ type: 'commit-created', hash: 'h1', files: [], branch: null, root: false }], withBranch());
    expect(detached!.text).toContain('HEAD separado');
  });

  it('explains reset modes with their effect on staged/working changes', () => {
    const soft = explicar([{ type: 'reset', mode: 'soft', from: 'h0', to: 'h1', count: 2, ref: 'HEAD~2', aborted: null }], withBranch());
    expect(soft!.text).toContain('siguen preparados en staging');

    const hardNoCount = explicar([{ type: 'reset', mode: 'hard', from: 'h0', to: 'h0', count: 0, ref: 'HEAD', aborted: null }], withBranch());
    expect(hardNoCount!.tone).toBe('warning');
    expect(hardNoCount!.text).toContain('Descartaste todos los cambios');
  });

  it('explains stash push/pop', () => {
    const push = explicar([{ type: 'stash-pushed', files: ['a.txt'] }], withBranch());
    expect(push!.text).toContain('1 cambio');

    const pop = explicar([{ type: 'stash-popped', files: ['a.txt'], drop: true }], withBranch());
    expect(pop!.text).toContain('Recuperaste');
  });

  it('explains branch lifecycle events', () => {
    const created = explicar([{ type: 'branch-created', name: 'feature' }], withBranch());
    expect(created!.text).toContain('feature');

    const deleted = explicar([{ type: 'branch-deleted', name: 'feature' }], withBranch());
    expect(deleted!.text).toContain('feature');

    const detached = explicar([{ type: 'detached', hash: 'h1' }], withBranch());
    expect(detached!.tone).toBe('warning');
  });

  it('explains file-staged for a single vs multiple files', () => {
    const single = explicar([{ type: 'file-staged', file: 'a.txt' }], withBranch());
    expect(single!.text).toContain('a.txt');

    const multi = explicar(
      [
        { type: 'file-staged', file: 'a.txt' },
        { type: 'file-staged', file: 'b.txt' },
      ],
      withBranch(),
    );
    expect(multi!.text).toContain('2 archivos');
  });

  it('explains a plain file-modified event when nothing else matches', () => {
    const r = explicar([{ type: 'file-modified', file: 'a.txt' }], withBranch());
    expect(r!.text).toContain('a.txt');
  });

  it('returns null when no event in the list matches any known explanation', () => {
    expect(explicar([{ type: 'head-moved', from: null, to: null }], withBranch())).toBeNull();
  });

  it('repo-init explanation', () => {
    const r = explicar([{ type: 'repo-init' }], withBranch());
    expect(r!.text).toContain('Creaste un repositorio vacío');
  });
});
