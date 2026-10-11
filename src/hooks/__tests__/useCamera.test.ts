import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCamera } from '../useCamera';
import { safeArea, fitCam } from '../../ui/geometry';
import type { CameraEnv, CameraGraphState } from '../useCamera';
import type { Layout } from '../../engine/types';

// Ported from the DC template's camera section: `applyCam`, `zoomAt`,
// `camTo`, `fitCam`/`fitAll`, `headPos`/`headCam`, `inView`, `w2s`,
// `manual`, `canvasDown`, and the `zoomIn`/`zoomOut`/`fitBtn`/`headBtn`
// handlers (design-handoff/Git Playground.dc.html, lines 264-285, 495-502,
// 561-563). Camera state lives in refs and is applied via imperative
// `setAttribute`/inline style (design D10): a re-render must never reset it.

function makeEnv(overrides: Partial<CameraEnv> = {}): { current: CameraEnv } {
  return { current: { vw: 1024, vh: 768, mobile: false, term: null, termMin: false, ...overrides } };
}

function makeGraph(overrides: Partial<CameraGraphState> = {}): { current: CameraGraphState } {
  return { current: { layout: null, headHash: null, ...overrides } };
}

function setup(opts: { env?: { current: CameraEnv }; graph?: { current: CameraGraphState }; onMove?: () => void } = {}) {
  const canvasDiv = document.createElement('div');
  const canvasRef = { current: canvasDiv };
  const envRef = opts.env ?? makeEnv();
  const reducedRef = { current: false };
  const graphRef = opts.graph ?? makeGraph();
  const hook = renderHook(() => useCamera({ canvasRef, envRef, reducedRef, graphRef, onMove: opts.onMove }));
  const worldG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  hook.result.current.worldRef.current = worldG;
  return { ...hook, canvasDiv, worldG, envRef, graphRef };
}

describe('useCamera', () => {
  it('apply() sets the transform attribute on the world <g> and the background style on the canvas (D10)', () => {
    const { result, worldG, canvasDiv } = setup();
    act(() => result.current.zoomAt(50, 50, 1.25));
    expect(worldG.getAttribute('transform')).toBe(
      `translate(${result.current.camRef.current.x},${result.current.camRef.current.y}) scale(${result.current.camRef.current.k})`,
    );
    expect(canvasDiv.style.backgroundSize).toBe(`${24 * result.current.camRef.current.k}px ${24 * result.current.camRef.current.k}px`);
    expect(canvasDiv.style.backgroundPosition).toBe(`${result.current.camRef.current.x}px ${result.current.camRef.current.y}px`);
  });

  it('installs a non-passive wheel listener on the canvas element', () => {
    const canvasDiv = document.createElement('div');
    const addSpy = vi.spyOn(canvasDiv, 'addEventListener');
    const canvasRef = { current: canvasDiv };
    renderHook(() => useCamera({ canvasRef, envRef: makeEnv(), reducedRef: { current: false }, graphRef: makeGraph() }));
    expect(addSpy).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false });
  });

  it('zoomAt zooms toward the pointer, clamped to [0.4, 2.5]', () => {
    const { result } = setup();
    act(() => result.current.zoomAt(100, 100, 100));
    expect(result.current.camRef.current.k).toBe(2.5);
    act(() => result.current.zoomAt(100, 100, 0.0001));
    expect(result.current.camRef.current.k).toBe(0.4);
  });

  it('camTo with dur=0 jumps the camera instantly (no animation frame)', () => {
    const { result } = setup();
    act(() => result.current.camTo({ x: 42, y: -8, k: 1.5 }, 0));
    expect(result.current.camRef.current).toEqual({ x: 42, y: -8, k: 1.5 });
  });

  it('camTo with a duration animates, and finish() jumps straight to the target', () => {
    const { result } = setup();
    act(() => result.current.camTo({ x: 100, y: 100, k: 2 }, 700));
    // Mid-flight the camera has not reached the target yet (rAF has not run).
    expect(result.current.camRef.current).not.toEqual({ x: 100, y: 100, k: 2 });
    act(() => result.current.finish());
    expect(result.current.camRef.current).toEqual({ x: 100, y: 100, k: 2 });
  });

  it('markManual stamps lastManualRef, cancels in-flight camTo, and notifies onMove', () => {
    const onMove = vi.fn();
    const { result } = setup({ onMove });
    act(() => result.current.camTo({ x: 100, y: 100, k: 2 }, 700));
    act(() => result.current.markManual());
    expect(result.current.lastManualRef.current).toBeGreaterThan(0);
    expect(onMove).toHaveBeenCalled();
    // The in-flight animation's target was cleared, so finish() is now a no-op.
    const before = { ...result.current.camRef.current };
    act(() => result.current.finish());
    expect(result.current.camRef.current).toEqual(before);
  });

  it('fitAll centers the camera at k=1 inside the safe area when there is no layout yet', () => {
    const { result } = setup();
    act(() => result.current.fitAll(0));
    const a = safeArea({ W: 1024, H: 768, mobile: false, term: null, termMin: false });
    expect(result.current.camRef.current).toEqual({ k: 1, x: (a.x0 + a.x1) / 2, y: (a.y0 + a.y1) / 2 });
  });

  it('fitAll fits the layout bbox into the safe area (matches ui/geometry fitCam)', () => {
    const layout = { bbox: { x0: -200, y0: -100, x1: 200, y1: 100 } } as unknown as Layout;
    const { result } = setup({ graph: makeGraph({ layout }) });
    act(() => result.current.fitAll(0));
    const a = safeArea({ W: 1024, H: 768, mobile: false, term: null, termMin: false });
    const expected = fitCam(layout.bbox!, a);
    expect(result.current.camRef.current).toEqual(expected);
  });

  it('headCam centers the given zoom level on the current HEAD position', () => {
    const layout = { pos: { abc: { X: 200, Y: 300 } }, bbox: null } as unknown as Layout;
    const { result } = setup({ graph: makeGraph({ layout, headHash: 'abc' }) });
    const cam = result.current.headCam(1);
    const a = safeArea({ W: 1024, H: 768, mobile: false, term: null, termMin: false });
    expect(cam).toEqual({ k: 1, x: (a.x0 + a.x1) / 2 - 200, y: (a.y0 + a.y1) / 2 - 300 });
  });

  it('centerHead resets lastManual and camTo-s toward HEAD; finish() applies it', () => {
    const layout = { pos: { abc: { X: 200, Y: 300 } }, bbox: null } as unknown as Layout;
    const { result } = setup({ graph: makeGraph({ layout, headHash: 'abc' }) });
    act(() => {
      result.current.centerHead();
      result.current.finish();
    });
    expect(result.current.lastManualRef.current).toBe(0);
    const a = safeArea({ W: 1024, H: 768, mobile: false, term: null, termMin: false });
    expect(result.current.camRef.current).toEqual({ k: 1, x: (a.x0 + a.x1) / 2 - 200, y: (a.y0 + a.y1) / 2 - 300 });
  });

  it('w2s converts a world point to screen coordinates using the canvas rect and the camera', () => {
    const { result, canvasDiv } = setup();
    vi.spyOn(canvasDiv, 'getBoundingClientRect').mockReturnValue({ left: 50, top: 20, width: 1024, height: 768 } as DOMRect);
    act(() => result.current.camTo({ x: 10, y: 5, k: 2 }, 0));
    expect(result.current.w2s({ X: 100, Y: 50 })).toEqual({ x: 50 + 100 * 2 + 10, y: 20 + 50 * 2 + 5 });
  });

  it('inView is true for points inside the safe-area margins, false for points far outside, and true for null', () => {
    const { result } = setup();
    expect(result.current.inView(null)).toBe(true);
    expect(result.current.inView({ X: 500, Y: 400 })).toBe(true);
    expect(result.current.inView({ X: -5000, Y: 0 })).toBe(false);
  });

  it('zoomIn/zoomOut mark manual interaction and animate k by 1.25x around the viewport center; finish() jumps there', () => {
    const { result } = setup();
    act(() => {
      result.current.zoomIn();
      result.current.finish();
    });
    expect(result.current.camRef.current.k).toBeCloseTo(1.25, 10);
    expect(result.current.lastManualRef.current).toBeGreaterThan(0);
    act(() => {
      result.current.zoomOut();
      result.current.finish();
    });
    expect(result.current.camRef.current.k).toBeCloseTo(1, 10);
  });

  it('fitBox fits an arbitrary box into the safe area (the choreography "wide shot" helper)', () => {
    const { result } = setup();
    const b = { x0: -100, y0: -50, x1: 100, y1: 50 };
    const a = safeArea({ W: 1024, H: 768, mobile: false, term: null, termMin: false });
    expect(result.current.fitBox(b)).toEqual(fitCam(b, a));
    expect(result.current.fitBox(b, 0.9)).toEqual(fitCam(b, a, 0.9));
  });

  it('exposes camFinalRef so callers (useChoreography) can pre-register a pending camera target', () => {
    const { result } = setup();
    expect(result.current.camFinalRef.current).toBeNull();
    act(() => result.current.camTo({ x: 1, y: 2, k: 1.5 }, 700));
    expect(result.current.camFinalRef.current).toEqual({ x: 1, y: 2, k: 1.5 });
    act(() => {
      result.current.camFinalRef.current = { x: 9, y: 9, k: 1 };
    });
    act(() => result.current.finish());
    expect(result.current.camRef.current).toEqual({ x: 9, y: 9, k: 1 });
  });

  it('fit() resets lastManual before fitting (fitBtn)', () => {
    const { result } = setup();
    act(() => result.current.markManual());
    expect(result.current.lastManualRef.current).toBeGreaterThan(0);
    act(() => result.current.fit());
    expect(result.current.lastManualRef.current).toBe(0);
  });

  it('onCanvasPointerDown pans the camera by the pointer delta for a single pointer', () => {
    const { result, canvasDiv } = setup();
    const before = { ...result.current.camRef.current };
    act(() => {
      result.current.onCanvasPointerDown({ target: canvasDiv, pointerId: 1, clientX: 100, clientY: 100 } as unknown as React.PointerEvent<HTMLDivElement>);
    });
    act(() => {
      const mv = new MouseEvent('pointermove', { clientX: 130, clientY: 150 });
      Object.defineProperty(mv, 'pointerId', { value: 1 });
      canvasDiv.dispatchEvent(mv);
    });
    expect(result.current.camRef.current.x).toBe(before.x + 30);
    expect(result.current.camRef.current.y).toBe(before.y + 50);
    act(() => {
      const up = new MouseEvent('pointerup');
      Object.defineProperty(up, 'pointerId', { value: 1 });
      canvasDiv.dispatchEvent(up);
    });
  });

  it('onCanvasPointerDown prevents the default so dragging the board never starts a text selection', () => {
    const { result, canvasDiv } = setup();
    const preventDefault = vi.fn();
    act(() => {
      result.current.onCanvasPointerDown({ target: canvasDiv, pointerId: 3, clientX: 0, clientY: 0, preventDefault } as unknown as React.PointerEvent<HTMLDivElement>);
    });
    expect(preventDefault).toHaveBeenCalled();
    act(() => {
      const up = new MouseEvent('pointerup');
      Object.defineProperty(up, 'pointerId', { value: 3 });
      canvasDiv.dispatchEvent(up);
    });
  });

  it('onCanvasPointerDown ignores pointerdowns that target a commit/label/stash element', () => {
    const { result, canvasDiv } = setup();
    const commitEl = document.createElement('g');
    commitEl.setAttribute('data-h', 'abc123');
    canvasDiv.appendChild(commitEl);
    const before = { ...result.current.camRef.current };
    act(() => {
      result.current.onCanvasPointerDown({ target: commitEl, pointerId: 2, clientX: 0, clientY: 0 } as unknown as React.PointerEvent<HTMLDivElement>);
    });
    act(() => {
      const mv = new MouseEvent('pointermove', { clientX: 999, clientY: 999 });
      Object.defineProperty(mv, 'pointerId', { value: 2 });
      canvasDiv.dispatchEvent(mv);
    });
    expect(result.current.camRef.current).toEqual(before);
  });
});
