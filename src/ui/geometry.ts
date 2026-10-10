// Camera geometry helpers, ported from the DC template's `clamp`, `easeIO`,
// `safe()`, and `fitCam()` (design-handoff/Git Playground.dc.html, lines
// 222-223, 266, 276). Pure functions with no DOM/engine access, so
// `useCamera` stays a thin imperative wrapper around them (design D10).
import type { Box } from '../engine/types';

export interface Cam {
  x: number;
  y: number;
  k: number;
}

export interface TermBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SafeAreaInput {
  W: number;
  H: number;
  mobile: boolean;
  term: TermBox | null;
  termMin: boolean;
}

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export const easeIO = (p: number): number => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/** The camera-safe viewport rectangle, excluding the terminal's (or the
 * mobile bottom-sheet's) footprint. Ported 1:1 from `safe()`. */
export function safeArea({ W, H, mobile, term, termMin }: SafeAreaInput): Box {
  if (mobile) return { x0: 24, y0: 70, x1: W - 24, y1: H * 0.58 - 20 };
  const top = Math.min(170, H * 0.2);
  if (termMin || !term) return { x0: 60, y0: top, x1: W - 60, y1: H - 70 };
  const above: Box = { x0: 60, y0: top, x1: W - 60, y1: Math.max(top + 80, term.y - 30) };
  const right: Box = { x0: Math.min(W - 200, term.x + term.w + 40), y0: top, x1: W - 40, y1: H - 70 };
  const area = (a: Box): number => Math.max(0, a.x1 - a.x0) * Math.max(0, a.y1 - a.y0);
  return area(right) > area(above) ? right : above;
}

/** The camera transform that fits box `b` centered inside safe-area box `a`.
 * Ported 1:1 from `fitCam()`, taking the safe area as a parameter instead of
 * recomputing it internally via `this.safe()`. */
export function fitCam(b: Box, a: Box, maxK = 1.15): Cam {
  const bw = Math.max(b.x1 - b.x0, 1);
  const bh = Math.max(b.y1 - b.y0, 1);
  const k = clamp(Math.min((a.x1 - a.x0) / bw, (a.y1 - a.y0) / bh, maxK), 0.4, 2.5);
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  return { k, x: (a.x0 + a.x1) / 2 - cx * k, y: (a.y0 + a.y1) / 2 - cy * k };
}
