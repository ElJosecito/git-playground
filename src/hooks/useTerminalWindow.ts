// Terminal window geometry: drag/resize/minimize/maximize + the mobile
// bottom-sheet variant. 1:1 port of the DC template's `onResize` (first-size
// vs reposition-clamp), `termDragStart`, `termResizeStart`, and the
// `tLeft/tTop/tW/tH/tRadius/tTransition/camBottom` formulas built in
// `renderVals()` (design-handoff/Git Playground.dc.html, lines 245-247,
// 488-493, 522-524, 560, 564). `view.mobile` wiring to a real breakpoint
// detector lands with `useMobile` in Phase 7 (tasks.md 7.5/7.6); callers can
// pass a static value until then.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export interface TerminalViewport {
  vw: number;
  vh: number;
  mobile: boolean;
}

export interface TerminalBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TerminalGeometry {
  tLeft: string;
  tTop: string;
  tW: string;
  tH: string;
  tRadius: string;
  tTransition: string;
}

export interface UseTerminalWindowResult {
  geom: TerminalGeometry;
  min: boolean;
  max: boolean;
  box: TerminalBox | null;
  open: boolean;
  resizable: boolean;
  camBottom: string;
  toggleMin(): void;
  toggleMax(): void;
  onDragStart(e: ReactPointerEvent): void;
  onResizeStart(e: ReactPointerEvent): void;
}

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export function useTerminalWindow(view: TerminalViewport): UseTerminalWindowResult {
  const [box, setBox] = useState<TerminalBox | null>(null);
  const [min, setMin] = useState(false);
  const [max, setMax] = useState(false);
  // True while a drag or resize gesture is in progress: the geometry
  // transition is disabled so the window follows the pointer 1:1 instead of
  // easing behind it.
  const [interacting, setInteracting] = useState(false);
  const sizedRef = useRef(false);
  const boxRef = useRef<TerminalBox | null>(box);
  boxRef.current = box;

  useEffect(() => {
    const W = view.vw;
    const H = view.vh;
    if (!W || !H) return;
    const first = !sizedRef.current;
    sizedRef.current = true;
    setBox((t) =>
      !t || first
        ? { x: 16, y: Math.max(80, H - 376), w: Math.min(580, W - 32), h: Math.min(360, H - 100) }
        : {
            ...t,
            w: Math.min(t.w, W - 16),
            x: clamp(t.x, 0, Math.max(0, W - 120)),
            y: clamp(t.y, 0, Math.max(0, H - 60)),
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.vw, view.vh]);

  const beginGesture = useCallback((mv: (ev: PointerEvent) => void): void => {
    setInteracting(true);
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    const up = (): void => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.style.userSelect = prevUserSelect;
      setInteracting(false);
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }, []);

  const toggleMin = useCallback(() => setMin((m) => !m), []);
  const toggleMax = useCallback(() => {
    setMax((m) => !m);
    setMin(false);
  }, []);

  const onDragStart = useCallback(
    (e: ReactPointerEvent) => {
      if (view.mobile || (e.target as HTMLElement).tagName === 'BUTTON') return;
      const t = boxRef.current;
      if (!t) return;
      const sx = e.clientX;
      const sy = e.clientY;
      const ox = t.x;
      const oy = t.y;
      const mv = (ev: PointerEvent): void => {
        setBox((s) =>
          s
            ? {
                ...s,
                x: clamp(ox + ev.clientX - sx, -s.w + 120, window.innerWidth - 120),
                y: clamp(oy + ev.clientY - sy, 0, window.innerHeight - 40),
              }
            : s,
        );
        // Setting an identical value is a no-op for React (state bail-out).
        setMax(false);
      };
      beginGesture(mv);
    },
    [view.mobile, beginGesture],
  );

  const onResizeStart = useCallback((e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const t = boxRef.current;
    if (!t) return;
    const sx = e.clientX;
    const sy = e.clientY;
    const ow = t.w;
    const oh = t.h;
    const mv = (ev: PointerEvent): void => {
      setBox((s) =>
        s
          ? {
              ...s,
              w: clamp(ow + ev.clientX - sx, 340, window.innerWidth - s.x - 8),
              h: clamp(oh + ev.clientY - sy, 160, window.innerHeight - s.y - 8),
            }
          : s,
      );
      setMax(false);
    };
    beginGesture(mv);
  }, [beginGesture]);

  const open = !min;
  const mob = view.mobile;
  const VH = view.vh || 0;
  const VW = view.vw || 0;
  const sheetH = Math.round(VH * 0.42);
  const t = box ?? { x: 16, y: Math.max(80, VH - 376), w: Math.min(580, VW - 32), h: 360 };

  const tW = mob ? '100%' : max ? `${Math.min(VW - 32, 900)}px` : `${t.w}px`;
  const tH = mob ? (open ? `${sheetH}px` : '36px') : open ? `${max ? Math.min(VH - 120, 640) : t.h}px` : '36px';
  const tLeft = mob ? '0px' : max ? '16px' : `${t.x}px`;
  const tTop = mob
    ? `${VH - (open ? sheetH : 36)}px`
    : max
      ? `${Math.max(70, VH - Math.min(VH - 120, 640) - 16)}px`
      : `${open ? t.y : t.y + t.h - 36}px`;

  const geom: TerminalGeometry = {
    tLeft,
    tTop,
    tW,
    tH,
    tRadius: mob ? '14px 14px 0 0' : '14px',
    tTransition: interacting
      ? 'none'
      : 'height 280ms cubic-bezier(0.22,1,0.36,1), top 280ms cubic-bezier(0.22,1,0.36,1)',
  };

  const camBottom = mob ? `${sheetH + (open ? 0 : -sheetH + 36) + 12}px` : '16px';

  return {
    geom,
    min,
    max,
    box,
    open,
    resizable: !mob && open,
    camBottom,
    toggleMin,
    toggleMax,
    onDragStart,
    onResizeStart,
  };
}
