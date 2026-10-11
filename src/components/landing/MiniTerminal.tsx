// Tiny decorative terminal snippet that "types itself" once its nearest
// `[data-reveal]` ancestor is revealed (landing-page spec "Scroll-Driven
// History Narrative"). Pure CSS: each command line's width steps from 0 to
// its character count (Geist Mono => 1ch per glyph) after a per-line delay
// computed here; output lines fade in once the command before them is done.
// With no armed ancestor (no JS / no IO / reduced motion) every line is
// simply rendered in full. Always `aria-hidden`: the surrounding card copy
// carries the meaning.
import type { CSSProperties } from 'react';
import styles from './MiniTerminal.module.css';

export type TerminalLineKind = 'cmd' | 'out' | 'ok' | 'err' | 'marker' | 'mine' | 'theirs';

export interface TerminalLine {
  kind: TerminalLineKind;
  text: string;
  /** Struck through and dimmed once the whole snippet has played (e.g.
   * conflict markers disappearing after a resolution). */
  resolve?: boolean;
}

const CHAR_MS = 32;
const GAP_MS = 220;

/** Per-line `{ delay, chars }` so CSS can sequence the typing. Exported for
 * tests/reuse; pure. */
export function terminalTimeline(lines: readonly TerminalLine[], baseDelay = 0): { delay: number; chars: number }[] {
  let t = baseDelay;
  return lines.map((line) => {
    const chars = line.text.length;
    const delay = t;
    t += line.kind === 'cmd' ? chars * CHAR_MS + GAP_MS : GAP_MS * 0.6;
    return { delay, chars };
  });
}

interface MiniTerminalProps {
  lines: readonly TerminalLine[];
  title?: string;
  baseDelay?: number;
  className?: string;
}

export function MiniTerminal({ lines, title = 'zsh', baseDelay = 250, className }: MiniTerminalProps) {
  const timeline = terminalTimeline(lines, baseDelay);
  const end = timeline.length > 0 ? timeline[timeline.length - 1]!.delay : 0;
  return (
    <div
      className={className ? `${styles.term} ${className}` : styles.term}
      style={{ '--end': `${end}ms` } as CSSProperties}
      aria-hidden="true"
    >
      <div className={styles.bar}>
        <span className={styles.dots}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.title}>{title}</span>
      </div>
      <div className={styles.body}>
        {lines.map((line, i) => {
          const { delay, chars } = timeline[i]!;
          const style = { '--d': `${delay}ms`, '--n': chars } as CSSProperties;
          return (
            <div
              key={i}
              className={`${styles.line} ${styles[line.kind]}${line.resolve ? ` ${styles.resolve}` : ''}`}
              style={style}
            >
              {line.kind === 'cmd' && <span className={styles.prompt}>$</span>}
              <span className={line.kind === 'cmd' ? styles.typed : styles.text}>{line.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MiniTerminal;
