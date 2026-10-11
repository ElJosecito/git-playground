// GREEN (tasks.md Phase 6, 6.2). design.md UI: "LevelMap: header: Inicio,
// total stars x/90, Reiniciar progreso (confirm); 6 WorldLanes as git
// lanes in branch colors, levels as an <ol> of LevelNodes; locked levels:
// aria-disabled + lock; stars with aria-label; 'en curso' badge; lanes
// horizontal at >=720px, vertical on mobile."
//
// Deviation: the spec's literal "x/90" assumes the full 30-level, 6-world
// curriculum (Phase 7). This batch's catalog only seeds 2 levels (World 1),
// so the total is derived as `levels.length * 3` instead of a hardcoded 90
// — it becomes exactly 90 once Phase 7 fills out all 30 levels, with no
// code change needed here.
import { useState } from 'react';
import { useProgress } from '../../lessons/progress/ProgressContext';
import { levels, allLevelsSorted } from '../../lessons/catalog';
import { WORLD_NAMES } from '../../lessons/worldNames';
import { WorldLane } from './WorldLane';
import styles from './LevelMap.module.css';

const MAX_STARS_PER_LEVEL = 3;

export function LevelMap() {
  const progress = useProgress();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const totalPossibleStars = levels.length * MAX_STARS_PER_LEVEL;
  const earnedStars = Object.values(progress.store.completed).reduce((sum, entry) => sum + entry.stars, 0);

  const worldNumbers = [...new Set(allLevelsSorted().map((l) => l.world))].sort((a, b) => a - b);

  return (
    <main>
      <header className={styles.header}>
        <h1 data-route-focus tabIndex={-1} className={styles.title}>
          Mapa de niveles
        </h1>
        <div className={styles.headerActions}>
          <a href="#/" className={styles.homeLink}>
            Inicio
          </a>
          <span className={styles.totalStars} aria-label={`${earnedStars} de ${totalPossibleStars} estrellas en total`}>
            <span aria-hidden="true">★</span> <span>{earnedStars} / {totalPossibleStars}</span>
          </span>
          {confirmingReset ? (
            <span className={styles.confirmWrap}>
              <span className={styles.confirmText}>¿Seguro? Se perderá todo tu progreso de niveles.</span>
              <button type="button" className={styles.confirmButton} onClick={() => setConfirmingReset(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={() => {
                  progress.resetProgress();
                  setConfirmingReset(false);
                }}
              >
                Confirmar
              </button>
            </span>
          ) : (
            <button type="button" className={styles.resetButton} onClick={() => setConfirmingReset(true)}>
              Reiniciar progreso
            </button>
          )}
        </div>
      </header>

      <div className={styles.lanes}>
        {worldNumbers.map((world) => (
          <WorldLane
            key={world}
            world={world}
            name={WORLD_NAMES[world] ?? `Mundo ${world}`}
            levels={allLevelsSorted()
              .filter((l) => l.world === world)
              .map((l) => ({
                id: l.id,
                title: l.title,
                unlocked: progress.unlocked.has(l.id),
                stars: progress.store.completed[l.id]?.stars ?? null,
                inProgress: l.id in progress.store.inProgress,
              }))}
          />
        ))}
      </div>
    </main>
  );
}
