// Top-center toast notifications (fed by `useToasts`). 1:1 port of the DC
// template's toast stack (design-handoff/Git Playground.dc.html, lines
// 107-114).
import type { ToastItem } from '../hooks/useToasts';
import styles from './ToastStack.module.css';

export interface ToastStackProps {
  toasts: ToastItem[];
}

export function ToastStack({ toasts }: ToastStackProps) {
  return (
    <div className={styles.stack}>
      {toasts.map((t) => (
        <div key={t.id} data-toast={t.id} className={styles.toast} style={{ opacity: t.op, transform: t.tf }}>
          <div className={styles.icon} style={{ color: t.ic, boxShadow: `inset 0 0 0 1.5px ${t.ic}` }}>
            {t.icon}
          </div>
          <div className={styles.message}>
            {t.segs.map((sg, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <span key={i} style={{ fontFamily: sg.ff, color: sg.c, fontSize: sg.fs }}>
                {sg.t}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
