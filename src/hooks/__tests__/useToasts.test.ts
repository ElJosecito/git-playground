import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToasts } from '../useToasts';
import type { ExplainResult } from '../../engine/types';

// 1:1 port of the DC template's `toast(x)` (design-handoff/Git
// Playground.dc.html, line 335): max 2 toasts, double-rAF enter, 4000ms
// visible, 300ms leave transition before removal. Phase 6, tasks.md 6.3/6.4.
describe('useToasts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const expl: ExplainResult = { icon: '+', tone: 'success', text: 'Creaste un commit nuevo.' };

  it('starts with no toasts', () => {
    const { result } = renderHook(() => useToasts());
    expect(result.current.toasts).toEqual([]);
  });

  it('pushes a toast at opacity 0 (pre-enter) with the tone color and decoded text', () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.push(expl);
    });
    expect(result.current.toasts).toHaveLength(1);
    const t = result.current.toasts[0]!;
    expect(t.icon).toBe('+');
    expect(t.ic).toBe('var(--success)');
    expect(t.op).toBe(0);
    expect(t.tf).toBe('translateY(-8px) scale(0.98)');
    expect(t.leaving).toBeFalsy();
    expect(t.segs).toEqual([{ t: 'Creaste un commit nuevo.', ff: 'inherit', c: 'inherit', fs: 'inherit' }]);
  });

  it('maps every tone to its CSS variable, defaulting unknown tones to the info color', () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.push({ icon: '!', tone: 'danger', text: 'x' });
    });
    act(() => {
      result.current.push({ icon: '!', tone: 'warning', text: 'y' });
    });
    expect(result.current.toasts.map((t) => t.ic)).toEqual(['var(--danger)', 'var(--warning)']);
  });

  it('transitions to opacity 1 / no transform after the double requestAnimationFrame', () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.push(expl);
    });
    act(() => {
      vi.advanceTimersByTime(32);
    });
    expect(result.current.toasts[0]!.op).toBe(1);
    expect(result.current.toasts[0]!.tf).toBe('none');
  });

  it('marks the toast leaving at 4000ms and removes it 300ms later', () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.push(expl);
    });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.toasts[0]!.leaving).toBe(true);
    expect(result.current.toasts[0]!.op).toBe(0);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.toasts).toEqual([]);
  });

  it('keeps at most 2 toasts, dropping the oldest non-leaving one', () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.push({ ...expl, text: 'one' });
    });
    act(() => {
      result.current.push({ ...expl, text: 'two' });
    });
    act(() => {
      result.current.push({ ...expl, text: 'three' });
    });
    expect(result.current.toasts).toHaveLength(2);
    expect(result.current.toasts.map((t) => t.segs[0]!.t)).toEqual(['two', 'three']);
  });

  it('clears every pending timer on unmount so no late state update throws', () => {
    const { result, unmount } = renderHook(() => useToasts());
    act(() => {
      result.current.push(expl);
    });
    unmount();
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(5000);
      });
    }).not.toThrow();
  });
});
