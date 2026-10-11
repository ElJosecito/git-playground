// Gated behind an explicit confirm step (design.md UI: "SolutionReveal
// (confirm)") since viewing the solution caps the attempt at 1 star
// (level-player spec "Viewing the solution counts as a hint used").
// `solutionShown` is owned by the caller's session state — once true,
// this skips straight to rendering the steps (e.g. after a restore).
//
// Redesign: the steps render as a terminal-window block (`$ git ...`).
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
      <div className={styles.window}>
        <div className={styles.titlebar} aria-hidden="true">
          <span className={styles.lights}>
            <span />
            <span />
            <span />
          </span>
          <span className={styles.titleText}>solución.sh</span>
        </div>
        <ol className={styles.steps} aria-label="Solución">
          {solution.map((step, i) => (
            <li key={i} className={typeof step === 'string' ? styles.cmd : styles.action}>
              <span className={styles.prompt} aria-hidden="true">
                {typeof step === 'string' ? '$' : '↳'}
              </span>
              <span>{describeStep(step)}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className={styles.confirmCard} role="group" aria-label="Confirmar ver solución">
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
      <span className={styles.triggerIcon} aria-hidden="true">
        &gt;_
      </span>
      <span>Ver solución</span>
    </button>
  );
}
