import { describe, it, expect } from 'vitest';
import { GitEngine } from '../../index';
import type { RepoState } from '../../types';
import {
  currentBranch,
  isDetached,
  branchExists,
  branchAt,
  commitCount,
  headMessage,
  fileTracked,
  fileStaged,
  fileContent,
  workingClean,
  hasConflict,
  opInProgress,
  isMerged,
  isLinear,
  tagAt,
  stashCount,
  remoteHasBranch,
  isPushed,
  upstreamOf,
  prWith,
} from '../predicates';

/** Replays `cmds` in order from `s`, throwing loudly on any rejected
 * command so a broken fixture fails fast instead of silently producing a
 * state the test didn't intend. */
function run(s: RepoState, ...cmds: string[]): RepoState {
  let cur = s;
  for (const cmd of cmds) {
    const res = GitEngine.ejecutar(cur, cmd);
    if (res.error) throw new Error(`fixture command failed: ${cmd} -> ${res.salida.join(' | ')}`);
    cur = res.estado;
  }
  return cur;
}

describe('level-engine predicates (pure, built on refs/hostingOf)', () => {
  it('currentBranch / isDetached reflect HEAD', () => {
    const s = run(GitEngine.vacio(), 'git init', 'touch a.txt', 'git add a.txt', 'git commit -m c1');
    expect(currentBranch(s)).toBe('main');
    expect(isDetached(s)).toBe(false);
    const head = GitEngine.headHash(s)!;
    const detached = run(s, `git checkout ${head}`);
    expect(isDetached(detached)).toBe(true);
    expect(currentBranch(detached)).toBeNull();
  });

  it('branchExists / branchAt', () => {
    const s = run(GitEngine.vacio(), 'git init', 'touch a.txt', 'git add a.txt', 'git commit -m c1', 'git switch -c feature');
    expect(branchExists(s, 'feature')).toBe(true);
    expect(branchExists(s, 'nope')).toBe(false);
    expect(branchAt(s, 'feature')).toBe(GitEngine.headHash(s));
    expect(branchAt(s, 'nope')).toBeNull();
  });

  it('commitCount counts ancestors of a branch tip (default: HEAD)', () => {
    const s = run(GitEngine.vacio(), 'git init', 'touch a.txt', 'git add a.txt', 'git commit -m c1', 'touch b.txt', 'git add b.txt', 'git commit -m c2');
    expect(commitCount(s)).toBe(2);
    expect(commitCount(s, 'main')).toBe(2);
    expect(commitCount(s, 'does-not-exist')).toBe(0);
  });

  it('headMessage reads the tip commit message of HEAD or a named branch', () => {
    const s = run(GitEngine.vacio(), 'git init', 'touch a.txt', 'git add a.txt', 'git commit -m "Primer commit"');
    expect(headMessage(s)).toBe('Primer commit');
    expect(headMessage(s, 'main')).toBe('Primer commit');
    expect(headMessage(s, 'nope')).toBeNull();
  });

  it('fileTracked is true only once a file is committed', () => {
    const vacioS = GitEngine.vacio();
    const inited = run(vacioS, 'git init', 'touch a.txt');
    expect(fileTracked(inited, 'a.txt')).toBe(false);
    const staged = run(inited, 'git add a.txt');
    expect(fileTracked(staged, 'a.txt')).toBe(false);
    const committed = run(staged, 'git commit -m c1');
    expect(fileTracked(committed, 'a.txt')).toBe(true);
  });

  it('fileStaged is true only while the index differs from HEAD for that file', () => {
    const s = run(GitEngine.vacio(), 'git init', 'touch a.txt', 'git add a.txt');
    expect(fileStaged(s, 'a.txt')).toBe(true);
    const committed = run(s, 'git commit -m c1');
    expect(fileStaged(committed, 'a.txt')).toBe(false);
    const restaged = run(committed, 'echo x > a.txt', 'git add a.txt');
    expect(fileStaged(restaged, 'a.txt')).toBe(true);
    const unstaged = run(restaged, 'git restore --staged a.txt');
    expect(fileStaged(unstaged, 'a.txt')).toBe(false);
  });

  it('fileContent reads the working-tree content', () => {
    const s = run(GitEngine.vacio(), 'git init', 'echo hola > a.txt');
    expect(fileContent(s, 'a.txt')).toBe('hola');
    expect(fileContent(s, 'missing.txt')).toBeUndefined();
  });

  it('workingClean reflects estadoArchivos (no staged/unstaged/conflicted changes)', () => {
    const clean = run(GitEngine.vacio(), 'git init', 'touch a.txt', 'git add a.txt', 'git commit -m c1');
    expect(workingClean(clean)).toBe(true);
    const dirty = run(clean, 'echo x > a.txt');
    expect(workingClean(dirty)).toBe(false);
  });

  it('hasConflict / opInProgress flip once a merge leaves a real conflict', () => {
    const base = run(
      GitEngine.vacio(),
      'git init',
      'touch a.txt',
      'echo base > a.txt',
      'git add a.txt',
      'git commit -m base',
      'git switch -c feature',
      'echo feature > a.txt',
      'git add a.txt',
      'git commit -m feature-change',
      'git switch main',
      'echo main > a.txt',
      'git add a.txt',
      'git commit -m main-change',
    );
    expect(opInProgress(base)).toBe(false);
    expect(hasConflict(base)).toBe(false);
    const conflicted = run(base, 'git merge feature');
    expect(opInProgress(conflicted)).toBe(true);
    expect(hasConflict(conflicted)).toBe(true);
  });

  it('isMerged is true once a branch tip is an ancestor of the target tip', () => {
    const s = run(
      GitEngine.vacio(),
      'git init',
      'touch a.txt',
      'git add a.txt',
      'git commit -m c1',
      'git switch -c feature',
      'touch b.txt',
      'git add b.txt',
      'git commit -m c2',
    );
    expect(isMerged(s, 'main', 'feature')).toBe(false);
    const merged = run(s, 'git switch main', 'git merge feature');
    expect(isMerged(merged, 'main', 'feature')).toBe(true);
  });

  it('isLinear is false once a merge commit lands in the branch history', () => {
    const s = run(
      GitEngine.vacio(),
      'git init',
      'touch a.txt',
      'git add a.txt',
      'git commit -m c1',
      'git switch -c feature',
      'touch b.txt',
      'git add b.txt',
      'git commit -m c2',
      'git switch main',
      'touch c.txt',
      'git add c.txt',
      'git commit -m c3',
    );
    expect(isLinear(s, 'main')).toBe(true);
    const merged = run(s, 'git merge feature -m "Merge feature"');
    expect(isLinear(merged, 'main')).toBe(false);
  });

  it('tagAt / stashCount', () => {
    const s = run(GitEngine.vacio(), 'git init', 'touch a.txt', 'git add a.txt', 'git commit -m c1', 'git tag v1.0');
    expect(tagAt(s, 'v1.0')).toBe(GitEngine.headHash(s));
    expect(tagAt(s, 'nope')).toBeNull();
    expect(stashCount(s)).toBe(0);
    const dirty = run(s, 'echo x > a.txt', 'git stash');
    expect(stashCount(dirty)).toBe(1);
  });

  it('remoteHasBranch / isPushed / upstreamOf track the remote and tracking maps', () => {
    const s = run(GitEngine.vacio(), 'git init', 'touch a.txt', 'git add a.txt', 'git commit -m c1');
    expect(remoteHasBranch(s, 'main')).toBe(false);
    expect(isPushed(s, 'main')).toBe(false);
    expect(upstreamOf(s, 'main')).toBeNull();
    const pushed = run(s, 'git push -u origin main');
    expect(remoteHasBranch(pushed, 'main')).toBe(true);
    expect(isPushed(pushed, 'main')).toBe(true);
    expect(upstreamOf(pushed, 'main')).toBe('main');
  });

  it('prWith finds a pull request by source/target (optionally filtered by status)', () => {
    const s = run(
      GitEngine.vacio(),
      'git init',
      'touch a.txt',
      'git add a.txt',
      'git commit -m c1',
      'git push -u origin main',
      'git switch -c feature',
      'touch b.txt',
      'git add b.txt',
      'git commit -m c2',
      'git push -u origin feature',
    );
    expect(prWith(s, 'feature', 'main')).toBeNull();
    const created = GitEngine.createPullRequest(s, { source: 'feature', target: 'main', title: 'Mi PR', body: '' }).estado;
    const pr = prWith(created, 'feature', 'main');
    expect(pr?.title).toBe('Mi PR');
    expect(prWith(created, 'feature', 'main', 'merged')).toBeNull();
    expect(prWith(created, 'feature', 'main', 'open')).toBe(pr);
  });
});
