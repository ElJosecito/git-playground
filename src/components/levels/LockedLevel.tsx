// app-routing spec "Locked Level Guard": renders instead of the level,
// with no way to bypass it via direct URL entry — `LevelRoute`'s body
// renders this INSTEAD of `LevelShell` whenever the requested level id
// isn't in `useProgress().unlocked`.
//
// Redesign: the landing's language — dotted backdrop, a dashed "locked
// commit" node on a branch, bold heading and a command-styled way back.
import type { CSSProperties } from 'react';
import styles from './LockedLevel.module.css';

export interface LockedLevelProps {
  /** The locked level's title, when known. */
  title?: string;
  /** How to unlock it ("Completa X para desbloquear"). */
  hint?: string;
  /** The level's world color. */
  accent?: string;
}

export function LockedLevel({ title, hint, accent }: LockedLevelProps = {}) {
  return (
    <main className={styles.root} style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}>
      <div className={styles.backdrop} aria-hidden="true">
        <span className={styles.grid} />
        <span className={styles.glow} />
      </div>
      <div className={styles.card}>
        <div className={styles.art} aria-hidden="true">
          <span className={styles.line} />
          <span className={styles.done} />
          <span className={styles.done} />
          <span className={styles.lockNode}>
            <svg viewBox="0 0 16 16">
              <rect x="3.5" y="7" width="9" height="6.5" rx="1.6" />
              <path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" />
            </svg>
          </span>
        </div>
        <p className={styles.eyebrow}>
          <code>error:</code> la rama aún no existe
        </p>
        <h1 data-route-focus tabIndex={-1} className={styles.title}>
          Nivel bloqueado
        </h1>
        {title && <p className={styles.levelTitle}>{title}</p>}
        <p className={styles.text}>Todavía no desbloqueaste este nivel. Completa los niveles anteriores para acceder.</p>
        {hint && (
          <p className={styles.hint}>
            <span aria-hidden="true">→</span>
            <span>{hint}</span>
          </p>
        )}
        <a href="#/niveles" className={styles.back}>
          <span className={styles.backCmd} aria-hidden="true">
            $ git switch niveles
          </span>
          <span className={styles.backLabel}>Volver al mapa</span>
        </a>
      </div>
    </main>
  );
}
