// GREEN (tasks.md Phase 5, 5.2). Gated behind an explicit confirm step
// (design.md UI: "SolutionReveal (confirm)") since viewing the solution
// caps the attempt at 1 star (level-player spec "Viewing the solution
// counts as a hint used"). `solutionShown` is owned by the caller's
// session state — once true, this component skips straight to rendering
// the steps, with no further confirm (e.g. after a snapshot restore).
import { useState } from 'react';
import type { Step } from '../../engine/lessons/types';
import styles from './SolutionReveal.module.css';

export interface SolutionRevealProps {
  solutionShown: boolean;
  solution: Step[];
  onShowSolution(): void;
}

function describeStep(step: Step): string {
  if (typeof step === 'string') return step;
  switch (step.pr) {
    case 'create':
      return `Pull request: crear ${step.input.source} → ${step.input.target} ("${step.input.title}")`;
    case 'comment':
      return `Pull request: comentar en #${step.id}`;
    case 'close':
      return `Pull request: cerrar #${step.id}`;
    case 'reopen':
      return `Pull request: reabrir #${step.id}`;
    case 'merge':
      return `Pull request: fusionar #${step.id} (${step.strategy})`;
  }
}

export function SolutionReveal({ solutionShown, solution, onShowSolution }: SolutionRevealProps) {
  const [confirming, setConfirming] = useState(false);

  if (solutionShown) {
    return (
      <div className={styles.root}>
        <ol className={styles.steps}>
          {solution.map((step, i) => (
            <li key={i}>{describeStep(step)}</li>
          ))}
        </ol>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className={styles.root}>
        <p className={styles.confirmText}>¿Seguro? Ver la solución cuenta como una pista y limita esta ronda a 1 estrella.</p>
        <div className={styles.confirmActions}>
          <button type="button" className={styles.cancel} onClick={() => setConfirming(false)}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.confirm}
            onClick={() => {
              setConfirming(false);
              onShowSolution();
            }}
          >
            Ver de todas formas
          </button>
        </div>
      </div>
    );
  }

  return (
    <button type="button" className={styles.trigger} onClick={() => setConfirming(true)}>
      Ver solución
    </button>
  );
}
