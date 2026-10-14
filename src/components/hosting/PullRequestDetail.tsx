// PR detail pane inside `HostingView`: header (status/title/branches),
// close/reopen actions, 3 tabs (Conversación/Commits/Cambios), and the
// merge box for open PRs (spec "hosting-web-view" domain, "Pull Request
// Detail Tabs" / "Merge Box" requirements). New behavior, no oracle
// equivalent — everything here is derived live from `prView(id)`, never
// cached (spec "Live Commit and Diff Tracking").
import { useEffect, useRef, useState } from 'react';
import { SegText } from '../SegText';
import { codeSegs, parseLine } from '../../ui/markup';
import { canReopen, mergedLocalSyncGuidance, openPrMergeCallout, statusBadge } from '../../ui/hostingSelectors';
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
  // A11y: `HostingView` remounts this component per PR (`key={prView.pr.id}`),
  // so a plain mount-effect also covers navigating straight from PR
  // creation, or switching between two PRs — every case lands here as a
  // fresh mount. Moves focus onto the title itself (not just scrolling it
  // into view) so a screen reader announces the new PR immediately.
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

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
          <h2 ref={titleRef} tabIndex={-1} className={styles.title}>
            {pr.title}
          </h2>
          <div className={styles.subtitle}>
            <span className={styles.prNumber}>#{pr.id}</span>
            <span className={styles.branchChip}>{pr.source}</span>
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
            <span className={styles.branchChip}>{pr.target}</span>
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
        <>
          {/* UX fix: creating a PR must not read as "accepted immediately" —
           * this makes explicit that it's still open and names the merge
           * target, right above the box that actually merges it. */}
          <div className={styles.openCallout}>{openPrMergeCallout(pr.target)}</div>
          <MergeBox mergeability={mergeability} target={pr.target} onMerge={(strategy, deleteBranch) => onMerge(pr.id, strategy, deleteBranch)} />
        </>
      )}

      {pr.status === 'merged' && (
        // UX fix: a merge (manual or the "external" kind `syncHosting`
        // auto-detects) only ever writes `origin/<target>` — the local
        // branch hasn't moved, so this explains how to bring it over.
        <div className={styles.mergedCallout}>
          {codeSegs(mergedLocalSyncGuidance(pr.target)).map((sg, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <span key={i} style={{ fontFamily: sg.ff, color: sg.c, fontSize: sg.fs }}>
              {sg.t}
            </span>
          ))}
        </div>
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
