// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createRef } from 'react';
import { useMobile } from '../useMobile';

// Oracle (design-handoff/Git Playground.dc.html, `onResize`):
// `const r=this.canvasRef.current?this.canvasRef.current.getBoundingClientRect():null;
//   const W=r&&r.width?r.width:innerWidth,H=r&&r.height?r.height:innerHeight;
//   ...mobile:W<720...`. Installs BOTH a window `resize` listener and a
// `ResizeObserver` on the canvas element.
describe('useMobile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is mobile when the measured width is below 720', () => {
    const ref = createRef<HTMLDivElement>();
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 500, height: 800, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON() {} }),
    });
    const div = document.createElement('div');
    (ref as { current: HTMLDivElement }).current = div;
    const { result } = renderHook(() => useMobile(ref));
    expect(result.current.mobile).toBe(true);
    expect(result.current.vw).toBe(500);
    expect(result.current.vh).toBe(800);
    expect(result.current.sized).toBe(true);
  });

  it('is not mobile when the measured width is 720 or more', () => {
    const ref = createRef<HTMLDivElement>();
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 1024, height: 768, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON() {} }),
    });
    const div = document.createElement('div');
    (ref as { current: HTMLDivElement }).current = div;
    const { result } = renderHook(() => useMobile(ref));
    expect(result.current.mobile).toBe(false);
  });

  it('falls back to window.innerWidth/innerHeight when there is no measurable rect', () => {
    const ref = createRef<HTMLDivElement>();
    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('innerHeight', 900);
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON() {} }),
    });
    const { result } = renderHook(() => useMobile(ref));
    expect(result.current.vw).toBe(1280);
    expect(result.current.vh).toBe(900);
    expect(result.current.mobile).toBe(false);
  });

  it('re-measures on a window resize event', () => {
    const ref = createRef<HTMLDivElement>();
    let width = 1024;
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width, height: 768, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON() {} }),
    });
    const div = document.createElement('div');
    (ref as { current: HTMLDivElement }).current = div;
    const { result } = renderHook(() => useMobile(ref));
    expect(result.current.mobile).toBe(false);
    width = 400;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current.mobile).toBe(true);
  });
});
