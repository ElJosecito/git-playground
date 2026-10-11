// Decorative mini commit graph (main + a feature branch merging back) that
// draws itself when its nearest `[data-reveal]` ancestor is shown: edges
// via stroke-dashoffset (pathLength=1), commits popping in sequence. Fully
// drawn when static. Always aria-hidden.
import type { CSSProperties } from 'react';
import { accentFor } from './colors';
import styles from './MiniGraph.module.css';

const MAIN = accentFor(0);
const FEATURE = accentFor(1);

interface Dot {
  x: number;
  y: number;
  color: string;
  delay: number;
  merge?: boolean;
}

const DOTS: Dot[] = [
  { x: 28, y: 104, color: MAIN, delay: 0 },
  { x: 76, y: 104, color: MAIN, delay: 180 },
  { x: 132, y: 44, color: FEATURE, delay: 620 },
  { x: 180, y: 44, color: FEATURE, delay: 820 },
  { x: 150, y: 104, color: MAIN, delay: 1000 },
  { x: 236, y: 104, color: MAIN, delay: 1350, merge: true },
];

export function MiniGraph({ className }: { className?: string }) {
  return (
    <div className={className ? `${styles.wrap} ${className}` : styles.wrap} aria-hidden="true">
      <svg viewBox="0 0 264 140" className={styles.svg}>
        <path className={styles.edge} d="M28 104 H236" pathLength={1} stroke={MAIN} style={{ '--d': '0ms' } as CSSProperties} />
        <path
          className={styles.edge}
          d="M76 104 C104 104 104 44 132 44 H180 C208 44 208 104 236 104"
          pathLength={1}
          stroke={FEATURE}
          style={{ '--d': '420ms' } as CSSProperties}
        />
        {DOTS.map((dot, i) => (
          <circle
            key={i}
            className={dot.merge ? `${styles.dot} ${styles.merge}` : styles.dot}
            cx={dot.x}
            cy={dot.y}
            r={dot.merge ? 9 : 7}
            fill={dot.merge ? 'var(--bg-canvas)' : dot.color}
            stroke={dot.color}
            style={{ '--d': `${dot.delay}ms` } as CSSProperties}
          />
        ))}
        <text x="22" y="132" className={styles.label}>
          main
        </text>
        <text x="122" y="24" className={styles.label} fill={FEATURE}>
          feature
        </text>
      </svg>
    </div>
  );
}

export default MiniGraph;
