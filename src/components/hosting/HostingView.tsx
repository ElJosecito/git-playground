// The simulated GitHub-style web view: a fake browser chrome (traffic-light
// dots + URL bar) wrapping the PR list / creation form panes (spec
// "hosting-web-view" domain, "View Toggle" requirement). New behavior, no
// oracle equivalent. Mounted by `PlaygroundShell` as a full-area overlay
// ABOVE the canvas (design: "opaque full-area browser overlay above the
// canvas") while the graph stays mounted underneath and the terminal
// window stays usable on top of it (higher z-index, see
// `PlaygroundShell.module.css`/`theme.css`'s `--z-hosting`).
//
// PR detail (tabs, merge box — Phase 4, tasks.md 4.1-4.9) renders on the
// `pr` route. An unknown PR id (no matching `prView`) falls back to
// rendering the list instead of a blank pane (design's "View state"
// decision: "An unknown PR id falls back to the list").
import { urlBarText } from '../../ui/hostingSelectors';
import type { HostingRoute, HostingTab } from '../../ui/hostingSelectors';
import type { PullRequest, MergeStrategy } from '../../engine/hosting/types';
import type { PrView } from '../../engine/hosting/view';
import type { CreatePullRequestInput } from '../../engine/hosting/create';
import type { CreatePrOutcome, HostingOutcome } from '../../app/useGitPlayground';
import { PullRequestList } from './PullRequestList';
import { NewPullRequestForm } from './NewPullRequestForm';
import { PullRequestDetail } from './PullRequestDetail';
import styles from './HostingView.module.css';

export interface HostingViewProps {
  route: HostingRoute;
  prs: PullRequest[];
  originBranches: string[];
  /** Live `prView(route.id)` data, only meaningful when `route.kind ===
   * 'pr'` — `null` for the list/new routes or an unknown PR id. */
  prView: PrView | null;
  onClose(): void;
  onGoToList(): void;
  onGoToNew(): void;
  onGoToPr(id: number): void;
  onSetTab(tab: HostingTab): void;
  onCreate(input: CreatePullRequestInput): CreatePrOutcome;
  onCommentPr(id: number, body: string): HostingOutcome;
  onClosePr(id: number): HostingOutcome;
  onReopenPr(id: number): HostingOutcome;
  onMergePr(id: number, strategy: MergeStrategy, deleteBranch: boolean): HostingOutcome;
}

export function HostingView({
  route,
  prs,
  originBranches,
  prView,
  onClose,
  onGoToList,
  onGoToNew,
  onGoToPr,
  onSetTab,
  onCreate,
  onCommentPr,
  onClosePr,
  onReopenPr,
  onMergePr,
}: HostingViewProps) {
  return (
    <div className={styles.root} role="dialog" aria-label="Pull requests en origin">
      <div className={styles.chrome}>
        <div className={styles.dots}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
        <div className={styles.urlBar}>{urlBarText(route)}</div>
        <button type="button" onClick={onClose} aria-label="Volver al repositorio" className={styles.closeButton}>
          ✕
        </button>
      </div>
      <div className={styles.body}>
        {route.kind === 'list' && <PullRequestList prs={prs} onNew={onGoToNew} onOpen={onGoToPr} />}
        {route.kind === 'new' && (
          // UX fix: a successful create navigates straight to the new PR's
          // detail (not the list) so "Abierto" is immediately visible —
          // see `NewPullRequestForm`'s `onCreated(id)`.
          <NewPullRequestForm originBranches={originBranches} onCreate={onCreate} onCreated={onGoToPr} onCancel={onGoToList} />
        )}
        {route.kind === 'pr' &&
          (prView ? (
            <PullRequestDetail
              // Remount per PR so merge strategy, "Eliminar rama" and draft
              // comments never carry over from one PR to another.
              key={prView.pr.id}
              view={prView}
              tab={route.tab}
              onSetTab={onSetTab}
              onComment={onCommentPr}
              onClose={onClosePr}
              onReopen={onReopenPr}
              onMerge={onMergePr}
              onBack={onGoToList}
            />
          ) : (
            <PullRequestList prs={prs} onNew={onGoToNew} onOpen={onGoToPr} />
          ))}
      </div>
    </div>
  );
}
