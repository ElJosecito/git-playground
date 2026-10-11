import { describe, it, expect } from 'vitest';
import { GitEngine } from '../../index';
import { cl } from '../../util';
import type { RepoState } from '../../types';
import { applySteps, LevelStepError } from '../steps';
import type { Step } from '../types';

/** Deep-clones `s` with every commit's non-deterministic `t` (`Date.now()`
 * by default) zeroed out, so two independent replays of the same script
 * can be compared for equality without flaking on wall-clock timing
 * (design.md: "Commit t is Date.now(), so predicates must never read t." —
 * the same non-determinism applies to whole-state equality checks). */
function stripT(s: RepoState): RepoState {
  const copy = cl(s);
  for (const h in copy.commits) copy.commits[h]!.t = 0;
  return copy;
}

describe('applySteps (deterministic setup/solution replay through the real engine)', () => {
  it('replays a plain command script from vacio(), mutating nothing but the returned state', () => {
    const steps: Step[] = ['git init', 'touch a.txt', 'echo hola > a.txt', 'git add a.txt', 'git commit -m "Primer commit"'];
    const result = applySteps(GitEngine.vacio(), steps);
    expect(result.inited).toBe(true);
    expect(GitEngine.headHash(result)).not.toBeNull();
    expect(result.files['a.txt']).toBe('hola');
  });

  it('two independent replays of the same script are identical once t is ignored', () => {
    const steps: Step[] = ['git init', 'touch a.txt', 'echo hola > a.txt', 'git add a.txt', 'git commit -m "Primer commit"'];
    const a = stripT(applySteps(GitEngine.vacio(), steps));
    const b = stripT(applySteps(GitEngine.vacio(), steps));
    expect(a).toEqual(b);
  });

  it('applies a HostingAction step by dispatching the matching GitEngine.*PullRequest call', () => {
    const steps: Step[] = [
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
      { pr: 'create', input: { source: 'feature', target: 'main', title: 'Mi PR', body: '' } },
    ];
    const result = applySteps(GitEngine.vacio(), steps);
    const prs = GitEngine.listPullRequests(result);
    expect(prs).toHaveLength(1);
    expect(prs[0]!.title).toBe('Mi PR');
  });

  it('throws LevelStepError (not the raw engine error) when a command step is rejected', () => {
    const steps: Step[] = ['git init', 'git status']; // fine
    expect(() => applySteps(GitEngine.vacio(), steps)).not.toThrow();

    const bad: Step[] = ['git commit -m "nothing to commit"']; // fails: not even inited
    expect(() => applySteps(GitEngine.vacio(), bad)).toThrow(LevelStepError);
  });

  it('throws LevelStepError when a step opens the editor (cannot be replayed headlessly)', () => {
    const steps: Step[] = ['git init', 'touch a.txt', 'edit a.txt'];
    expect(() => applySteps(GitEngine.vacio(), steps)).toThrow(LevelStepError);
  });

  it('throws LevelStepError when a HostingAction step is rejected', () => {
    const steps: Step[] = ['git init', { pr: 'create', input: { source: 'feature', target: 'main', title: 'x', body: '' } }];
    expect(() => applySteps(GitEngine.vacio(), steps)).toThrow(LevelStepError);
  });

  it('LevelStepError carries the failing step and the engine salida lines', () => {
    const bad: Step[] = ['git commit -m "nothing to commit"'];
    try {
      applySteps(GitEngine.vacio(), bad);
      throw new Error('expected applySteps to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(LevelStepError);
      const err = e as LevelStepError;
      expect(err.step).toBe('git commit -m "nothing to commit"');
      expect(err.lines.length).toBeGreaterThan(0);
    }
  });
});
