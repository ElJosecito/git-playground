// Top-right action bar: teammate trigger, theme toggle, and the 2-step
// "Reiniciar repositorio" confirm menu. 1:1 port of the DC template's
// action-bar block (design-handoff/Git Playground.dc.html, lines 88-105).
import type { Ref } from 'react';
import styles from './ActionBar.module.css';

export interface ActionBarProps {
  showMate: boolean;
  mateLabel: string;
  onMate(): void;
  onToggleTheme(): void;
  resetOpen: boolean;
  onToggleReset(): void;
  onResetExample(): void;
  onResetEmpty(): void;
  /** Gates the "Pull requests (n)" button — one of the two entry points
   * into the simulated hosting web view (the other is the remote-box click
   * in `GraphLayer`), both tied to origin existing, same as `showMate`. */
  showHosting: boolean;
  hostingCount: number;
  onOpenHosting(): void;
  /** Gates the "Reiniciar repositorio" button/menu. Defaults to `true`
   * (the sandbox's existing behavior, unchanged) — a level host passes
   * `false` since "reset" there means `LevelShell`'s own "Reiniciar
   * nivel", not reloading the whole repo (design.md Key Decisions:
   * "ActionBar gains optional showReset and homeHref."). */
  showReset?: boolean;
  /** When provided, renders an additional "Inicio" link to this href
   * (e.g. `#/niveles` from inside a level). Omitted entirely by default so
   * the sandbox's markup/tests stay unchanged. */
  homeHref?: string;
  /** When provided, renders the "Cheatsheet" toggle for the sandbox's
   * command reference panel. Omitted by default (levels don't show it). */
  onToggleCheatsheet?(): void;
  cheatsheetOpen?: boolean;
  /** id of the panel element the toggle controls. */
  cheatsheetPanelId?: string;
  cheatsheetButtonRef?: Ref<HTMLButtonElement>;
}

export function ActionBar({
  showMate,
  mateLabel,
  onMate,
  onToggleTheme,
  resetOpen,
  onToggleReset,
  onResetExample,
  onResetEmpty,
  showHosting,
  hostingCount,
  onOpenHosting,
  showReset = true,
  homeHref,
  onToggleCheatsheet,
  cheatsheetOpen = false,
  cheatsheetPanelId,
  cheatsheetButtonRef,
}: ActionBarProps) {
  return (
    <div className={styles.bar}>
      {homeHref && (
        <a href={homeHref} className={styles.chip}>
          Inicio
        </a>
      )}
      {showMate && (
        <button
          type="button"
          onClick={onMate}
          title="Añade un commit de otra persona en origin para practicar fetch y pull"
          className={`${styles.chip} ${styles.mateButton}`}
        >
          <span className={styles.mateDot} />
          {mateLabel}
        </button>
      )}
      {showHosting && (
        <button type="button" onClick={onOpenHosting} title="Ver pull requests en origin" className={styles.chip}>
          Pull requests ({hostingCount})
        </button>
      )}
      {onToggleCheatsheet && (
        <button
          ref={cheatsheetButtonRef}
          type="button"
          onClick={onToggleCheatsheet}
          aria-expanded={cheatsheetOpen}
          aria-controls={cheatsheetOpen ? cheatsheetPanelId : undefined}
          aria-keyshortcuts="Control+K Meta+K"
          title="Comandos de Git (Ctrl+K)"
          className={`${styles.chip} ${cheatsheetOpen ? styles.chipActive : ''}`}
        >
          Cheatsheet
        </button>
      )}
      <button type="button" onClick={onToggleTheme} aria-label="Cambiar tema" title="Cambiar tema claro/oscuro" className={`${styles.chip} ${styles.themeButton}`}>
        ◐
      </button>
      {showReset && (
        <div className={styles.resetWrap}>
          <button type="button" onClick={onToggleReset} className={styles.chip}>
            Reiniciar repositorio
          </button>
          {resetOpen && (
            <div className={styles.panel}>
              <div className={styles.panelTitle}>¿Empezar de nuevo?</div>
              <div className={styles.panelBody}>Se perderá el estado actual del repositorio.</div>
              <button type="button" onClick={onResetExample} className={styles.option}>
                <span className={styles.optionTitle}>Repositorio de ejemplo</span>
                <span className={styles.optionSubtitle}>README.md y dos commits en main</span>
              </button>
              <button type="button" onClick={onResetEmpty} className={styles.option}>
                <span className={styles.optionTitle}>Carpeta vacía</span>
                <span className={styles.optionSubtitle}>Sin git init: empiezas desde cero</span>
              </button>
              <button type="button" onClick={onToggleReset} className={styles.cancel}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
