// The PR list pane inside `HostingView` (spec "hosting-web-view" domain,
// "Pull Request List" requirement). New behavior, no oracle equivalent.
import { prListItems } from '../../ui/hostingSelectors';
import type { PullRequest } from '../../engine/hosting/types';
import styles from './PullRequestList.module.css';

export interface PullRequestListProps {
  prs: PullRequest[];
  onNew(): void;
  /** Opens the PR detail (tasks.md Phase 4) — each row is clickable, same as
   * GitHub's own PR list. */
  onOpen(id: number): void;
}

export function PullRequestList({ prs, onNew, onOpen }: PullRequestListProps) {
  const items = prListItems(prs);
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>Pull requests</div>
        <button type="button" onClick={onNew} className={styles.newButton}>
          Nuevo pull request
        </button>
      </div>
      {items.length === 0 ? (
        <div className={styles.empty}>Todavía no hay pull requests.</div>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => onOpen(item.id)} className={styles.row}>
                <span className={styles.badge} style={{ color: item.badge.color, background: item.badge.bg }}>
                  {item.badge.text}
                </span>
                <div className={styles.rowBody}>
                  <div className={styles.rowTitle}>{item.title}</div>
                  <div className={styles.rowSubtitle}>{item.subtitle}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
