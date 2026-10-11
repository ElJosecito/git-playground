// landing-page spec "Core Sections": Worlds preview (fourth section).
// design.md UI: "WorldsPreview from worldsMeta.ts (no catalog import)."
// `worldsMeta.ts` is pure data (no engine, no catalog import at runtime),
// so this stays safely inside the eager landing bundle.
//
// "Scroll-Driven History Narrative": the six worlds are stations ON the
// main history rail. Each one lights up (branch-colored node, glowing
// connector, accent number) as the rail's read-head — 60% down the
// viewport — reaches it, so the journey lights sequentially as you scroll.
// Unlit stations stay readable (dimmed, never hidden).
import type { CSSProperties } from 'react';
import { WORLDS_META } from '../../lessons/worldsMeta';
import type { WorldMeta } from '../../lessons/worldsMeta';
import { useReveal } from '../../hooks/useReveal';
import { CommitHeader, RAIL_ANCHOR_MARGIN } from './CommitHeader';
import { accentFor } from './colors';
import commit from './Commit.module.css';
import styles from './WorldsPreview.module.css';

const TOTAL_LEVELS = WORLDS_META.reduce((n, w) => n + w.levels.length, 0);

function Station({ world }: { world: WorldMeta }) {
  const { ref, revealProps } = useReveal<HTMLLIElement>({ rootMargin: RAIL_ANCHOR_MARGIN, threshold: 0 });
  return (
    <li
      ref={ref}
      className={styles.station}
      style={{ '--accent': accentFor(world.world - 1) } as CSSProperties}
      {...revealProps}
    >
      <span className={styles.node} aria-hidden="true" />
      <span className={styles.connector} aria-hidden="true" />
      <div className={styles.card}>
        <span className={styles.number} aria-hidden="true">
          {String(world.world).padStart(2, '0')}
        </span>
        <div className={styles.cardBody}>
          <p className={styles.worldLabel}>
            <span className={styles.worldNumber}>Mundo {world.world}</span>
            <span className={styles.count}>{world.levels.length} niveles</span>
          </p>
          <h3 className={styles.worldName}>{world.name}</h3>
          <ul className={styles.levels}>
            {world.levels.map((level) => (
              <li key={level.id}>{level.title}</li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}

export function WorldsPreview() {
  return (
    <section className={commit.section} aria-labelledby="worlds-heading">
      <CommitHeader hash="9a4b3f8" message={`feat: ${WORLDS_META.length} mundos, ${TOTAL_LEVELS} niveles`} accent={2}>
        <h2 id="worlds-heading" className={commit.title}>
          6 mundos, <em>30 niveles</em>
        </h2>
        <p className={commit.lead}>
          Un viaje en seis paradas: de tu primer commit a tu primer pull request. Cada mundo se desbloquea al completar el
          anterior.
        </p>
      </CommitHeader>
      <ol className={styles.journey}>
        {WORLDS_META.map((world) => (
          <Station key={world.world} world={world} />
        ))}
      </ol>
    </section>
  );
}

export default WorldsPreview;
