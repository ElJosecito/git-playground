// RED (tasks.md Phase 5 batch deviation: catalog skeleton, pulled forward
// from Phase 7 so the level player/map are demoable before the full
// curriculum exists). Generic solvability suite over WHATEVER levels exist
// in the catalog at any point — design.md Testing: "Node solvability
// suite, describe.each over the catalog: setup succeeds and the level is
// not solved after it; every solution step succeeds and the level is
// solved after; countsToward(solution) <= budget; ids unique; version >= 1;
// hosting flag iff a hosting step exists; hints >= 1."
import { describe, it, expect } from 'vitest';
import { levels } from '../index';
import { applySteps } from '../../../engine/lessons/steps';
import { evaluateLevel } from '../../../engine/lessons/evaluate';
import { computeBudget, countSteps } from '../../../engine/lessons/counting';
import { GitEngine } from '../../../engine';

describe('catalog solvability', () => {
  it('has at least one seed level', () => {
    expect(levels.length).toBeGreaterThan(0);
  });

  it('every level id is unique', () => {
    const ids = levels.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe.each(levels.map((l) => [l.id, l] as const))('%s', (_id, level) => {
    it('setup replayed from vacio() is not yet solved', () => {
      const seed = applySteps(GitEngine.vacio(), level.setup);
      expect(evaluateLevel(level, seed).solved).toBe(false);
    });

    it('the reference solution solves the level', () => {
      const seed = applySteps(GitEngine.vacio(), level.setup);
      const solved = applySteps(seed, level.solution);
      expect(evaluateLevel(level, solved).solved).toBe(true);
    });

    it('the solution\'s counted length fits within the derived budget', () => {
      expect(countSteps(level.solution)).toBeLessThanOrEqual(computeBudget(level));
    });

    it('version is >= 1', () => {
      expect(level.version).toBeGreaterThanOrEqual(1);
    });

    it('has at least one hint', () => {
      expect(level.hints.length).toBeGreaterThanOrEqual(1);
    });

    it('a solution containing a hosting action implies hosting: true (a level may also set it without one, e.g. to show an existing PR the goal is about)', () => {
      const hasHostingStep = level.solution.some((step) => typeof step !== 'string');
      if (hasHostingStep) expect(level.hosting).toBe(true);
    });
  });
});
