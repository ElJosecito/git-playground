// Renders one colored `<span>` per segment. 1:1 port of the DC template's
// `<sc-for list="{{ ln.segs }}" as="sg"><span style="color:{{ sg.c }};
// font-weight:{{ sg.fw }};">{{ sg.t }}</span></sc-for>` (design-handoff/Git
// Playground.dc.html, line 203), reused for both terminal output lines and
// the colored prompt.
import type { Seg } from '../ui/markup';

export interface SegTextProps {
  segs: Seg[];
}

export function SegText({ segs }: SegTextProps) {
  return (
    <>
      {segs.map((seg, i) => (
        // Segments within a line have no stable identity of their own; the
        // parent (TerminalLine) is memoized by line id, so index keys here
        // are safe and match the oracle's `sc-for` behavior.
        // eslint-disable-next-line react/no-array-index-key
        <span key={i} style={{ color: seg.c, fontWeight: seg.fw }}>
          {seg.t}
        </span>
      ))}
    </>
  );
}
