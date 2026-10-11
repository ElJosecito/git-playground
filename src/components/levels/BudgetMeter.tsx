// GREEN (tasks.md Phase 5, 5.2). A pure leaf — `count`/`budget` are already
// derived by `LevelShell` (`useLevelSession`'s `session.count` and
// `computeBudget(level)`), this component only renders them (level-player
// spec "Command Budget Counter": "The player MUST display a live count
// against the level's budget").
import styles from './BudgetMeter.module.css';

export interface BudgetMeterProps {
  count: number;
  budget: number;
}

export function BudgetMeter({ count, budget }: BudgetMeterProps) {
  const over = count > budget;
  return (
    <div className={styles.root} role="status" aria-label="Acciones usadas sobre el presupuesto del nivel">
      <span className={styles.label}>Acciones</span>
      <span data-over-budget={over} className={over ? styles.over : styles.count}>
        {count} / {budget}
      </span>
    </div>
  );
}
