import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TerminalLine } from '../TerminalLine';

// Ported from the DC template's `<sc-for list="{{ lines }}" as="ln"><div
// style="min-height:1.55em; white-space:pre-wrap;">…SegText…</div></sc-for>`
// (design-handoff/Git Playground.dc.html, lines 202-204). Memoized by id so
// re-renders don't re-diff lines that never change (design.md component
// tree: "TerminalLine (memo by id)").
describe('TerminalLine', () => {
  it('renders the segments of a single terminal line', () => {
    render(<TerminalLine line={{ id: 1, segs: [{ t: 'Listo', c: 'var(--t-green)', fw: 400 }] }} />);
    expect(screen.getByText('Listo')).toBeInTheDocument();
  });

  it('is memoized: an identical line object does not re-render on a parent re-render', () => {
    const renderSpy = vi.fn();
    const line = { id: 1, segs: [{ t: 'x', c: 'y', fw: 400 }] };
    function Wrapper({ tick }: { tick: number }) {
      renderSpy(tick);
      return <TerminalLine line={line} />;
    }
    const { rerender } = render(<Wrapper tick={0} />);
    const before = screen.getByText('x');
    rerender(<Wrapper tick={1} />);
    const after = screen.getByText('x');
    // same line prop reference across both renders -> memo skips re-render,
    // so the DOM node itself is never recreated.
    expect(after).toBe(before);
  });
});
