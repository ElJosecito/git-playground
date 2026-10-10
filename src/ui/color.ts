// Ported 1:1 from the DC template's `lighten(hex,amt)` helper
// (design-handoff/Git Playground.dc.html, line 226). Used by GraphLayer to
// compute a commit node's stroke color from its fill color.

/** Blends `hex` toward white by `amt` (0..1). */
export function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r0 = n >> 16;
  const g0 = (n >> 8) & 255;
  const b0 = n & 255;
  const r = Math.round(r0 + (255 - r0) * amt);
  const g = Math.round(g0 + (255 - g0) * amt);
  const b = Math.round(b0 + (255 - b0) * amt);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
