// GREEN (tasks.md Phase 6, 6.2). design.md UI: "locked levels:
// aria-disabled + lock; stars with aria-label; 'en curso' badge."
import styles from './LevelNode.module.css';

export interface LevelNodeProps {
  id: string;
  title: string;
  unlocked: boolean;
  stars: 1 | 2 | 3 | null;
  inProgress: boolean;
}

function Stars({ stars }: { stars: 1 | 2 | 3 }) {
  return (
    <span className={styles.stars} aria-label={`${stars} estrellas`}>
      {([1, 2, 3] as const).map((n) => (
        <span key={n} aria-hidden="true" className={n <= stars ? styles.starFilled : styles.starEmpty}>
          ★
        </span>
      ))}
    </span>
  );
}

export function LevelNode({ id, title, unlocked, stars, inProgress }: LevelNodeProps) {
  const body = (
    <>
      <span className={styles.title}>{title}</span>
      {stars !== null && <Stars stars={stars} />}
      {stars === null && inProgress && <span className={styles.badge}>en curso</span>}
    </>
  );

  if (!unlocked) {
    return (
      <li className={styles.item}>
        <span className={styles.locked} aria-disabled="true">
          <span aria-hidden="true" className={styles.lockIcon}>
            🔒
          </span>
          {body}
        </span>
      </li>
    );
  }

  return (
    <li className={styles.item}>
      <a href={`#/niveles/${id}`} className={styles.link}>
        {body}
      </a>
    </li>
  );
}
