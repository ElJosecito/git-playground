// The "Commits" tab inside `PullRequestDetail`: the PR's source-only
// commits (`prView(id).commits`, spec "Live Commit and Diff Tracking" —
// always derived from the live remote branches, never cached). New
// behavior, no oracle equivalent.
import { short } from '../../engine/util';
import type { Commit } from '../../engine/types';
import styles from './PullRequestDetail.module.css';

export interface CommitsTabProps {
  commits: Commit[];
}

export function CommitsTab({ commits }: CommitsTabProps) {
  if (commits.length === 0) {
    return <div className={styles.empty}>No hay commits para mostrar.</div>;
  }
  return (
    <ul className={styles.commitList}>
      {commits.map((c) => (
        <li key={c.hash} className={styles.commitRow}>
          <span className={styles.commitHash}>{short(c.hash)}</span>
          <span className={styles.commitMsg}>{c.msg}</span>
          <span className={styles.commitAuthor}>{c.author}</span>
        </li>
      ))}
    </ul>
  );
}
