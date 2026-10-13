// Presentational: a feature that is not available yet, drawn as an
// unmerged branch (dashed) with a status badge.
import type { ReactNode } from 'react';
import styles from './RoadmapSection.module.css';

interface RoadmapSectionProps {
  id: string;
  branch: string;
  title: string;
  badge: string;
  tone: 'progress' | 'soon';
  children: ReactNode;
}

export function RoadmapSection({ id, branch, title, badge, tone, children }: RoadmapSectionProps) {
  const headingId = `roadmap-${id}`;
  return (
    <section className={styles.section} data-tone={tone} aria-labelledby={headingId}>
      <p className={styles.branch}>
        <code>{branch}</code>
        <span className={styles.badge}>{badge}</span>
      </p>
      <h2 id={headingId} className={styles.title}>
        {title}
      </h2>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

export default RoadmapSection;
