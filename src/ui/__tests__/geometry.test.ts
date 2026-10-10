import { describe, it, expect } from 'vitest';
import { clamp, easeIO, fitCam, safeArea } from '../geometry';

// Ported 1:1 from the DC template's `clamp`, `easeIO`, `safe()`, and
// `fitCam()` (design-handoff/Git Playground.dc.html, lines 222-223, 266,
// 276). `safeArea` takes the safe-area inputs as a plain object instead of
// reading `this.state`/`this.vp()`; `fitCam` takes the safe-area box as a
// parameter instead of recomputing it via `this.safe()`.
describe('clamp', () => {
  it('clamps a value between bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('easeIO', () => {
  it('starts at 0 and ends at 1', () => {
    expect(easeIO(0)).toBe(0);
    expect(easeIO(1)).toBe(1);
  });

  it('is symmetric around the midpoint (ease-in-out cubic)', () => {
    expect(easeIO(0.5)).toBeCloseTo(0.5, 10);
  });
});

describe('safeArea', () => {
  it('returns the mobile safe area when mobile=true, ignoring the terminal', () => {
    const a = safeArea({ W: 400, H: 800, mobile: true, term: null, termMin: false });
    expect(a).toEqual({ x0: 24, y0: 70, x1: 400 - 24, y1: 800 * 0.58 - 20 });
  });

  it('returns the full-minus-margins area when the terminal is minimized', () => {
    const a = safeArea({ W: 1024, H: 768, mobile: false, term: { x: 16, y: 400, w: 400, h: 300 }, termMin: true });
    expect(a).toEqual({ x0: 60, y0: Math.min(170, 768 * 0.2), x1: 1024 - 60, y1: 768 - 70 });
  });

  it('returns the full-minus-margins area when there is no terminal yet', () => {
    const a = safeArea({ W: 1024, H: 768, mobile: false, term: null, termMin: false });
    expect(a).toEqual({ x0: 60, y0: Math.min(170, 768 * 0.2), x1: 1024 - 60, y1: 768 - 70 });
  });

  it('picks the larger of the "above the terminal" or "right of the terminal" areas', () => {
    // Terminal sits near the bottom-left, leaving a bigger area to its right.
    const a = safeArea({ W: 1200, H: 800, mobile: false, term: { x: 16, y: 500, w: 400, h: 280 }, termMin: false });
    const top = Math.min(170, 800 * 0.2);
    const above = { x0: 60, y0: top, x1: 1200 - 60, y1: Math.max(top + 80, 500 - 30) };
    const right = { x0: Math.min(1200 - 200, 16 + 400 + 40), y0: top, x1: 1200 - 40, y1: 800 - 70 };
    const areaOf = (b: typeof above): number => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
    expect(a).toEqual(areaOf(right) > areaOf(above) ? right : above);
  });
});

describe('fitCam', () => {
  it('fits a box centered inside the safe area at maxK when it is small enough', () => {
    const box = { x0: -50, y0: -50, x1: 50, y1: 50 };
    const area = { x0: 0, y0: 0, x1: 1000, y1: 1000 };
    const cam = fitCam(box, area);
    expect(cam.k).toBe(1.15);
    expect(cam.x).toBeCloseTo(500 - 0 * 1.15, 5);
    expect(cam.y).toBeCloseTo(500 - 0 * 1.15, 5);
  });

  it('shrinks k (clamped to >= 0.4) to fit a box larger than the safe area', () => {
    const box = { x0: 0, y0: 0, x1: 2000, y1: 400 };
    const area = { x0: 0, y0: 0, x1: 1000, y1: 1000 };
    const cam = fitCam(box, area);
    expect(cam.k).toBeCloseTo(0.5, 10);
  });

  it('never exceeds k=2.5 even for a tiny box with a huge maxK', () => {
    const box = { x0: -1, y0: -1, x1: 1, y1: 1 };
    const area = { x0: 0, y0: 0, x1: 1000, y1: 1000 };
    const cam = fitCam(box, area, 999);
    expect(cam.k).toBe(2.5);
  });
});
