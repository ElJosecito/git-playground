// design.md UI: "SuccessDialog: modal with focus trap; staggered stars;
// Siguiente nivel / mundo; Repetir; Mapa." `nextDisabled` is computed by
// the caller (`LevelShell`, via the catalog's `nextLevelOf` +
// `useProgress().unlocked`) — level-player spec "Success Screen": "the
// action MUST be absent or disabled when there is no next level, or when
// the next level's world is still locked."
//
// Redesign: a celebratory "merge" moment — a feature branch curving into
// main and landing on a glowing merge node with a burst (pure CSS/SVG),
// big stars popping in one by one, run stats and command-styled actions.
// Under reduced motion everything renders in its final, static state.
import { useEffect, useRef } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import styles from './SuccessDialog.module.css';

export interface SuccessDialogProps {
  stars: 1 | 2 | 3;
  onNext(): void;
  nextDisabled: boolean;
  onRepeat(): void;
  onBackToMap(): void;
  /** Closes the dialog (back to the level view, keeping the completion
   * already recorded) — wired to Escape. Optional/backward compatible for
   * callers that don't offer a dismiss path. */
  onClose?(): void;
  levelTitle?: string;
  /** Counted actions used this run, and the level budget. */
  count?: number;
  budget?: number;
  hintsUsed?: number;
  solutionShown?: boolean;
  /** The level's world color. */
  accent?: string;
}

const HEADLINE: Record<1 | 2 | 3, string> = {
  3: 'Perfecto, sin ayuda y dentro del presupuesto.',
  2: 'Bien hecho. Hazlo con menos comandos para la tercera estrella.',
  1: 'Lo lograste. Inténtalo sin pistas para ganar más estrellas.',
};

const RAYS = Array.from({ length: 12 }, (_, i) => i);

export function SuccessDialog({
  stars,
  onNext,
  nextDisabled,
  onRepeat,
  onBackToMap,
  onClose,
  levelTitle,
  count,
  budget,
  hintsUsed,
  solutionShown = false,
  accent,
}: SuccessDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      previouslyFocusedRef.current?.focus();
    };
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
      return;
    }
    if (e.key !== 'Tab') return;
    const container = dialogRef.current;
    if (!container) return;
    const focusables = Array.from(container.querySelectorAll<HTMLElement>('button'));
    if (!focusables.length) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const showCount = count !== undefined && budget !== undefined;
  const showHints = hintsUsed !== undefined;
  const hintsText = solutionShown ? `${hintsUsed ?? 0} + solución` : String(hintsUsed ?? 0);

  return (
    <div className={styles.overlay} role="presentation">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Nivel completado"
        className={styles.dialog}
        onKeyDown={handleKeyDown}
        style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}
      >
        <div className={styles.art} aria-hidden="true">
          <span className={styles.burst}>
            {RAYS.map((i) => (
              <span key={i} className={styles.ray} style={{ '--r': `${i * 30}deg` } as CSSProperties} />
            ))}
          </span>
          <svg className={styles.merge} viewBox="0 0 220 120">
            <path className={styles.mainLine} d="M10 92 H210" />
            <path className={styles.featureLine} d="M24 92 C 50 92 56 34 86 34 H124 C 150 34 154 92 176 92" />
            <circle className={styles.commit} cx="86" cy="34" r="5" />
            <circle className={styles.commit} cx="124" cy="34" r="5" />
            <circle className={styles.base} cx="24" cy="92" r="5" />
          </svg>
          <span className={styles.mergeNode}>
            <svg viewBox="0 0 16 16">
              <path d="M3.8 8.4l2.7 2.7 5.7-6" />
            </svg>
          </span>
        </div>

        <p className={styles.eyebrow}>
          <code>merge</code> nivel → <code>main</code>
        </p>
        <h2 className={styles.title}>¡Nivel completado!</h2>
        {levelTitle && <p className={styles.levelTitle}>{levelTitle}</p>}

        <div className={styles.stars} role="img" aria-label={`${stars} de 3 estrellas`}>
          {([1, 2, 3] as const).map((n) => (
            <span
              key={n}
              aria-hidden="true"
              className={n <= stars ? styles.starFilled : styles.starEmpty}
              style={{ animationDelay: `${450 + (n - 1) * 220}ms` }}
            >
              ★
            </span>
          ))}
        </div>
        <p className={styles.headline}>{HEADLINE[stars]}</p>

        {(showCount || showHints) && (
          <div className={styles.stats}>
            {showCount && (
              <div className={styles.stat} role="img" aria-label={`Comandos: ${count} de ${budget}`} data-over={count! > budget! || undefined}>
                <span className={styles.statLabel} aria-hidden="true">Comandos</span>
                <span className={styles.statValue} aria-hidden="true">
                  {count}
                  <span className={styles.statMax}>/{budget}</span>
                </span>
              </div>
            )}
            {showHints && (
              <div className={styles.stat} role="img" aria-label={`Pistas usadas: ${hintsText}`} data-over={(hintsUsed ?? 0) > 0 || solutionShown || undefined}>
                <span className={styles.statLabel} aria-hidden="true">Pistas</span>
                <span className={styles.statValue} aria-hidden="true">{hintsText}</span>
              </div>
            )}
          </div>
        )}

        <div className={styles.actions}>
          {!nextDisabled && (
            <button type="button" className={styles.primary} onClick={onNext}>
              <span className={styles.primaryCmd} aria-hidden="true">
                $ git switch siguiente
              </span>
              <span className={styles.primaryLabel}>Siguiente nivel</span>
              <span className={styles.primaryArrow} aria-hidden="true">
                →
              </span>
            </button>
          )}
          <div className={styles.secondaryRow}>
            <button type="button" className={styles.secondary} onClick={onBackToMap}>
              Volver al mapa
            </button>
            <button type="button" className={styles.secondary} onClick={onRepeat}>
              Repetir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
