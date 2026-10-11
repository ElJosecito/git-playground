// A pure leaf — `count`/`budget` are derived by `LevelShell`
// (`useLevelSession`'s `session.count` and `computeBudget(level)`); this
// only renders them (level-player spec "Command Budget Counter": "The
// player MUST display a live count against the level's budget").
//
// Redesign: a segmented meter (one cell per budgeted action, overflow
// cells in warning color) plus the star projection, computed with the
// SAME `computeStars` rule the completion uses (so the projection can
// never disagree with the real result).
import { computeStars } from '../../lessons/progress/stars';
import styles from './BudgetMeter.module.css';

export interface BudgetMeterProps {
  count: number;
  budget: number;
  /** A hint or the solution was used this attempt (caps stars at 1). */
  hintsUsed?: boolean;
}

const MAX_CELLS = 24;

const CAPTION: Record<1 | 2 | 3, string> = {
  3: 'Dentro del presupuesto',
  2: 'Te pasaste del presupuesto',
  1: 'Usaste ayuda en esta ronda',
};

export function BudgetMeter({ count, budget, hintsUsed = false }: BudgetMeterProps) {
  const over = count > budget;
  const projected = computeStars({ hintsUsed, count, budget });
  const segmented = budget > 0 && budget <= MAX_CELLS;
  const overflow = Math.min(Math.max(0, count - budget), MAX_CELLS - Math.min(budget, MAX_CELLS));
  return (
    <div className={styles.root} role="status" aria-label="Acciones usadas sobre el presupuesto del nivel" data-over={over}>
      <div className={styles.head}>
        <span className={styles.label}>Acciones</span>
        <span data-over-budget={over} className={over ? styles.over : styles.count}>
          {count} / {budget}
        </span>
      </div>

      <div
        className={styles.meter}
        role="meter"
        aria-label="Acciones usadas"
        aria-valuemin={0}
        aria-valuemax={budget}
        aria-valuenow={Math.min(count, budget)}
        aria-valuetext={`${count} de ${budget} acciones`}
      >
        {segmented ? (
          <>
            {Array.from({ length: budget }, (_, i) => (
              <span key={i} className={styles.cell} data-used={i < count || undefined} />
            ))}
            {Array.from({ length: overflow }, (_, i) => (
              <span key={`o${i}`} className={`${styles.cell} ${styles.cellOver}`} />
            ))}
          </>
        ) : (
          <span className={styles.bar}>
            <span className={styles.barFill} style={{ width: `${budget > 0 ? Math.min(100, (count / budget) * 100) : 100}%` }} />
          </span>
        )}
      </div>

      <div className={styles.projection} data-stars={projected}>
        <span className={styles.projStars} role="img" aria-label={`Proyección: ${projected} ${projected === 1 ? 'estrella' : 'estrellas'}`}>
          {([1, 2, 3] as const).map((n) => (
            <span key={n} aria-hidden="true" className={n <= projected ? styles.starOn : styles.starOff}>
              ★
            </span>
          ))}
        </span>
        <span className={styles.caption}>{CAPTION[projected]}</span>
      </div>
    </div>
  );
}
