// Shared "commit entry" header for every landing section (landing-page spec
// "Scroll-Driven History Narrative"): a node sitting ON the page's history
// rail, a short mono hash + commit message as the eyebrow, then the
// section's own heading/lead passed as children.
//
// The node "lands" when the rail's read-head (60% of the viewport — the
// same anchor `useScrollProgress` uses for the rail fill) reaches it, so the
// line drawing down the page and the commits popping onto it stay in sync.
// Reveal is progressive enhancement via `useReveal` (fully visible when IO
// is missing or motion is reduced).
import type { CSSProperties, ReactNode } from 'react';
import { useReveal } from '../../hooks/useReveal';
import { accentFor } from './colors';
import styles from './Commit.module.css';

export const RAIL_ANCHOR_MARGIN = '0px 0px -40% 0px';

interface CommitHeaderProps {
  hash: string;
  message: string;
  tag?: string;
  accent: number;
  children: ReactNode;
  className?: string;
}

export function CommitHeader({ hash, message, tag, accent, children, className }: CommitHeaderProps) {
  const { ref, revealProps } = useReveal<HTMLDivElement>({ rootMargin: RAIL_ANCHOR_MARGIN, threshold: 0 });
  return (
    <div
      ref={ref}
      className={className ? `${styles.header} ${className}` : styles.header}
      style={{ '--accent': accentFor(accent) } as CSSProperties}
      {...revealProps}
    >
      <p className={styles.eyebrow}>
        <span className={styles.node} aria-hidden="true" />
        <span className={styles.stub} aria-hidden="true" />
        <code className={styles.hash}>{hash}</code>
        {tag && <span className={styles.tag}>{tag}</span>}
        <span className={styles.message}>{message}</span>
      </p>
      {children}
    </div>
  );
}

export default CommitHeader;
