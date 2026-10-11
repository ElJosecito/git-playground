// Pure scroll-progress math for the landing page's scroll-drawn history
// rail and scroll-scrubbed branch/merge moments (landing-page spec
// "Scroll-Driven History Narrative"). Kept DOM-free so it is unit-tested in
// the node project; `useScrollProgress` feeds it `getBoundingClientRect()`
// numbers once per animation frame.

export interface ScrollProgressInput {
  /** Element top relative to the viewport (`getBoundingClientRect().top`). */
  top: number;
  /** Element height in px. */
  height: number;
  /** Viewport height in px (`window.innerHeight`). */
  viewportHeight: number;
  /** Fraction of the viewport (from its top) where the "read head" line
   * sits. Progress is how much of the element has passed that line. */
  anchor?: number;
}

export const DEFAULT_ANCHOR = 0.6;

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** 0 while the element's top is below the anchor line, 1 once its bottom has
 * crossed it, linear in between. A zero-height element is a step. */
export function scrollProgress({ top, height, viewportHeight, anchor = DEFAULT_ANCHOR }: ScrollProgressInput): number {
  const line = viewportHeight * anchor;
  if (Number.isNaN(top)) return 0;
  if (height <= 0) return top <= line ? 1 : 0;
  return clamp01((line - top) / height);
}

/** Re-maps the `[start, end]` slice of an overall 0..1 progress onto 0..1
 * (e.g. "the fork draws during the first 12% of the section"). */
export function segment(progress: number, start: number, end: number): number {
  if (end <= start) return progress >= start ? 1 : 0;
  return clamp01((progress - start) / (end - start));
}
