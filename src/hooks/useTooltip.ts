// Commit/branch/HEAD/etc. hover-tooltip state. 1:1 port of the DC
// template's `hover`/`unhover` and the document-level `onDocDown` touch
// dismissal (design-handoff/Git Playground.dc.html, lines 250, 428-430).
// `blur`/`clear` both dismiss unconditionally (focus loss and
// camera-move/command-run should always hide the tip, even a touch one) —
// `unhover` (mouse leave) deliberately leaves a touch-opened tip up, same
// as the oracle's `!this.state.tip.touch` guard.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { HoverKind } from '../components/GraphLayer';
import type { Point } from '../engine/types';

export interface TipState {
  kind: HoverKind;
  id: string;
  X: number;
  Y: number;
  r: number;
  touch?: boolean;
}

export interface UseTooltipResult {
  tip: TipState | null;
  hover(kind: HoverKind, id: string, pos: Point, r: number, touch?: boolean): void;
  unhover(): void;
  blur(): void;
  clear(): void;
}

export function useTooltip(): UseTooltipResult {
  const [tip, setTip] = useState<TipState | null>(null);
  const tipRef = useRef<TipState | null>(null);
  tipRef.current = tip;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback((): void => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearPending, [clearPending]);

  useEffect(() => {
    const onDocDown = (e: Event): void => {
      const current = tipRef.current;
      if (!current || !current.touch) return;
      const target = e.target as HTMLElement | null;
      if (!target?.closest?.('[data-h],[data-label]')) setTip(null);
    };
    document.addEventListener('pointerdown', onDocDown);
    return () => document.removeEventListener('pointerdown', onDocDown);
  }, []);

  const hover = useCallback(
    (kind: HoverKind, id: string, pos: Point, r: number, touch?: boolean): void => {
      clearPending();
      timeoutRef.current = setTimeout(() => setTip({ kind, id, X: pos.X, Y: pos.Y, r, touch }), touch ? 0 : 120);
    },
    [clearPending],
  );

  const unhover = useCallback((): void => {
    clearPending();
    if (tipRef.current && !tipRef.current.touch) setTip(null);
  }, [clearPending]);

  const blur = useCallback((): void => {
    clearPending();
    setTip(null);
  }, [clearPending]);

  const clear = useCallback((): void => {
    clearPending();
    setTip(null);
  }, [clearPending]);

  return { tip, hover, unhover, blur, clear };
}
