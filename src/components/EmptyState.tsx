// Shown when there is nothing to draw on the canvas yet (no repo, or an
// inited repo with zero commits). 1:1 port of the DC template's empty-state
// placeholder (design-handoff/Git Playground.dc.html, lines 29-35). The
// caller (App/PlaygroundShell) decides *when* to render this — the oracle's
// `showEmpty` condition — and which of the two title/text pairs to pass.
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  title: string;
  text: string;
}

export function EmptyState({ title, text }: EmptyStateProps) {
  return (
    <div className={styles.root}>
      <div className={styles.ring} />
      <div className={styles.title}>{title}</div>
      <div className={styles.text}>{text}</div>
    </div>
  );
}
