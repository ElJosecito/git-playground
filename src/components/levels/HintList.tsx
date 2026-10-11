// GREEN (tasks.md Phase 5, 5.2). `hints`/`hintsUsed` are the level's full
// (static) hint texts and the session's current reveal count — this
// component only renders the REVEALED prefix (level-player spec
// "Progressive Hints and Solution Reveal": "Hints MUST reveal one at a
// time on explicit request, in order") and the 1-star warning (design.md
// UI: "HintList (1-star warning)").
import styles from './HintList.module.css';

export interface HintListProps {
  hints: string[];
  hintsUsed: number;
  onRevealHint(): void;
}

export function HintList({ hints, hintsUsed, onRevealHint }: HintListProps) {
  const revealed = hints.slice(0, hintsUsed);
  const hasMore = hintsUsed < hints.length;

  return (
    <div className={styles.root}>
      <p className={styles.warning}>Usar una pista limita esta ronda a 1 estrella, aunque termines dentro del presupuesto.</p>
      {revealed.length > 0 && (
        <ol className={styles.list}>
          {revealed.map((hint, i) => (
            <li key={i}>{hint}</li>
          ))}
        </ol>
      )}
      {hasMore && (
        <button type="button" onClick={onRevealHint} className={styles.reveal}>
          {hintsUsed === 0 ? 'Ver pista' : 'Ver siguiente pista'}
        </button>
      )}
    </div>
  );
}
