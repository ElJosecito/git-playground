// One terminal output line. 1:1 port of the DC template's `<sc-for list="{{
// lines }}" as="ln"><div style="min-height:1.55em; white-space:pre-wrap;
// tab-size:4;">…</div></sc-for>` (design-handoff/Git Playground.dc.html,
// lines 202-204). Memoized by the default shallow prop comparison: reducer
// actions never mutate past `TerminalLine` objects in place (see
// playgroundReducer's `appendLines`), so an unchanged line keeps the same
// object reference and this component skips re-rendering it.
import { memo } from 'react';
import { SegText } from './SegText';
import type { TerminalLine as TerminalLineModel } from '../app/playgroundReducer';
import styles from './TerminalLine.module.css';

export interface TerminalLineProps {
  line: TerminalLineModel;
}

function TerminalLineComponent({ line }: TerminalLineProps) {
  return (
    <div className={styles.line}>
      <SegText segs={line.segs} />
    </div>
  );
}

export const TerminalLine = memo(TerminalLineComponent);
