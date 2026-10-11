// GREEN (tasks.md Phase 5, 5.2): the lesson panel (design.md UI:
// "LessonPanel: breadcrumb, h1, objective, Teoría <details>, GoalChecklist
// ..., BudgetMeter, HintList ..., SolutionReveal ..., Reiniciar nivel,
// Volver al mapa."). A pure leaf — every bit of state (`evaluation`,
// `count`, `hintsUsed`, `solutionShown`) is owned and derived by
// `LevelShell`.
import type { Evaluation, LevelDef } from '../../engine/lessons/types';
import { GoalChecklist } from './GoalChecklist';
import { BudgetMeter } from './BudgetMeter';
import { HintList } from './HintList';
import { SolutionReveal } from './SolutionReveal';
import styles from './LessonPanel.module.css';

export interface LessonPanelProps {
  level: LevelDef;
  evaluation: Evaluation;
  budget: number;
  count: number;
  hintsUsed: number;
  solutionShown: boolean;
  onRevealHint(): void;
  onShowSolution(): void;
  onReset(): void;
  mapHref: string;
}

export function LessonPanel({ level, evaluation, budget, count, hintsUsed, solutionShown, onRevealHint, onShowSolution, onReset, mapHref }: LessonPanelProps) {
  return (
    <section className={styles.root} aria-label="Panel de la lección">
      <nav className={styles.breadcrumb} aria-label="Ruta">
        <a href={mapHref}>Niveles</a> <span aria-hidden="true">/</span> {level.title}
      </nav>
      <h1 data-route-focus tabIndex={-1} className={styles.title}>
        {level.title}
      </h1>
      <p className={styles.objective}>{level.objective}</p>

      {level.theory.length > 0 && (
        <details className={styles.theory}>
          <summary>Teoría</summary>
          <div className={styles.theoryBody}>
            {level.theory.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </details>
      )}

      <div className={styles.section}>
        <GoalChecklist goals={evaluation.goals} />
      </div>

      <div className={styles.section}>
        <BudgetMeter count={count} budget={budget} />
      </div>

      <div className={styles.section}>
        <HintList hints={level.hints} hintsUsed={hintsUsed} onRevealHint={onRevealHint} />
      </div>

      <div className={styles.section}>
        <SolutionReveal solutionShown={solutionShown} solution={level.solution} onShowSolution={onShowSolution} />
      </div>

      <div className={styles.footer}>
        <button type="button" onClick={onReset} className={styles.resetButton}>
          Reiniciar nivel
        </button>
        <a href={mapHref} className={styles.mapLink}>
          Volver al mapa
        </a>
      </div>
    </section>
  );
}
