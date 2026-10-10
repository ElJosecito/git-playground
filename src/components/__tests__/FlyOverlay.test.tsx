import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { createRef } from 'react';
import { FlyOverlay } from '../FlyOverlay';

// 1:1 port of the DC template's overlay container
// (design-handoff/Git Playground.dc.html, line 216): `<div ref="{{
// overlayRef }}" style="position:fixed; inset:0; pointer-events:none;
// z-index:60;"></div>`. Per design D9, React renders this empty container
// once; `useChoreography`'s `fly()` appends/removes its own floating chip
// elements into it imperatively, so React never reconciles its children.
describe('FlyOverlay', () => {
  it('forwards overlayRef to an always-empty, click-through fixed container', () => {
    const overlayRef = createRef<HTMLDivElement>();
    const { container } = render(<FlyOverlay overlayRef={overlayRef} />);
    expect(overlayRef.current).not.toBeNull();
    expect(overlayRef.current?.children).toHaveLength(0);
    expect(container.firstChild).toBe(overlayRef.current);
  });

  it('does not re-render its children when a fly() chip is appended imperatively', () => {
    const overlayRef = createRef<HTMLDivElement>();
    render(<FlyOverlay overlayRef={overlayRef} />);
    const chip = document.createElement('div');
    chip.textContent = 'README.md';
    overlayRef.current!.appendChild(chip);
    expect(overlayRef.current!.children).toHaveLength(1);
    expect(overlayRef.current!.textContent).toBe('README.md');
  });
});
