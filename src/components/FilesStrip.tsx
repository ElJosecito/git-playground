// The files-strip panel: working directory / staging / last-commit
// columns. 1:1 port of the DC template's files-strip block
// (design-handoff/Git Playground.dc.html, lines 37-86), including the
// mobile floating-button variant (lines 84-86). Every `data-zone`/
// `data-chip` attribute is kept verbatim (design D15) — Phase 5's
// choreography measures and flies these exact elements, which is why this
// component ships before Phase 5.
import type { FilesModel } from '../ui/selectors';
import styles from './FilesStrip.module.css';

export interface FilesStripProps {
  model: FilesModel;
  summary: string;
  mobile: boolean;
  /** Desktop only: whether the panel body is expanded (the chevron state).
   * Always rendered expanded on mobile once shown (oracle:
   * `stripOpen:mob?true:s.stripOpen`). */
  open: boolean;
  /** Mobile only: whether the floating panel is shown over the "Archivos"
   * button (oracle's `stripMobile`). Ignored on desktop. */
  mobileShown: boolean;
  onToggle(): void;
  onShowMobile(): void;
}

export function FilesStrip({ model, summary, mobile, open, mobileShown, onToggle, onShowMobile }: FilesStripProps) {
  if (mobile && !mobileShown) {
    return (
      <button type="button" onClick={onShowMobile} className={styles.mobileButton}>
        Archivos <span className={styles.mobileButtonCount}>{model.stripCount}</span>
      </button>
    );
  }

  const expanded = mobile || open;

  return (
    <div className={`${styles.panel} ${mobile ? styles.panelMobile : ''}`}>
      <div onClick={onToggle} className={styles.header}>
        <div className={styles.headerTitle}>Archivos</div>
        <div className={styles.headerSummary}>{summary}</div>
        <div className={`${styles.chevron} ${expanded ? '' : styles.chevronClosed}`}>▾</div>
      </div>
      {expanded && (
        <div className={styles.body}>
          <div data-zone="w" className={styles.zone}>
            <div title="Los archivos de tu carpeta, tal como están ahora" className={styles.zoneHeader}>
              Working directory
            </div>
            {model.wd.map((f) => (
              <div key={f.name} data-chip={`w:${f.name}`} title={f.title} className={styles.chip} style={{ background: f.bg }}>
                <div className={styles.chipDot} style={{ background: f.dot }} />
                <div className={styles.chipName} style={{ color: f.color, textDecoration: f.deco }}>
                  {f.name}
                </div>
                <div className={styles.chipLetter} style={{ color: f.dot }}>
                  {f.letter}
                </div>
              </div>
            ))}
            {model.wdEmpty && <div className={styles.empty}>vacío</div>}
          </div>
          <div className={styles.arrow}>→</div>
          <div data-zone="s" className={styles.zone}>
            <div title="Lo que entrará en el próximo commit" className={styles.zoneHeader}>
              Staging
            </div>
            {model.stg.map((f) => (
              <div key={f.name} data-chip={`s:${f.name}`} title={f.title} className={styles.chip} style={{ background: 'rgba(74,222,128,0.08)' }}>
                <div className={styles.chipDot} style={{ background: 'var(--success)' }} />
                <div className={styles.chipName} style={{ color: 'var(--text-primary)', textDecoration: f.deco }}>
                  {f.name}
                </div>
                <div className={styles.chipLetter} style={{ color: 'var(--success)' }}>
                  {f.letter}
                </div>
              </div>
            ))}
            {model.stgEmpty && <div className={styles.empty}>vacío</div>}
          </div>
          <div className={styles.arrow}>→</div>
          <div data-zone="c" className={styles.zone}>
            <div data-chip="c:__head" title="Los archivos guardados en el commit al que apunta HEAD" className={styles.commitZoneHeader}>
              <span>Último commit</span>
              <span className={styles.commitHeaderHash}>{model.headShort}</span>
            </div>
            {model.cm.map((f) => (
              <div key={f.name} data-chip={`c:${f.name}`} className={styles.chip}>
                <div className={styles.chipDotOutline} />
                <div className={styles.chipCommitName}>{f.name}</div>
              </div>
            ))}
            {model.cmEmpty && <div className={styles.empty}>{model.cmEmptyText}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
