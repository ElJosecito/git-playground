// The "Conversación" tab inside `PullRequestDetail`: the PR's timeline
// rendered as Spanish prose (via `ui/hostingSelectors.timelineText`), plus
// the comment form (spec "hosting-web-view" domain, "Pull Request Detail
// Tabs" / "Pull Request Comments" requirements). New behavior, no oracle
// equivalent.
import { timelineText } from '../../ui/hostingSelectors';
import type { PullRequest } from '../../engine/hosting/types';
import type { HostingOutcome } from '../../app/useGitPlayground';
import { CommentForm } from './CommentForm';
import styles from './PullRequestDetail.module.css';

export interface ConversationTabProps {
  pr: PullRequest;
  onComment(body: string): HostingOutcome;
}

export function ConversationTab({ pr, onComment }: ConversationTabProps) {
  return (
    <div className={styles.conversation}>
      <ul className={styles.timeline}>
        {pr.timeline.map((item, i) => (
          // Timeline items have no stable id of their own (same convention
          // as `SegText`'s segments) — the list itself is keyed by PR, which
          // is stable across renders.
          // eslint-disable-next-line react/no-array-index-key
          <li key={i} className={styles.timelineItem}>
            {item.kind === 'comment' ? (
              <>
                <div className={styles.commentAuthor}>{item.author}</div>
                <p className={styles.commentBody}>{item.body}</p>
              </>
            ) : (
              <span className={styles.timelineText}>{timelineText(item, pr)}</span>
            )}
          </li>
        ))}
      </ul>
      <CommentForm onSubmit={onComment} />
    </div>
  );
}
