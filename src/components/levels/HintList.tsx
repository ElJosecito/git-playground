// `hints`/`hintsUsed` are the level's full (static) hint texts and the
// session's current reveal count — this only renders the REVEALED prefix
// (level-player spec "Progressive Hints and Solution Reveal": "Hints MUST
// reveal one at a time on explicit request, in order") and the 1-star
// warning (design.md UI: "HintList (1-star warning)").
//
// Redesign: revealed hints are stacked numbered cards; the reveal button
// carries a clear "costs stars" tag.
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
    <div className={styles.root} data-used={hintsUsed > 0}>
      <div className={styles.head}>
        <span className={styles.label}>Pistas</span>
        <span className={styles.count} aria-hidden="true">
          {hintsUsed}/{hints.length}
        </span>
      </div>

      <p className={styles.warning}>
        <span className={styles.warningIcon} aria-hidden="true">
          ★
        </span>
        <span>
          {hintsUsed === 0
            ? 'Usar una pista limita esta ronda a 1 estrella, aunque termines dentro del presupuesto.'
            : 'Ya usaste ayuda: esta ronda vale como máximo 1 estrella.'}
        </span>
      </p>

      {revealed.length > 0 && (
        <ol className={styles.list}>
          {revealed.map((hint, i) => (
            <li key={i} className={styles.card}>
              <span className={styles.cardIndex}>
                Pista {i + 1} de {hints.length}
              </span>
              <p className={styles.cardText}>{hint}</p>
            </li>
          ))}
        </ol>
      )}

      {hasMore && (
        <button type="button" onClick={onRevealHint} className={styles.reveal}>
          <span className={styles.revealIcon} aria-hidden="true">
            ?
          </span>
          <span>{hintsUsed === 0 ? 'Ver pista' : 'Ver siguiente pista'}</span>
          {hintsUsed === 0 && (
            <span className={styles.cost} aria-hidden="true">
              ★★★ → ★
            </span>
          )}
        </button>
      )}
    </div>
  );
}
