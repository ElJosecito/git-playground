// Top-right action bar: teammate trigger, theme toggle, and the 2-step
// "Reiniciar repositorio" confirm menu. 1:1 port of the DC template's
// action-bar block (design-handoff/Git Playground.dc.html, lines 88-105).
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
}

export function ActionBar({ showMate, mateLabel, onMate, onToggleTheme, resetOpen, onToggleReset, onResetExample, onResetEmpty }: ActionBarProps) {
  return (
    <div className={styles.bar}>
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
      <button type="button" onClick={onToggleTheme} aria-label="Cambiar tema" title="Cambiar tema claro/oscuro" className={`${styles.chip} ${styles.themeButton}`}>
        ◐
      </button>
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
    </div>
  );
}
