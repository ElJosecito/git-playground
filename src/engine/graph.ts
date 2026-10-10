// SVG edge-path geometry, ported from the `path` closure inside `layout()`
// in `design-handoff/git-engine.js`. Extracted to its own module so
// `layout.ts` stays focused on graph assembly.
import { DX } from './constants';
import type { Point } from './types';

export function buildEdgePath(a: Point, b: Point, i: number, sameLane: boolean): string {
  if (sameLane || Math.abs(b.X - a.X) <= DX) return `M${a.X},${a.Y} C${a.X + DX * 0.55},${a.Y} ${b.X - DX * 0.55},${b.Y} ${b.X},${b.Y}`;
  if (i === 0) return `M${a.X},${a.Y} C${a.X + DX * 0.55},${a.Y} ${a.X + DX * 0.45},${b.Y} ${a.X + DX},${b.Y} L${b.X},${b.Y}`;
  return `M${a.X},${a.Y} L${b.X - DX},${a.Y} C${b.X - DX * 0.45},${a.Y} ${b.X - DX * 0.55},${b.Y} ${b.X},${b.Y}`;
}
