// PR detail pane inside `HostingView`: header (status/title/branches),
// close/reopen actions, 3 tabs (Conversación/Commits/Cambios), and the
// merge box for open PRs (spec "hosting-web-view" domain, "Pull Request
// Detail Tabs" / "Merge Box" requirements). New behavior, no oracle
// equivalent — everything here is derived live from `prView(id)`, never
// cached (spec "Live Commit and Diff Tracking").
import { useState } from 'react';
import { SegText } from '../SegText';
import { parseLine } from '../../ui/markup';
import { canReopen, statusBadge } from '../../ui/hostingSelectors';
import type { HostingTab } from '../../ui/hostingSelectors';
import type { PrView } from '../../engine/hosting/view';
import type { MergeStrategy } from '../../engine/hosting/types';
import type { HostingOutcome } from '../../app/useGitPlayground';
import { ConversationTab } from './ConversationTab';
import { CommitsTab } from './CommitsTab';
import { ChangesTab } from './ChangesTab';
import { MergeBox } from './MergeBox';
import styles from './PullRequestDetail.module.css';

export interface PullRequestDetailProps {
  view: PrView;
  tab: HostingTab;
  onSetTab(tab: HostingTab): void;
  onComment(id: number, body: string): HostingOutcome;
  onClose(id: number): HostingOutcome;
  onReopen(id: number): HostingOutcome;
  onMerge(id: number, strategy: MergeStrategy, deleteBranch: boolean): HostingOutcome;
  onBack(): void;
}

const TABS: { key: HostingTab; label: string }[] = [
  { key: 'conversation', label: 'Conversación' },
  { key: 'commits', label: 'Commits' },
  { key: 'changes', label: 'Cambios' },
];

export function PullRequestDetail({ view, tab, onSetTab, onComment, onClose, onReopen, onMerge, onBack }: PullRequestDetailProps) {
  const { pr, mergeability } = view;
  const badge = statusBadge(pr.status);
  const [actionErrorLines, setActionErrorLines] = useState<string[] | null>(null);

  function handleClose(): void {
    const outcome = onClose(pr.id);
    setActionErrorLines(outcome.ok ? null : outcome.lines);
  }

  function handleReopen(): void {
    const outcome = onReopen(pr.id);
    setActionErrorLines(outcome.ok ? null : outcome.lines);
  }

  return (
    <div className={styles.root}>
      <button type="button" onClick={onBack} className={styles.backLink}>
        ← Volver a la lista
      </button>

      <div className={styles.header}>
        <span className={styles.badge} style={{ color: badge.color, background: badge.bg }}>
          {badge.text}
        </span>
        <div className={styles.headerBody}>
          <div className={styles.title}>{pr.title}</div>
          <div className={styles.subtitle}>
            #{pr.id} · {pr.source} → {pr.target}
          </div>
        </div>
        {pr.status === 'open' && (
          <button type="button" onClick={handleClose} className={styles.secondaryButton}>
            Cerrar pull request
          </button>
        )}
        {canReopen(pr) && (
          <button type="button" onClick={handleReopen} className={styles.secondaryButton}>
            Reabrir pull request
          </button>
        )}
      </div>

      {actionErrorLines && (
        <div role="alert" className={styles.actionError}>
          {actionErrorLines.map((line, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i}>
              <SegText segs={parseLine(line)} />
            </div>
          ))}
        </div>
      )}

      {pr.status === 'open' && mergeability && (
        <MergeBox mergeability={mergeability} target={pr.target} onMerge={(strategy, deleteBranch) => onMerge(pr.id, strategy, deleteBranch)} />
      )}

      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => onSetTab(t.key)}
            className={tab === t.key ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.tabPanel}>
        {tab === 'conversation' && <ConversationTab pr={pr} onComment={(body) => onComment(pr.id, body)} />}
        {tab === 'commits' && <CommitsTab commits={view.commits} />}
        {tab === 'changes' && <ChangesTab files={view.files} diff={view.diff} />}
      </div>
    </div>
  );
}
