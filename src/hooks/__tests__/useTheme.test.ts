// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../useTheme';

// Oracle (design-handoff/Git Playground.dc.html):
// `toggleTheme:()=>{const th=s.theme==='dark'?'light':'dark';
//   document.documentElement.dataset.theme=th;this.setState({theme:th},()=>this.save());}`
// and boot: `document.documentElement.dataset.theme=theme;` set once on load.
// Design.md's `useTheme` hook sets `documentElement.dataset.theme` on mount
// (layout effect) and on toggle, and returns `{theme, toggle}`.
describe('useTheme', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
  });

  it('sets documentElement.dataset.theme to the initial value on mount', () => {
    renderHook(() => useTheme('dark'));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('toggle() flips dark <-> light and updates the DOM', () => {
    const { result } = renderHook(() => useTheme('dark'));
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('boots from a "light" initial value', () => {
    renderHook(() => useTheme('light'));
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('calls onChange(nextTheme) exactly once per toggle, for persistence to hook into (design D12)', () => {
    const seen: string[] = [];
    const { result } = renderHook(() => useTheme('dark', (t) => seen.push(t)));
    act(() => result.current.toggle());
    expect(seen).toEqual(['light']);
    act(() => result.current.toggle());
    expect(seen).toEqual(['light', 'dark']);
  });
});
