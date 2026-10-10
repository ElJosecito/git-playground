import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTooltip } from '../useTooltip';

// 1:1 port of the DC template's `hover`/`unhover`/`onDocDown` (design-handoff/
// Git Playground.dc.html, lines 428-430, 250): 120ms hover delay (0 for
// touch), mouse-leave only dismisses non-touch tips, and a document
// `pointerdown` listener dismisses a touch-opened tip when tapping outside
// `[data-h],[data-label]`. Phase 6, tasks.md 6.3/6.4.
describe('useTooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with no tip', () => {
    const { result } = renderHook(() => useTooltip());
    expect(result.current.tip).toBeNull();
  });

  it('sets the tip only after a 120ms hover delay', () => {
    const { result } = renderHook(() => useTooltip());
    act(() => {
      result.current.hover('commit', 'abc1234', { X: 10, Y: 20 }, 14);
    });
    expect(result.current.tip).toBeNull();
    act(() => {
      vi.advanceTimersByTime(119);
    });
    expect(result.current.tip).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.tip).toEqual({ kind: 'commit', id: 'abc1234', X: 10, Y: 20, r: 14, touch: undefined });
  });

  it('sets a touch tip immediately (no delay)', () => {
    const { result } = renderHook(() => useTooltip());
    act(() => {
      result.current.hover('commit', 'abc1234', { X: 10, Y: 20 }, 14, true);
      vi.advanceTimersByTime(0);
    });
    expect(result.current.tip).toEqual({ kind: 'commit', id: 'abc1234', X: 10, Y: 20, r: 14, touch: true });
  });

  it('unhover before the delay elapses cancels the pending hover', () => {
    const { result } = renderHook(() => useTooltip());
    act(() => {
      result.current.hover('commit', 'abc1234', { X: 0, Y: 0 }, 14);
    });
    act(() => {
      result.current.unhover();
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.tip).toBeNull();
  });

  it('unhover clears a non-touch tip', () => {
    const { result } = renderHook(() => useTooltip());
    act(() => {
      result.current.hover('branch', 'main', { X: 0, Y: 0 }, 10);
      vi.advanceTimersByTime(120);
    });
    expect(result.current.tip).not.toBeNull();
    act(() => {
      result.current.unhover();
    });
    expect(result.current.tip).toBeNull();
  });

  it('unhover does NOT clear a touch-opened tip (only a document pointerdown outside dismisses it)', () => {
    const { result } = renderHook(() => useTooltip());
    act(() => {
      result.current.hover('branch', 'main', { X: 0, Y: 0 }, 10, true);
      vi.advanceTimersByTime(0);
    });
    act(() => {
      result.current.unhover();
    });
    expect(result.current.tip).not.toBeNull();
  });

  it('blur clears the tip unconditionally, even a touch tip', () => {
    const { result } = renderHook(() => useTooltip());
    act(() => {
      result.current.hover('branch', 'main', { X: 0, Y: 0 }, 10, true);
      vi.advanceTimersByTime(0);
    });
    act(() => {
      result.current.blur();
    });
    expect(result.current.tip).toBeNull();
  });

  it('clear() dismisses any tip (used when the camera starts moving, like the oracle manual()/camTo())', () => {
    const { result } = renderHook(() => useTooltip());
    act(() => {
      result.current.hover('head', 'HEAD', { X: 0, Y: 0 }, 10);
      vi.advanceTimersByTime(120);
    });
    act(() => {
      result.current.clear();
    });
    expect(result.current.tip).toBeNull();
  });

  it('a document pointerdown outside [data-h]/[data-label] dismisses a touch tip', () => {
    const { result } = renderHook(() => useTooltip());
    act(() => {
      result.current.hover('commit', 'abc1234', { X: 0, Y: 0 }, 14, true);
      vi.advanceTimersByTime(0);
    });
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    act(() => {
      outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    });
    expect(result.current.tip).toBeNull();
    outside.remove();
  });

  it('a document pointerdown inside a [data-h] element does NOT dismiss the touch tip', () => {
    const { result } = renderHook(() => useTooltip());
    act(() => {
      result.current.hover('commit', 'abc1234', { X: 0, Y: 0 }, 14, true);
      vi.advanceTimersByTime(0);
    });
    const node = document.createElement('div');
    node.setAttribute('data-h', 'abc1234');
    document.body.appendChild(node);
    act(() => {
      node.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    });
    expect(result.current.tip).not.toBeNull();
    node.remove();
  });

  it('clears the pending hover timer on unmount (no late state update)', () => {
    const { result, unmount } = renderHook(() => useTooltip());
    act(() => {
      result.current.hover('commit', 'abc1234', { X: 0, Y: 0 }, 14);
    });
    unmount();
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(500);
      });
    }).not.toThrow();
  });
});
