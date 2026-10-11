// One level as a commit node on its world's mini branch. design.md UI:
// "locked levels: aria-disabled + lock; stars with aria-label; 'en curso'
// badge." Redesign: the node's dot carries the state (locked = dashed +
// lock, open = hollow ring with the level number, in progress = half-filled
// with a pulsing ring, completed = filled with a check); the map's next
// level gets a HEAD tag and `aria-current="step"`.
import styles from './LevelNode.module.css';

export interface LevelNodeProps {
  id: string;
  title: string;
  unlocked: boolean;
  stars: 1 | 2 | 3 | null;
  inProgress: boolean;
  /** 1-based position inside its world (shown in the open dot). */
  order?: number;
  /** The map's "Continuar" target. */
  isNext?: boolean;
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

function LockGlyph() {
  return (
    <svg viewBox="0 0 16 16" className={styles.glyph} aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.6" />
      <path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 16 16" className={styles.glyph} aria-hidden="true">
      <path d="M3.8 8.4l2.7 2.7 5.7-6" />
    </svg>
  );
}

type NodeState = 'locked' | 'open' | 'progress' | 'done';

function stateOf(unlocked: boolean, stars: LevelNodeProps['stars'], inProgress: boolean): NodeState {
  if (!unlocked) return 'locked';
  if (stars !== null) return 'done';
  return inProgress ? 'progress' : 'open';
}

const ACTION_COPY: Record<NodeState, string> = {
  locked: 'Bloqueado',
  open: 'Jugar',
  progress: 'Retomar',
  done: 'Repetir',
};

export function LevelNode({ id, title, unlocked, stars, inProgress, order, isNext = false }: LevelNodeProps) {
  const state = stateOf(unlocked, stars, inProgress);
  const dot = (
    <span className={styles.dot} aria-hidden="true">
      {state === 'locked' && <LockGlyph />}
      {state === 'done' && <CheckGlyph />}
      {(state === 'open' || state === 'progress') && <span className={styles.order}>{order ?? '•'}</span>}
    </span>
  );
  const body = (
    <>
      {isNext && (
        <span className={styles.head} aria-hidden="true">
          HEAD
        </span>
      )}
      {dot}
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.meta}>
          {stars !== null && <Stars stars={stars} />}
          {stars === null && inProgress && <span className={styles.badge}>en curso</span>}
          <span className={styles.action} aria-hidden="true">
            {ACTION_COPY[state]}
            {state !== 'locked' && ' →'}
          </span>
        </span>
      </span>
    </>
  );

  if (!unlocked) {
    return (
      <li className={styles.item} data-state={state}>
        <span className={`${styles.node} ${styles.locked}`} aria-disabled="true">
          {body}
        </span>
      </li>
    );
  }

  return (
    <li className={styles.item} data-state={state} data-next={isNext || undefined}>
      <a href={`#/niveles/${id}`} className={`${styles.node} ${styles.link}`} aria-current={isNext ? 'step' : undefined}>
        {body}
      </a>
    </li>
  );
}
