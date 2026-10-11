import { describe, it, expect } from 'vitest';
import { GitEngine } from '../../index';
import { evaluateLevel } from '../evaluate';
import { applySteps } from '../steps';
import type { LevelDef } from '../types';

function mkLevel(overrides: Partial<LevelDef> = {}): LevelDef {
  return {
    id: 'test-level',
    world: 1,
    order: 1,
    version: 1,
    title: 'Nivel de prueba',
    objective: 'Haz un commit',
    theory: [],
    setup: [],
    solution: ['git init', 'touch a.txt', 'git add a.txt', 'git commit -m "Primer commit"'],
    goals: [
      { id: 'inited', label: 'Repo inicializado', check: (s) => s.inited },
      { id: 'committed', label: 'Hay al menos un commit', check: (s) => GitEngine.headHash(s) !== null },
    ],
    hints: [],
    ...overrides,
  };
}

describe('evaluateLevel (derived, pure checklist evaluation)', () => {
  it('reports every goal as not done and solved:false on the fresh setup state', () => {
    const level = mkLevel();
    const estado = applySteps(GitEngine.vacio(), level.setup);
    const evaluation = evaluateLevel(level, estado);
    expect(evaluation.solved).toBe(false);
    expect(evaluation.goals).toEqual([
      { id: 'inited', label: 'Repo inicializado', done: false },
      { id: 'committed', label: 'Hay al menos un commit', done: false },
    ]);
  });

  it('reports every goal done and solved:true once the solution is replayed', () => {
    const level = mkLevel();
    const estado = applySteps(GitEngine.vacio(), level.solution);
    const evaluation = evaluateLevel(level, estado);
    expect(evaluation.solved).toBe(true);
    expect(evaluation.goals.every((g) => g.done)).toBe(true);
  });

  it('re-evaluates independently after a partial step (one goal done, one not)', () => {
    const level = mkLevel();
    const estado = applySteps(GitEngine.vacio(), ['git init']);
    const evaluation = evaluateLevel(level, estado);
    expect(evaluation.solved).toBe(false);
    expect(evaluation.goals).toEqual([
      { id: 'inited', label: 'Repo inicializado', done: true },
      { id: 'committed', label: 'Hay al menos un commit', done: false },
    ]);
  });

  it('a level with zero goals is trivially solved', () => {
    const level = mkLevel({ goals: [] });
    const evaluation = evaluateLevel(level, GitEngine.vacio());
    expect(evaluation).toEqual({ goals: [], solved: true });
  });
});
