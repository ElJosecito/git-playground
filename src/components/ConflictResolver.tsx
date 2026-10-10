// The conflict-resolver panel: shows every conflicting file with both
// sides and mine/theirs/both/edit actions. 1:1 port of the DC template's
// resolver panel (design-handoff/Git Playground.dc.html, lines 131-164).
// `model` comes from `ui/selectors.resolverModel` — this component is a
// pure renderer; all side effects (calling the engine's `resolver(...)`)
// are the caller's responsibility via `onResolve`/`onEdit`.
import type { ResolverModel } from '../ui/selectors';
import styles from './ConflictResolver.module.css';

export interface ConflictResolverProps {
  model: ResolverModel;
  onResolve(file: string, mode: 'mia' | 'suya' | 'ambas'): void;
  onEdit(file: string): void;
  onHide(): void;
}

export function ConflictResolver({ model, onResolve, onEdit, onHide }: ConflictResolverProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.dot} />
        <div className={styles.title}>{model.title}</div>
        <button type="button" onClick={onHide} aria-label="Ocultar" className={styles.hideButton}>
          Ocultar
        </button>
      </div>
      {model.conflicts.map((cf) => (
        <div key={cf.file} className={styles.conflict}>
          <div className={styles.fileRow}>
            <div className={styles.fileName}>{cf.file}</div>
            <div className={styles.state} style={{ color: cf.stateColor }}>
              {cf.state}
            </div>
          </div>
          <div className={styles.sides}>
            <div className={styles.side}>
              <div className={styles.sideLabel}>
                La mía <span className={styles.sideLabelMono}>HEAD</span>
              </div>
              <div className={styles.sideContent}>{cf.ours}</div>
            </div>
            <div className={styles.side}>
              <div className={styles.sideLabel}>
                La suya <span className={styles.sideLabelMono}>{cf.theirsName}</span>
              </div>
              <div className={styles.sideContent}>{cf.theirs}</div>
            </div>
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={() => onResolve(cf.file, 'mia')} className={styles.actionButton}>
              Mantener la mía
            </button>
            <button type="button" onClick={() => onResolve(cf.file, 'suya')} className={styles.actionButton}>
              Mantener la suya
            </button>
            <button type="button" onClick={() => onResolve(cf.file, 'ambas')} className={styles.actionButton}>
              Mantener ambas
            </button>
            <button type="button" onClick={() => onEdit(cf.file)} className={styles.editButton}>
              Editar…
            </button>
          </div>
        </div>
      ))}
      <div className={styles.hint}>
        {model.hintSegs.map((sg, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <span key={i} style={{ fontFamily: sg.ff, color: sg.c }}>
            {sg.t}
          </span>
        ))}
      </div>
    </div>
  );
}
