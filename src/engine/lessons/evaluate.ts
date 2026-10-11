// Derived, pure checklist evaluation (design.md: "The checklist is derived
// render state (useMemo evaluateLevel)." / Contracts: "Evaluation =
// {goals[{id, label, done}], solved}"). Calling this is cheap and has no
// side effects — callers (the level player, Phase 5) re-run it on every
// relevant render instead of wiring it into the command-apply pipeline.
import type { RepoState } from '../types';
import type { Evaluation, LevelDef } from './types';

export function evaluateLevel(level: LevelDef, estado: RepoState): Evaluation {
  const goals = level.goals.map((goal) => ({ id: goal.id, label: goal.label, done: goal.check(estado) }));
  return { goals, solved: goals.every((g) => g.done) };
}
