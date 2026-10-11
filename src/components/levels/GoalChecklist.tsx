// Re-rendered from `evaluateLevel`'s derived result on every relevant
// render (level-engine spec "Checklist re-evaluates after a command") —
// a pure leaf that owns no state. `aria-live="polite"` on the list lets a
// screen reader announce a goal flipping to done (design.md UI:
// "GoalChecklist (data-done pop, live announce, can regress)").
//
// Redesign: each goal is a commit dot that fills with the world's color
// (with a pop + glow) when done; a header shows "x/y" and a meter fills.
import type { CSSProperties } from 'react';
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
  const done = goals.filter((g) => g.done).length;
  const pct = goals.length ? (done / goals.length) * 100 : 0;
  return (
    <div className={styles.root} data-complete={goals.length > 0 && done === goals.length}>
      <div className={styles.head}>
        <span className={styles.label}>Objetivos</span>
        <span className={styles.count} role="img" aria-label={`${done} de ${goals.length} objetivos completados`}>
          <span aria-hidden="true">
            {done}
            <span className={styles.countMax}>/{goals.length}</span>
          </span>
        </span>
      </div>
      <span className={styles.meter} aria-hidden="true" style={{ '--pct': `${pct}%` } as CSSProperties}>
        <span className={styles.meterFill} />
      </span>
      <ul className={styles.list} aria-live="polite" aria-label="Lista de objetivos">
        {goals.map((goal) => (
          <li key={goal.id} data-done={goal.done} className={goal.done ? styles.done : styles.pending}>
            <span aria-hidden="true" className={styles.mark}>
              <svg viewBox="0 0 16 16">
                <path d="M4 8.4l2.6 2.6L12 5.4" />
              </svg>
            </span>
            <span className={styles.text}>{goal.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
