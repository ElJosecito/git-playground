// 1:1 port of the DC template's camera control bar
// (design-handoff/Git Playground.dc.html, lines 184-189): zoom out/in,
// "Encuadrar" (fit all) and "HEAD" (center on HEAD). `bottom` is the
// safe-area-aware offset (`camBottom`) so this bar sits above the mobile
// terminal bottom-sheet, same as the oracle.
import styles from './CameraControls.module.css';

export interface CameraControlsProps {
  bottom: string;
  onZoomIn(): void;
  onZoomOut(): void;
  onFit(): void;
  onCenterHead(): void;
}

export function CameraControls({ bottom, onZoomIn, onZoomOut, onFit, onCenterHead }: CameraControlsProps) {
  return (
    <div className={styles.bar} style={{ bottom }}>
      <button
        type="button"
        onClick={onZoomOut}
        aria-label="Alejar"
        title="Alejar"
        className={`${styles.button} ${styles.zoomButton}`}
      >
        −
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        aria-label="Acercar"
        title="Acercar"
        className={`${styles.button} ${styles.zoomButton}`}
      >
        +
      </button>
      <button type="button" onClick={onFit} title="Encuadrar todo" className={`${styles.button} ${styles.textButton}`}>
        Encuadrar
      </button>
      <button type="button" onClick={onCenterHead} title="Centrar en HEAD" className={`${styles.button} ${styles.headButton}`}>
        HEAD
      </button>
    </div>
  );
}
