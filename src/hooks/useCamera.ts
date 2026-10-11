// Pan/zoom camera over the commit graph. 1:1 port of the DC template's
// camera section (design-handoff/Git Playground.dc.html, lines 264-285,
// 495-502, 561-563): `applyCam`, `zoomAt`, `camTo`, `fitCam`/`fitAll`,
// `headPos`/`headCam`, `inView`, `w2s`, `manual`, `canvasDown`, and the
// `zoomIn`/`zoomOut`/`fitBtn`/`headBtn` button handlers.
//
// Per design D10, the camera transform is applied with an imperative
// `setAttribute` on the world `<g>` (and inline styles on the canvas div for
// the dotted-grid background), never through React props/state — so a
// re-render can never reset mid-animation camera values. The camera value
// itself (`camRef`) and the in-flight animation target (`camFinalRef`) live
// in refs for the same reason (design D10's rationale extended to storage).
//
// Deviation from design's listed `useCamera({canvasRef, envRef, reducedRef,
// onMove})` signature: this hook also takes `graphRef`, a ref snapshot of
// `{layout, headHash}` kept up to date by the caller (Canvas/App). Without
// it, `fitAll`/`headCam`/`centerHead`/`fit` could not stay zero-argument
// callables wired directly to buttons/handlers, since they need the current
// layout and HEAD hash but must not force a hook re-render on every repo
// change (that's `GraphLayer`'s job, driven by `layoutCache`).
import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { clamp, easeIO, fitCam, safeArea } from '../ui/geometry';
import type { Cam, TermBox } from '../ui/geometry';
import type { Box, Layout, Point } from '../engine/types';

export interface CameraEnv {
  vw: number;
  vh: number;
  mobile: boolean;
  term: TermBox | null;
  termMin: boolean;
}

export interface CameraGraphState {
  layout: Layout | null;
  headHash: string | null;
}

export interface UseCameraParams {
  canvasRef: RefObject<HTMLDivElement | null>;
  envRef: RefObject<CameraEnv>;
  reducedRef: RefObject<boolean>;
  graphRef: RefObject<CameraGraphState>;
  /** Called whenever the camera starts moving (manual pan/zoom or a
   * programmatic `camTo`) — mirrors the oracle clearing `state.tip` in
   * `manual()`/`camTo()`. Optional: Phase 6 wires the tooltip hook here. */
  onMove?: () => void;
}

export interface UseCameraResult {
  worldRef: RefObject<SVGGElement | null>;
  camRef: RefObject<Cam>;
  lastManualRef: RefObject<number>;
  /** The in-flight `camTo` target, or a target pre-registered directly by a
   * caller (e.g. `useChoreography`'s "wide shot" sequence, which overwrites
   * this after starting its own `camTo`, so an interrupting `finishAll()`
   * jumps straight to the eventual destination instead of the intermediate
   * one). Exposed (not just internal) for that reason — design D10's
   * "camera state lives in refs" rationale extended to this handoff. */
  camFinalRef: RefObject<Cam | null>;
  apply(): void;
  zoomAt(px: number, py: number, f: number): void;
  camTo(target: Cam, dur?: number): void;
  finish(): void;
  fitAll(dur?: number, full?: boolean): void;
  /** The pure `fitCam(box, safeArea(), maxK)` formula, with the current
   * safe area supplied internally — `useChoreography`'s camera "wide shot"
   * needs to fit an arbitrary box (not the full-repo bbox `fitAll` uses). */
  fitBox(b: Box, maxK?: number): Cam;
  headCam(k: number): Cam;
  inView(p: Point | null, margin?: number): boolean;
  w2s(p: Point): { x: number; y: number };
  markManual(): void;
  onCanvasPointerDown(e: ReactPointerEvent<HTMLDivElement>): void;
  zoomIn(): void;
  zoomOut(): void;
  fit(): void;
  centerHead(): void;
}

const DEFAULT_CAM: Cam = { x: 0, y: 0, k: 1 };

export function useCamera({ canvasRef, envRef, reducedRef, graphRef, onMove }: UseCameraParams): UseCameraResult {
  const worldRef = useRef<SVGGElement | null>(null);
  const camRef = useRef<Cam>({ ...DEFAULT_CAM });
  const lastManualRef = useRef(0);
  const camFinalRef = useRef<Cam | null>(null);
  const rafRef = useRef<number | null>(null);
  const ptrsRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  const apply = useCallback((): void => {
    const g = worldRef.current;
    const c = canvasRef.current;
    const { x, y, k } = camRef.current;
    if (g) g.setAttribute('transform', `translate(${x},${y}) scale(${k})`);
    if (c) {
      c.style.backgroundSize = `${24 * k}px ${24 * k}px`;
      c.style.backgroundPosition = `${x}px ${y}px`;
    }
  }, [canvasRef]);

  const vp = useCallback((): { W: number; H: number } => {
    const r = canvasRef.current?.getBoundingClientRect();
    const env = envRef.current;
    return { W: (r && r.width) || env.vw, H: (r && r.height) || env.vh };
  }, [canvasRef, envRef]);

  const safe = useCallback((): Box => {
    const { W, H } = vp();
    const env = envRef.current;
    return safeArea({ W, H, mobile: env.mobile, term: env.term, termMin: env.termMin });
  }, [vp, envRef]);

  const fitBox = useCallback(
    (b: Box, maxK = 1.15): Cam => fitCam(b, safe(), maxK),
    [safe],
  );

  const zoomAt = useCallback(
    (px: number, py: number, f: number): void => {
      const { x, y, k } = camRef.current;
      const k2 = clamp(k * f, 0.4, 2.5);
      camRef.current = { k: k2, x: px - (px - x) * (k2 / k), y: py - (py - y) * (k2 / k) };
      apply();
    },
    [apply],
  );

  const cancelRaf = useCallback((): void => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const camTo = useCallback(
    (target: Cam, dur = 700): void => {
      cancelRaf();
      camFinalRef.current = target;
      onMove?.();
      if (!dur) {
        camRef.current = { ...target };
        apply();
        camFinalRef.current = null;
        return;
      }
      const s = { ...camRef.current };
      const { W, H } = vp();
      const sc = { x: (W / 2 - s.x) / s.k, y: (H / 2 - s.y) / s.k };
      const tc = { x: (W / 2 - target.x) / target.k, y: (H / 2 - target.y) / target.k };
      const t0 = performance.now();
      const step = (now: number): void => {
        const p = Math.min(1, (now - t0) / dur);
        const e = easeIO(p);
        const k = Math.exp(Math.log(s.k) + (Math.log(target.k) - Math.log(s.k)) * e);
        const cx = sc.x + (tc.x - sc.x) * e;
        const cy = sc.y + (tc.y - sc.y) * e;
        camRef.current = { k, x: W / 2 - cx * k, y: H / 2 - cy * k };
        apply();
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          camFinalRef.current = null;
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [apply, vp, onMove, cancelRaf],
  );

  const finish = useCallback((): void => {
    const f = camFinalRef.current;
    if (f) {
      cancelRaf();
      camRef.current = { ...f };
      camFinalRef.current = null;
      apply();
    }
  }, [apply, cancelRaf]);

  const markManual = useCallback((): void => {
    lastManualRef.current = Date.now();
    cancelRaf();
    camFinalRef.current = null;
    onMove?.();
  }, [cancelRaf, onMove]);

  const headPos = useCallback(
    (layout: Layout): Point | null => {
      const h = graphRef.current.headHash;
      return (h && layout.pos[h]) || null;
    },
    [graphRef],
  );

  const headCam = useCallback(
    (k: number): Cam => {
      const layout = graphRef.current.layout;
      const p = (layout && headPos(layout)) || { X: 0, Y: 0 };
      const a = safe();
      return { k, x: (a.x0 + a.x1) / 2 - p.X * k, y: (a.y0 + a.y1) / 2 - p.Y * k };
    },
    [safe, headPos, graphRef],
  );

  const fitAll = useCallback(
    (dur = 700, full?: boolean): void => {
      const layout = graphRef.current.layout;
      if (!layout || !layout.bbox) {
        const a = safe();
        camTo({ k: 1, x: (a.x0 + a.x1) / 2, y: (a.y0 + a.y1) / 2 }, dur);
        return;
      }
      if (full) {
        const { W, H } = vp();
        const a: Box = envRef.current.mobile ? safe() : { x0: 40, y0: 90, x1: W - 40, y1: H - 60 };
        const b = layout.bbox;
        const k = clamp(Math.min((a.x1 - a.x0) / (b.x1 - b.x0), (a.y1 - a.y0) / (b.y1 - b.y0), 1.15), 0.4, 2.5);
        camTo(
          { k, x: (a.x0 + a.x1) / 2 - ((b.x0 + b.x1) / 2) * k, y: (a.y0 + a.y1) / 2 - ((b.y0 + b.y1) / 2) * k },
          dur,
        );
        return;
      }
      const c = fitCam(layout.bbox, safe());
      if (c.k < 0.6 && headPos(layout)) {
        camTo(headCam(0.8), dur);
        return;
      }
      camTo(c, dur);
    },
    [safe, vp, camTo, headPos, headCam, graphRef, envRef],
  );

  const inView = useCallback(
    (p: Point | null, m = 60): boolean => {
      if (!p) return true;
      const a = safe();
      const { x, y, k } = camRef.current;
      const sx = p.X * k + x;
      const sy = p.Y * k + y;
      return sx > a.x0 - 20 + m && sx < a.x1 + 20 - m && sy > a.y0 - 60 + m && sy < a.y1 - m;
    },
    [safe],
  );

  const w2s = useCallback(
    (p: Point): { x: number; y: number } => {
      const { x, y, k } = camRef.current;
      const r = canvasRef.current?.getBoundingClientRect();
      return { x: (r?.left ?? 0) + p.X * k + x, y: (r?.top ?? 0) + p.Y * k + y };
    },
    [canvasRef],
  );

  const zoomIn = useCallback((): void => {
    const { W, H } = vp();
    const k = clamp(camRef.current.k * 1.25, 0.4, 2.5);
    const f = k / camRef.current.k;
    markManual();
    camTo({ k, x: W / 2 - (W / 2 - camRef.current.x) * f, y: H / 2 - (H / 2 - camRef.current.y) * f }, 280);
  }, [vp, markManual, camTo]);

  const zoomOut = useCallback((): void => {
    const { W, H } = vp();
    const k = clamp(camRef.current.k / 1.25, 0.4, 2.5);
    const f = k / camRef.current.k;
    markManual();
    camTo({ k, x: W / 2 - (W / 2 - camRef.current.x) * f, y: H / 2 - (H / 2 - camRef.current.y) * f }, 280);
  }, [vp, markManual, camTo]);

  const fit = useCallback((): void => {
    lastManualRef.current = 0;
    fitAll(700, true);
  }, [fitAll]);

  const centerHead = useCallback((): void => {
    lastManualRef.current = 0;
    const layout = graphRef.current.layout;
    if (layout) camTo(headCam(clamp(camRef.current.k, 0.9, 1.2)), 700);
  }, [camTo, headCam, graphRef]);

  const onCanvasPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>): void => {
      const target = e.target as HTMLElement | null;
      if (target?.closest && target.closest('[data-h],[data-label],[data-stash]')) return;
      const el = canvasRef.current;
      if (!el) return;
      // Dragging the board must pan, never start a text selection over the
      // graph labels or the panels around it.
      e.preventDefault?.();
      const native = e as unknown as PointerEvent;
      try {
        el.setPointerCapture?.(native.pointerId);
      } catch {
        // Some elements (or jsdom) may not support pointer capture; ignore.
      }
      const ptrs = ptrsRef.current;
      ptrs.set(native.pointerId, { x: e.clientX, y: e.clientY });
      markManual();
      el.style.cursor = 'grabbing';
      const mv = (ev: PointerEvent): void => {
        if (!ptrs.has(ev.pointerId)) return;
        const prev = ptrs.get(ev.pointerId)!;
        if (ptrs.size === 1) {
          camRef.current = { ...camRef.current, x: camRef.current.x + ev.clientX - prev.x, y: camRef.current.y + ev.clientY - prev.y };
          apply();
        } else {
          const others = [...ptrs.entries()].filter(([k]) => k !== ev.pointerId);
          const o = others[0]![1];
          const d0 = Math.hypot(prev.x - o.x, prev.y - o.y);
          const d1 = Math.hypot(ev.clientX - o.x, ev.clientY - o.y);
          const r = el.getBoundingClientRect();
          if (d0 > 0) zoomAt((ev.clientX + o.x) / 2 - r.left, (ev.clientY + o.y) / 2 - r.top, d1 / d0);
        }
        ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        lastManualRef.current = Date.now();
      };
      const up = (ev: PointerEvent): void => {
        ptrs.delete(ev.pointerId);
        if (!ptrs.size) {
          el.removeEventListener('pointermove', mv);
          el.removeEventListener('pointerup', up);
          el.removeEventListener('pointercancel', up);
          el.style.cursor = 'grab';
        }
      };
      if (ptrs.size === 1) {
        el.addEventListener('pointermove', mv);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
      }
    },
    [canvasRef, markManual, apply, zoomAt],
  );

  // Non-passive wheel listener: `preventDefault()` must stop the browser's
  // native scroll/zoom, which a passive listener cannot do.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0016));
      zoomAt(e.clientX - r.left, e.clientY - r.top, f);
      markManual();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef.current, zoomAt, markManual]);

  useEffect(() => cancelRaf, [cancelRaf]);

  void reducedRef;

  return {
    worldRef,
    camRef,
    lastManualRef,
    camFinalRef,
    apply,
    zoomAt,
    camTo,
    finish,
    fitAll,
    fitBox,
    headCam,
    inView,
    w2s,
    markManual,
    onCanvasPointerDown,
    zoomIn,
    zoomOut,
    fit,
    centerHead,
  };
}
