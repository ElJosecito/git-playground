// Deterministic setup/solution replay through the REAL engine (level-engine
// spec "Deterministic Setup Replay": "A level's starting RepoState MUST be
// produced by replaying setupScript through GitEngine.ejecutar starting
// from vacio()."). Never hand-builds a `RepoState`. `src/engine/commands/*`
// and `design-handoff/git-engine.js` are never modified by this module —
// it only calls the existing `GitEngine` facade.
import { GitEngine } from '../index';
import type { CommandResult, RepoState } from '../types';
import type { HostingAction, Step } from './types';

/** Thrown by `applySteps` when a step is rejected by the engine, or when a
 * step would need the editor (unreplayable headlessly) — design.md:
 * "applySteps throws LevelStepError on error or editar." Carries the
 * failing step and the engine's own `salida` lines for diagnostics (e.g. a
 * curriculum author's solvability test failure message). Extends `Error`
 * (unlike the engine's own `GitError`, which deliberately doesn't — this
 * is new behavior with no oracle quirk to preserve). */
export class LevelStepError extends Error {
  readonly step: Step;
  readonly lines: string[];

  constructor(step: Step, lines: string[]) {
    super(`Level step failed: ${typeof step === 'string' ? step : `hosting:${step.pr}`}`);
    this.name = 'LevelStepError';
    this.step = step;
    this.lines = lines;
  }
}

function applyHostingStep(estado: RepoState, action: HostingAction): CommandResult {
  switch (action.pr) {
    case 'create':
      return GitEngine.createPullRequest(estado, action.input);
    case 'comment':
      return GitEngine.commentPullRequest(estado, action.id, action.body);
    case 'close':
      return GitEngine.closePullRequest(estado, action.id);
    case 'reopen':
      return GitEngine.reopenPullRequest(estado, action.id);
    case 'merge':
      return GitEngine.mergePullRequest(estado, action.id, action.strategy, action.deleteBranch);
  }
}

/** Replays `steps` in order from `estado`, returning the resulting
 * `RepoState`. Throws `LevelStepError` on the first rejected step, or on a
 * step that opens the editor (`accion.tipo === 'editar'`) instead of
 * applying directly. */
export function applySteps(estado: RepoState, steps: readonly Step[]): RepoState {
  let current = estado;
  for (const step of steps) {
    const res = typeof step === 'string' ? GitEngine.ejecutar(current, step) : applyHostingStep(current, step);
    if (res.error) throw new LevelStepError(step, res.salida);
    if (res.accion && res.accion.tipo === 'editar') throw new LevelStepError(step, res.salida);
    current = res.estado;
  }
  return current;
}
