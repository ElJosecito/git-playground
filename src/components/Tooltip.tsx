// Commit/branch/HEAD/track/tag/stash/phantom hover tooltip. 1:1 port of
// the DC template's tooltip (design-handoff/Git Playground.dc.html, lines
// 116-129). `data` comes from `ui/tooltip.tipData`, `placement` from
// `ui/tooltip.tipPlacement` — this component only renders them.
import { Fragment } from 'react';
import type { TipData, TipPlacement } from '../ui/tooltip';
import styles from './Tooltip.module.css';

export interface TooltipProps {
  data: TipData;
  placement: TipPlacement;
}

export function Tooltip({ data, placement }: TooltipProps) {
  return (
    <div
      role="tooltip"
      className={styles.tip}
      style={{ left: placement.x, top: placement.y, transform: placement.transform }}
    >
      <div className={styles.arrow} style={{ left: placement.arrowX, top: placement.arrowY, boxShadow: placement.arrowShadow }} />
      <div className={styles.titleRow}>
        <div className={styles.title} style={{ color: data.titleColor }}>
          {data.title}
        </div>
        {data.hash && <div className={styles.hash}>{data.hash}</div>}
      </div>
      {data.hasMsg && <div className={styles.msg}>{data.msg}</div>}
      {data.rows.length > 0 && (
        <div className={styles.rows}>
          {data.rows.map((row) => (
            <Fragment key={row.k}>
              <div className={styles.rowKey}>{row.k}</div>
              <div className={styles.rowValue} style={{ fontFamily: row.ff }}>
                {row.v}
              </div>
            </Fragment>
          ))}
        </div>
      )}
      {data.hasNote && <div className={styles.note}>{data.note}</div>}
    </div>
  );
}
