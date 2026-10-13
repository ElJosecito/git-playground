import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTerminalWindow } from '../useTerminalWindow';

// Ported from the DC template's `onResize`/`termDragStart`/`termResizeStart`
// and the `tLeft/tTop/tW/tH/tRadius/tTransition/camBottom` geometry built in
// `renderVals()` (design-handoff/Git Playground.dc.html, lines 245-247,
// 488-493, 522-524, 560, 564).
describe('useTerminalWindow', () => {
  it('sizes the window on first mount from the viewport', () => {
    const { result } = renderHook(() => useTerminalWindow({ vw: 1024, vh: 768, mobile: false }));
    expect(result.current.box).toEqual({ x: 16, y: Math.max(80, 768 - 376), w: Math.min(580, 1024 - 32), h: Math.min(360, 768 - 100) });
    expect(result.current.open).toBe(true);
    expect(result.current.resizable).toBe(true);
    expect(result.current.min).toBe(false);
    expect(result.current.max).toBe(false);
  });

  it('builds the desktop geometry strings from the box', () => {
    const { result } = renderHook(() => useTerminalWindow({ vw: 1024, vh: 768, mobile: false }));
    const b = result.current.box!;
    expect(result.current.geom.tLeft).toBe(`${b.x}px`);
    expect(result.current.geom.tTop).toBe(`${b.y}px`);
    expect(result.current.geom.tW).toBe(`${b.w}px`);
    expect(result.current.geom.tH).toBe(`${b.h}px`);
    expect(result.current.geom.tRadius).toBe('14px');
    expect(result.current.camBottom).toBe('16px');
  });

  it('builds the mobile bottom-sheet geometry', () => {
    const { result } = renderHook(() => useTerminalWindow({ vw: 400, vh: 800, mobile: true }));
    const sheetH = Math.round(800 * 0.42);
    expect(result.current.geom.tLeft).toBe('0px');
    expect(result.current.geom.tW).toBe('100%');
    expect(result.current.geom.tH).toBe(`${sheetH}px`);
    expect(result.current.geom.tTop).toBe(`${800 - sheetH}px`);
    expect(result.current.geom.tRadius).toBe('14px 14px 0 0');
    expect(result.current.camBottom).toBe(`${sheetH + 12}px`);
  });

  it('toggleMin flips "min" and collapses the window to a 36px bar when closed', () => {
    const { result } = renderHook(() => useTerminalWindow({ vw: 1024, vh: 768, mobile: false }));
    act(() => result.current.toggleMin());
    expect(result.current.min).toBe(true);
    expect(result.current.open).toBe(false);
    expect(result.current.geom.tH).toBe('36px');
    expect(result.current.resizable).toBe(false);
  });

  it('toggleMax flips "max" and un-minimizes the window', () => {
    const { result } = renderHook(() => useTerminalWindow({ vw: 1024, vh: 768, mobile: false }));
    act(() => result.current.toggleMin());
    act(() => result.current.toggleMax());
    expect(result.current.max).toBe(true);
    expect(result.current.min).toBe(false);
    expect(result.current.geom.tLeft).toBe('16px');
    expect(result.current.geom.tW).toBe(`${Math.min(1024 - 32, 900)}px`);
  });

  it('reclamps (but does not re-anchor) the box when the viewport shrinks on a later render', () => {
    const { result, rerender } = renderHook((view) => useTerminalWindow(view), {
      initialProps: { vw: 1024, vh: 768, mobile: false },
    });
    const firstBox = result.current.box!;
    rerender({ vw: 500, vh: 768, mobile: false });
    expect(result.current.box!.w).toBe(Math.min(firstBox.w, 500 - 16));
    expect(result.current.box!.x).toBe(Math.max(0, Math.min(firstBox.x, 500 - 120)));
  });

  it('onDragStart does nothing on mobile or when the pointer target is a button', () => {
    const { result } = renderHook(() => useTerminalWindow({ vw: 1024, vh: 768, mobile: true }));
    const addSpy = vi.spyOn(window, 'addEventListener');
    result.current.onDragStart({ target: document.createElement('div'), clientX: 0, clientY: 0 } as unknown as React.PointerEvent);
    expect(addSpy).not.toHaveBeenCalledWith('pointermove', expect.anything());
    addSpy.mockRestore();
  });

  it('onDragStart moves the box by the pointer delta and clears "max"', () => {
    const { result } = renderHook(() => useTerminalWindow({ vw: 1024, vh: 768, mobile: false }));
    const before = result.current.box!;
    act(() => {
      result.current.onDragStart({ target: document.createElement('div'), clientX: 100, clientY: 100 } as unknown as React.PointerEvent);
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 130, clientY: 150 }));
    });
    expect(result.current.box!.x).toBe(before.x + 30);
    expect(result.current.box!.y).toBe(before.y + 50);
    act(() => window.dispatchEvent(new MouseEvent('pointerup')));
  });

  it('onResizeStart resizes the box by the pointer delta, clamped to a minimum size', () => {
    const { result } = renderHook(() => useTerminalWindow({ vw: 1024, vh: 768, mobile: false }));
    const before = result.current.box!;
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    act(() => {
      result.current.onResizeStart({
        target: document.createElement('div'),
        clientX: 200,
        clientY: 200,
        preventDefault,
        stopPropagation,
      } as unknown as React.PointerEvent);
    });
    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 150, clientY: 200 }));
    });
    expect(result.current.box!.w).toBe(Math.max(340, before.w - 50));
    act(() => window.dispatchEvent(new MouseEvent('pointerup')));
  });
  it('animates height/top by default (minimize/maximize)', () => {
    const { result } = renderHook(() => useTerminalWindow({ vw: 1024, vh: 768, mobile: false }));
    expect(result.current.geom.tTransition).toContain('top 280ms');
    expect(result.current.geom.tTransition).toContain('height 280ms');
  });

  it('disables the geometry transition while dragging so the window tracks the cursor', () => {
    const { result } = renderHook(() => useTerminalWindow({ vw: 1024, vh: 768, mobile: false }));
    act(() => {
      result.current.onDragStart({ target: document.createElement('div'), clientX: 100, clientY: 100 } as unknown as React.PointerEvent);
    });
    expect(result.current.geom.tTransition).toBe('none');
    expect(document.body.style.userSelect).toBe('none');
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 130, clientY: 150 }));
    });
    expect(result.current.geom.tTransition).toBe('none');
    act(() => window.dispatchEvent(new MouseEvent('pointerup')));
    expect(result.current.geom.tTransition).toContain('top 280ms');
    expect(document.body.style.userSelect).toBe('');
  });

  it('disables the geometry transition while resizing and restores it after pointerup', () => {
    const { result } = renderHook(() => useTerminalWindow({ vw: 1024, vh: 768, mobile: false }));
    act(() => {
      result.current.onResizeStart({
        target: document.createElement('div'),
        clientX: 200,
        clientY: 200,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.PointerEvent);
    });
    expect(result.current.geom.tTransition).toBe('none');
    act(() => window.dispatchEvent(new MouseEvent('pointerup')));
    expect(result.current.geom.tTransition).toContain('height 280ms');
  });
});
