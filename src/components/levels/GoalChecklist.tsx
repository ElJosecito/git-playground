// GREEN (tasks.md Phase 5, 5.2). Re-rendered from `evaluateLevel`'s derived
// result on every relevant render (level-engine spec "Checklist
// re-evaluates after a command") — this component itself is a pure leaf,
// it owns no state. `aria-live="polite"` on the list lets a screen reader
// announce a goal flipping to done without a separate `LiveRegion` wire-up
// (design.md UI: "GoalChecklist (data-done pop, live announce, can
// regress)" — "can regress" is automatic: the list always reflects
// whatever `goals` it's given, including a goal flipping back to false).
import styles from './GoalChecklist.module.css';

export interface GoalChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface GoalChecklistProps {
  goals: GoalChecklistItem[];
}

export function GoalChecklist({ goals }: GoalChecklistProps) {
  return (
    <ul className={styles.list} aria-live="polite" aria-label="Lista de objetivos">
      {goals.map((goal) => (
        <li key={goal.id} data-done={goal.done} className={goal.done ? styles.done : styles.pending}>
          <span aria-hidden="true" className={styles.mark}>
            {goal.done ? '✓' : '○'}
          </span>
          {goal.label}
        </li>
      ))}
    </ul>
  );
}
