// Pure scroll-progress math behind the landing page's scroll-drawn history
// rail and scroll-scrubbed branch/merge moments (landing-page spec
// "Scroll-Driven History Narrative"). No DOM: every input is a plain
// number taken from `getBoundingClientRect()` / `innerHeight` by the hook.
import { describe, it, expect } from 'vitest';
import { scrollProgress, segment } from '../scrollProgress';

describe('scrollProgress', () => {
  it('is 0 while the element top is still below the anchor line', () => {
    // anchor 0.6 of an 1000px viewport = 600px line; top at 700 is below it.
    expect(scrollProgress({ top: 700, height: 2000, viewportHeight: 1000, anchor: 0.6 })).toBe(0);
  });

  it('is 0 exactly when the element top touches the anchor line', () => {
    expect(scrollProgress({ top: 600, height: 2000, viewportHeight: 1000, anchor: 0.6 })).toBe(0);
  });

  it('grows linearly as the anchor line travels down the element', () => {
    // 500px of the element have passed the 600px line -> 25% of 2000px.
    expect(scrollProgress({ top: 100, height: 2000, viewportHeight: 1000, anchor: 0.6 })).toBeCloseTo(0.25);
    expect(scrollProgress({ top: -400, height: 2000, viewportHeight: 1000, anchor: 0.6 })).toBeCloseTo(0.5);
  });

  it('clamps to 1 once the element bottom has passed the anchor line', () => {
    expect(scrollProgress({ top: -1400, height: 2000, viewportHeight: 1000, anchor: 0.6 })).toBe(1);
    expect(scrollProgress({ top: -9000, height: 2000, viewportHeight: 1000, anchor: 0.6 })).toBe(1);
  });

  it('defaults the anchor line to 60% of the viewport', () => {
    expect(scrollProgress({ top: 100, height: 2000, viewportHeight: 1000 })).toBeCloseTo(0.25);
  });

  it('treats a zero-height element as a step (0 below the line, 1 at/above it) instead of dividing by zero', () => {
    expect(scrollProgress({ top: 700, height: 0, viewportHeight: 1000 })).toBe(0);
    expect(scrollProgress({ top: 600, height: 0, viewportHeight: 1000 })).toBe(1);
    expect(scrollProgress({ top: 10, height: 0, viewportHeight: 1000 })).toBe(1);
  });

  it('never returns NaN for degenerate input', () => {
    expect(Number.isNaN(scrollProgress({ top: Number.NaN, height: 100, viewportHeight: 1000 }))).toBe(false);
    expect(scrollProgress({ top: Number.NaN, height: 100, viewportHeight: 1000 })).toBe(0);
  });
});

describe('segment', () => {
  it('maps a sub-range of the overall progress onto 0..1', () => {
    expect(segment(0.1, 0.2, 0.6)).toBe(0);
    expect(segment(0.2, 0.2, 0.6)).toBe(0);
    expect(segment(0.4, 0.2, 0.6)).toBeCloseTo(0.5);
    expect(segment(0.6, 0.2, 0.6)).toBe(1);
    expect(segment(0.9, 0.2, 0.6)).toBe(1);
  });

  it('treats an empty range as a step at its start', () => {
    expect(segment(0.49, 0.5, 0.5)).toBe(0);
    expect(segment(0.5, 0.5, 0.5)).toBe(1);
  });
});
