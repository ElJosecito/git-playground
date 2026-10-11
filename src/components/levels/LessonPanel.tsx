// The lesson panel (design.md UI: "LessonPanel: breadcrumb, h1, objective,
// Teoría <details>, GoalChecklist ..., BudgetMeter, HintList ...,
// SolutionReveal ..., Reiniciar nivel, Volver al mapa."). Every bit of
// level state (`evaluation`, `count`, `hintsUsed`, `solutionShown`) is
// owned and derived by `LevelShell`; the only local state is the mobile
// sheet's expanded/collapsed toggle (pure presentation).
//
// Redesign: a card stack in the landing's language — world-colored header
// with a commit-style eyebrow (short hash + world pill + "Nivel n de m"),
// bold title, objective; then Teoría / Objetivos / Acciones / Pistas /
// Solución cards and styled footer actions. On phones the panel is a
// collapsible card pinned at the top (the terminal owns the bottom).
import { useId, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Evaluation, LevelDef } from '../../engine/lessons/types';
import { accentFor } from '../landing/colors';
import { GoalChecklist } from './GoalChecklist';
import { BudgetMeter } from './BudgetMeter';
import { HintList } from './HintList';
import { SolutionReveal } from './SolutionReveal';
import { shortHash } from './mapModel';
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
  /** The level's world name (eyebrow pill). */
  worldName?: string;
  /** How many levels the level's world has ("Nivel n de m"). */
  levelCount?: number;
}

export function LessonPanel({
  level,
  evaluation,
  budget,
  count,
  hintsUsed,
  solutionShown,
  onRevealHint,
  onShowSolution,
  onReset,
  mapHref,
  worldName,
  levelCount,
}: LessonPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();
  const goalsDone = evaluation.goals.filter((g) => g.done).length;

  return (
    <section
      className={styles.root}
      aria-label="Panel de la lección"
      data-expanded={expanded}
      style={{ '--accent': accentFor(level.world - 1) } as CSSProperties}
    >
      <span className={styles.glow} aria-hidden="true" />
      <header className={styles.header}>
        <div className={styles.topRow}>
          <nav className={styles.breadcrumb} aria-label="Ruta">
            <a href={mapHref}>Niveles</a>
            <span aria-hidden="true">/</span>
            <span>Mundo {level.world}</span>
          </nav>
          <span className={styles.miniProgress} aria-hidden="true">
            {goalsDone}/{evaluation.goals.length}
          </span>
          <button
            type="button"
            className={styles.sheetToggle}
            aria-expanded={expanded}
            aria-controls={bodyId}
            aria-label={expanded ? 'Ocultar la lección' : 'Mostrar la lección'}
            onClick={() => setExpanded((v) => !v)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>
        </div>

        <p className={styles.eyebrow}>
          <span className={styles.eyebrowNode} aria-hidden="true" />
          <code className={styles.hash}>{shortHash(level.id)}</code>
          {worldName && <span className={styles.tag}>{worldName}</span>}
          <span className={styles.message}>{levelCount ? `Nivel ${level.order} de ${levelCount}` : `Nivel ${level.order}`}</span>
        </p>
        <h1 data-route-focus tabIndex={-1} className={styles.title}>
          {level.title}
        </h1>
        <p className={styles.objective}>{level.objective}</p>
      </header>

      <div className={styles.body} id={bodyId}>
        {level.theory.length > 0 && (
          <details className={`${styles.card} ${styles.theory}`}>
            <summary className={styles.theorySummary}>
              <span className={styles.theoryIcon} aria-hidden="true">
                {'{ }'}
              </span>
              <span className={styles.theoryLabel}>Teoría</span>
              <span className={styles.chev} aria-hidden="true">
                <svg viewBox="0 0 16 16">
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </span>
            </summary>
            <div className={styles.theoryBody}>
              {level.theory.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </details>
        )}

        <div className={styles.card}>
          <GoalChecklist goals={evaluation.goals} />
        </div>

        <div className={styles.card}>
          <BudgetMeter count={count} budget={budget} hintsUsed={hintsUsed > 0 || solutionShown} />
        </div>

        <div className={styles.card}>
          <HintList hints={level.hints} hintsUsed={hintsUsed} onRevealHint={onRevealHint} />
        </div>

        <div className={styles.solution}>
          <SolutionReveal solutionShown={solutionShown} solution={level.solution} onShowSolution={onShowSolution} />
        </div>

        <div className={styles.footer}>
          <button type="button" onClick={onReset} className={styles.resetButton}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 8a5 5 0 1 0 1.6-3.7M3 3v3h3" />
            </svg>
            <span>Reiniciar nivel</span>
          </button>
          <a href={mapHref} className={styles.mapLink}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 4L6 8l4 4" />
            </svg>
            <span>Volver al mapa</span>
          </a>
        </div>
      </div>
    </section>
  );
}
