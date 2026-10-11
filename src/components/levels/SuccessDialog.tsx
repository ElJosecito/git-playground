// GREEN (tasks.md Phase 5, 5.2). design.md UI: "SuccessDialog: modal with
// focus trap; staggered stars; Siguiente nivel / mundo; Repetir; Mapa."
// `nextDisabled` is computed by the caller (`LevelShell`, via the
// catalog's `nextLevelOf` + `useProgress().unlocked`) — level-player spec
// "Success Screen": "the action MUST be absent or disabled when there is
// no next level, or when the next level's world is still locked."
import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
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
}

export function SuccessDialog({ stars, onNext, nextDisabled, onRepeat, onBackToMap, onClose }: SuccessDialogProps) {
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
      >
        <h2 className={styles.title}>¡Nivel completado!</h2>
        <div className={styles.stars} aria-label={`${stars} de 3 estrellas`}>
          {([1, 2, 3] as const).map((n) => (
            <span
              key={n}
              aria-hidden="true"
              className={n <= stars ? styles.starFilled : styles.starEmpty}
              style={{ animationDelay: `${(n - 1) * 150}ms` }}
            >
              ★
            </span>
          ))}
        </div>
        <div className={styles.actions}>
          {!nextDisabled && (
            <button type="button" className={styles.primary} onClick={onNext}>
              Siguiente nivel
            </button>
          )}
          <button type="button" className={styles.secondary} onClick={onRepeat}>
            Repetir
          </button>
          <button type="button" className={styles.secondary} onClick={onBackToMap}>
            Mapa
          </button>
        </div>
      </div>
    </div>
  );
}
