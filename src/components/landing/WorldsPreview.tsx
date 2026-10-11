// landing-page spec "Core Sections": Worlds preview (fourth section).
// design.md UI: "WorldsPreview from worldsMeta.ts (no catalog import)."
// `worldsMeta.ts` is pure data (no engine, no catalog import at runtime),
// so this stays safely inside the eager landing bundle.
import type { CSSProperties } from 'react';
import { WORLDS_META } from '../../lessons/worldsMeta';
import { accentFor } from './colors';
import styles from './WorldsPreview.module.css';

export function WorldsPreview() {
  return (
    <section className={styles.section} aria-labelledby="worlds-heading">
      <span className={styles.dot} style={{ '--accent': accentFor(2) } as CSSProperties} />
      <p className={styles.hash}>
        <code>#b8</code>
      </p>
      <h2 id="worlds-heading" className={styles.heading}>
        6 mundos, 30 niveles
      </h2>
      <p className={styles.lead}>
        De tu primer commit a tu primer pull request. Cada mundo se desbloquea completando el anterior.
      </p>
      <ol className={styles.grid}>
        {WORLDS_META.map((world) => (
          <li key={world.world} className={styles.world} style={{ '--accent': accentFor(world.world - 1) } as CSSProperties}>
            <p className={styles.worldLabel}>
              <span className={styles.worldNumber}>Mundo {world.world}</span>
              <span className={styles.worldName}>{world.name}</span>
            </p>
            <ul className={styles.levels}>
              {world.levels.map((level) => (
                <li key={level.id}>{level.title}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default WorldsPreview;
