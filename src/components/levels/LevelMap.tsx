// The level map (`#/niveles`). design.md UI: "LevelMap: header: Inicio,
// total stars x/90, Reiniciar progreso (confirm); 6 WorldLanes...".
//
// Redesign (shares the landing's language): a hero with a commit-style
// eyebrow, bold display title, big star/level counts, a branch-colored
// progress branch and a command-styled "Continuar"/"Empezar" CTA to the
// next level; below it the six worlds are stations on a vertical history
// rail (see WorldLane). Decorative layers are separate aria-hidden nodes.
//
// Like the landing, the map is a normal scrolling document — the global
// `body { overflow: hidden }` (for the fixed-viewport workspace) is scoped
// off via `data-scroll-page` while this view is mounted.
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useProgress } from '../../lessons/progress/ProgressContext';
import { levels } from '../../lessons/catalog';
import { WORLD_NAMES } from '../../lessons/worldNames';
import { accentFor } from '../landing/colors';
import { useReveal } from '../../hooks/useReveal';
import { WorldLane } from './WorldLane';
import { buildMapSummary, shortHash, WORLD_BLURBS } from './mapModel';
import type { MapSummary } from './mapModel';
import styles from './LevelMap.module.css';

const worldName = (world: number) => WORLD_NAMES[world] ?? `Mundo ${world}`;

function Backdrop() {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      <span className={styles.grid} />
      <span className={`${styles.glow} ${styles.glowA}`} />
      <span className={`${styles.glow} ${styles.glowB}`} />
      <span className={styles.noise} />
    </div>
  );
}

function ResetProgress({ onReset }: { onReset(): void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" className={styles.resetButton} onClick={() => setConfirming(true)}>
        Reiniciar progreso
      </button>
    );
  }
  return (
    <span className={styles.confirmWrap} role="group" aria-label="Confirmar reinicio de progreso">
      <span className={styles.confirmText}>¿Seguro? Se perderá todo tu progreso de niveles.</span>
      <button type="button" className={styles.confirmButton} onClick={() => setConfirming(false)}>
        Cancelar
      </button>
      <button
        type="button"
        className={`${styles.confirmButton} ${styles.confirmDanger}`}
        onClick={() => {
          onReset();
          setConfirming(false);
        }}
      >
        Confirmar
      </button>
    </span>
  );
}

function ProgressBranch({ summary }: { summary: MapSummary }) {
  const pct = summary.totalLevels ? (summary.completedLevels / summary.totalLevels) * 100 : 0;
  return (
    <div
      className={styles.branch}
      role="progressbar"
      aria-label="Progreso total"
      aria-valuemin={0}
      aria-valuemax={summary.totalLevels}
      aria-valuenow={summary.completedLevels}
      aria-valuetext={`${summary.completedLevels} de ${summary.totalLevels} niveles`}
      style={{ '--pct': `${pct}%` } as CSSProperties}
    >
      <span className={styles.branchTrack} aria-hidden="true" />
      <span className={styles.branchFill} aria-hidden="true" />
      <span className={styles.branchStops} aria-hidden="true">
        {summary.worlds.map((w) => (
          <span
            key={w.world}
            className={styles.branchStop}
            data-done={w.done || undefined}
            data-current={w.current || undefined}
            style={{ '--stop': accentFor(w.world - 1), flexGrow: w.total } as CSSProperties}
          >
            <span className={styles.branchDot} />
            <span className={styles.branchLabel}>{String(w.world).padStart(2, '0')}</span>
          </span>
        ))}
      </span>
    </div>
  );
}

function Hero({ summary, onReset }: { summary: MapSummary; onReset(): void }) {
  const { ref, revealProps } = useReveal<HTMLElement>({ rootMargin: '0px', threshold: 0 });
  const { next } = summary;
  const worldsOpen = summary.worlds.filter((w) => w.unlocked).length;
  const allDone = next === null;
  return (
    <header ref={ref} className={styles.hero} {...revealProps}>
      <p className={styles.eyebrow}>
        <span className={styles.eyebrowNode} aria-hidden="true" />
        <code className={styles.hash}>{shortHash(`map:${summary.completedLevels}:${summary.earnedStars}`)}</code>
        <span className={styles.tag}>HEAD → main</span>
        <span className={styles.message}>
          {allDone ? 'release: curso completo' : `log: ${summary.completedLevels} de ${summary.totalLevels} niveles`}
        </span>
      </p>

      <h1 data-route-focus tabIndex={-1} className={styles.kicker}>
        Mapa de niveles
      </h1>
      <p className={styles.display}>
        Tu historia <em>de Git</em>
      </p>
      <p className={styles.lead}>
        Seis mundos, una sola rama: cada nivel que completas es un commit más en tu historia. Termina un mundo para abrir el
        siguiente.
      </p>

      <div className={styles.stats}>
        <div className={styles.stat} role="img" aria-label={`${summary.earnedStars} de ${summary.maxStars} estrellas en total`}>
          <span className={styles.statValue} aria-hidden="true">
            <span className={styles.statStar}>★</span>
            {summary.earnedStars}
            <span className={styles.statMax}>/{summary.maxStars}</span>
          </span>
          <span className={styles.statLabel} aria-hidden="true">
            estrellas
          </span>
        </div>
        <div className={styles.stat} role="img" aria-label={`${summary.completedLevels} de ${summary.totalLevels} niveles completados`}>
          <span className={styles.statValue} aria-hidden="true">
            {summary.completedLevels}
            <span className={styles.statMax}>/{summary.totalLevels}</span>
          </span>
          <span className={styles.statLabel} aria-hidden="true">
            niveles
          </span>
        </div>
        <div className={styles.stat} role="img" aria-label={`${worldsOpen} de ${summary.worlds.length} mundos abiertos`}>
          <span className={styles.statValue} aria-hidden="true">
            {worldsOpen}
            <span className={styles.statMax}>/{summary.worlds.length}</span>
          </span>
          <span className={styles.statLabel} aria-hidden="true">
            mundos
          </span>
        </div>
      </div>

      <ProgressBranch summary={summary} />

      <div className={styles.ctaRow}>
        {next ? (
          <a
            href={`#/niveles/${next.id}`}
            className={styles.command}
            aria-describedby="level-map-next-hint"
            style={{ '--accent': accentFor(next.world - 1) } as CSSProperties}
          >
            <span className={styles.commandLabel}>{next.resume ? 'Continuar' : 'Empezar'}</span>
            <span className={styles.commandLine} aria-hidden="true">
              <span className={styles.prompt}>$</span> git switch {next.id}
              <span className={styles.caret} />
            </span>
            <span className={styles.commandHint} id="level-map-next-hint" aria-hidden="true">
              Mundo {next.world} · {next.title}
            </span>
            <span className={styles.commandArrow} aria-hidden="true">
              →
            </span>
          </a>
        ) : (
          <p className={styles.allDone}>
            <span aria-hidden="true">✦</span> Completaste los {summary.totalLevels} niveles. Repite cualquiera para mejorar tus
            estrellas.
          </p>
        )}
        <div className={styles.heroLinks}>
          <a href="#/" className={styles.homeLink}>
            Inicio
          </a>
          <span className={styles.dotSep} aria-hidden="true">
            ·
          </span>
          <ResetProgress onReset={onReset} />
        </div>
      </div>
    </header>
  );
}

export function LevelMap() {
  const progress = useProgress();

  useEffect(() => {
    document.body.setAttribute('data-scroll-page', 'true');
    return () => {
      document.body.removeAttribute('data-scroll-page');
    };
  }, []);

  const summary = useMemo(
    () =>
      buildMapSummary(
        levels,
        { completed: progress.store.completed, inProgress: progress.store.inProgress, unlocked: progress.unlocked },
        worldName,
      ),
    [progress.store.completed, progress.store.inProgress, progress.unlocked],
  );

  return (
    <main className={styles.root}>
      <Backdrop />
      <div className={styles.frame}>
        <div className={styles.rail} aria-hidden="true">
          <span className={styles.railTrack} />
          <span className={styles.railFill} style={{ '--pct': `${(summary.completedLevels / Math.max(1, summary.totalLevels)) * 100}%` } as CSSProperties} />
        </div>
        <Hero summary={summary} onReset={progress.resetProgress} />
        <div className={styles.journey}>
          {summary.worlds.map((world) => (
            <WorldLane
              key={world.world}
              world={world.world}
              name={world.name}
              description={WORLD_BLURBS[world.world]}
              lockedHint={world.lockedHint}
              current={world.current}
              levels={world.levels}
            />
          ))}
        </div>
        <p className={styles.footer}>
          <span className={styles.footerDot} aria-hidden="true" />
          git/playground · tu progreso se guarda en este navegador
        </p>
      </div>
    </main>
  );
}
