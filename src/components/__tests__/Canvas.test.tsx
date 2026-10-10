import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Canvas } from '../Canvas';

// Ported from the DC template's canvas wrapper `<div ref="{{ canvasRef }}"
// onPointerDown="{{ canvasDown }}" style="position:absolute; inset:0;
// touch-action:none; cursor:grab; background-image:radial-gradient(...);
// background-size:24px 24px;">{{ graphEl }}</div>` (design-handoff/Git
// Playground.dc.html, line 27). Canvas itself owns no camera logic (design
// component tree: `Canvas {onPointerDown, children}`) — the camera hook
// lives one level up and is wired through `onPointerDown` plus a ref to the
// DOM node this component renders, so `useCamera`'s wheel listener and
// `getBoundingClientRect()` calls can attach to it.
describe('Canvas', () => {
  it('renders its children inside the canvas surface', () => {
    render(
      <Canvas onPointerDown={() => {}}>
        <svg data-testid="graph" />
      </Canvas>,
    );
    expect(screen.getByTestId('graph')).toBeInTheDocument();
  });

  it('forwards the ref to the underlying DOM node', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Canvas canvasRef={ref} onPointerDown={() => {}} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName.toLowerCase()).toBe('div');
  });

  it('forwards pointerdown events to the onPointerDown prop', () => {
    const onPointerDown = vi.fn();
    const { container } = render(<Canvas onPointerDown={onPointerDown} />);
    const el = container.firstElementChild as HTMLElement;
    el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(onPointerDown).toHaveBeenCalledTimes(1);
  });
});
