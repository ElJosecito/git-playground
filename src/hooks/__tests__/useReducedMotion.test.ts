// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReducedMotion } from '../useReducedMotion';

// Oracle (design-handoff/Git Playground.dc.html, componentDidMount):
// `this.reduced=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;`
// — read exactly once, never re-checked afterwards.
describe('useReducedMotion', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('returns a ref holding false when the media query does not match', () => {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current.current).toBe(false);
  });

  it('returns a ref holding true when prefers-reduced-motion matches', () => {
    window.matchMedia = ((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current.current).toBe(true);
  });

  it('does not re-read matchMedia on re-render (read once)', () => {
    let calls = 0;
    window.matchMedia = ((query: string) => {
      calls += 1;
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    }) as typeof window.matchMedia;
    const { result, rerender } = renderHook(() => useReducedMotion());
    const callsAfterMount = calls;
    rerender();
    expect(calls).toBe(callsAfterMount);
    expect(result.current.current).toBe(false);
  });
});
