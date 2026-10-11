// One world as a station on the map's history rail (same language as the
// landing's WorldsPreview): branch-colored node + connector, a card with
// the world number, name, blurb, progress (levels + stars) and its levels
// as commit nodes on a mini branch. design.md UI: "levels as an <ol> of
// LevelNodes". Colors come from the landing's accent palette (the same hex
// values as `GitEngine.PALETA`, without importing the engine).
import type { CSSProperties } from 'react';
import { useReveal } from '../../hooks/useReveal';
import { accentFor } from '../landing/colors';
import { LevelNode } from './LevelNode';
import type { LevelNodeProps } from './LevelNode';
import styles from './WorldLane.module.css';

export interface WorldLaneProps {
  world: number;
  name: string;
  levels: LevelNodeProps[];
  description?: string;
  /** Shown when the world is still locked ("Completa X para desbloquear"). */
  lockedHint?: string | null;
  /** This world holds the map's next level. */
  current?: boolean;
}

const MAX_STARS_PER_LEVEL = 3;

export function WorldLane({ world, name, levels, description, lockedHint, current = false }: WorldLaneProps) {
  const { ref, revealProps } = useReveal<HTMLElement>({ rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  const completed = levels.filter((l) => l.stars !== null).length;
  const stars = levels.reduce((sum, l) => sum + (l.stars ?? 0), 0);
  const maxStars = levels.length * MAX_STARS_PER_LEVEL;
  const unlocked = levels.some((l) => l.unlocked);
  const done = levels.length > 0 && completed === levels.length;
  const state = !unlocked ? 'locked' : done ? 'done' : current ? 'current' : 'open';
  const pct = levels.length ? Math.round((completed / levels.length) * 100) : 0;
  const headingId = `world-${world}-heading`;

  return (
    <section
      ref={ref}
      className={styles.lane}
      data-state={state}
      aria-labelledby={headingId}
      style={{ '--world': accentFor(world - 1), '--pct': `${pct}%` } as CSSProperties}
      {...revealProps}
    >
      <span className={styles.node} aria-hidden="true" />
      <span className={styles.connector} aria-hidden="true" />
      <div className={styles.card}>
        <div className={styles.head}>
          <span className={styles.number} aria-hidden="true">
            {String(world).padStart(2, '0')}
          </span>
          <div className={styles.headBody}>
            <p className={styles.label}>
              <span>Mundo {world}</span>
              <span className={styles.pill} role="img" aria-label={`${name}: ${completed} de ${levels.length} niveles completados`}>
                {completed}/{levels.length}
              </span>
              <span className={styles.starCount} role="img" aria-label={`${stars} de ${maxStars} estrellas en este mundo`}>
                <span aria-hidden="true">★ {stars}</span>
                <span className={styles.starMax} aria-hidden="true">
                  /{maxStars}
                </span>
              </span>
              {state === 'done' && <span className={styles.status}>completado</span>}
              {state === 'current' && <span className={styles.status}>aquí vas</span>}
            </p>
            <h2 id={headingId} className={styles.name}>
              {name}
            </h2>
            {description && <p className={styles.blurb}>{description}</p>}
          </div>
        </div>

        <span className={styles.progress} aria-hidden="true">
          <span className={styles.progressFill} />
        </span>

        <ol className={styles.list}>
          {levels.map((level) => (
            <LevelNode key={level.id} {...level} />
          ))}
        </ol>

        {!unlocked && lockedHint && (
          <p className={styles.lockedHint}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="3.5" y="7" width="9" height="6.5" rx="1.6" />
              <path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" />
            </svg>
            <span>{lockedHint}</span>
          </p>
        )}
      </div>
    </section>
  );
}
