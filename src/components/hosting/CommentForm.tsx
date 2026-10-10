// Comment composer at the bottom of `ConversationTab` (spec "Pull Request
// Comments" requirement: engine appends comments authored "Tú"). New
// behavior, no oracle equivalent. Submission goes straight through
// `useGitPlayground`'s `hosting.comment` handler — same error/ok shape as
// `NewPullRequestForm`'s `onCreate` (design's data-flow diagram).
import { useState } from 'react';
import type { FormEvent } from 'react';
import { SegText } from '../SegText';
import { parseLine } from '../../ui/markup';
import type { HostingOutcome } from '../../app/useGitPlayground';
import styles from './PullRequestDetail.module.css';

export interface CommentFormProps {
  onSubmit(body: string): HostingOutcome;
}

export function CommentForm({ onSubmit }: CommentFormProps) {
  const [body, setBody] = useState('');
  const [errorLines, setErrorLines] = useState<string[] | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const outcome = onSubmit(body);
    if (outcome.ok) {
      setBody('');
      setErrorLines(null);
    } else {
      setErrorLines(outcome.lines);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.commentForm}>
      <label className={styles.commentLabel}>
        <span className={styles.label}>Comentario</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={styles.commentInput}
          placeholder="Deja un comentario"
          aria-label="Comentario"
        />
      </label>
      {errorLines && (
        <div role="alert" className={styles.error}>
          {errorLines.map((line, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i}>
              <SegText segs={parseLine(line)} />
            </div>
          ))}
        </div>
      )}
      <button type="submit" className={styles.commentSubmit}>
        Comentar
      </button>
    </form>
  );
}
