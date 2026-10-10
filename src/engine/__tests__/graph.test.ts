import { describe, it, expect } from 'vitest';
import { buildEdgePath } from '../graph';

describe('graph (buildEdgePath, ported from the `path` closure in git-engine.js layout())', () => {
  // Expected strings are the literal output of the oracle's `path` closure
  // for these inputs (verified by running the formula directly) — floating
  // point arithmetic on DX*.55/.45 is not exact, so these are NOT hand-typed
  // round numbers. Parity requires matching the same imprecision.
  it('uses a simple S-curve when both points are in the same lane', () => {
    const a = { X: 0, Y: 0 };
    const b = { X: 100, Y: 0 };
    expect(buildEdgePath(a, b, 0, true)).toBe('M0,0 C55.00000000000001,0 44.99999999999999,0 100,0');
  });

  it('uses a simple S-curve when the horizontal gap is within one DX, even in different lanes', () => {
    const a = { X: 0, Y: 0 };
    const b = { X: 100, Y: 120 };
    expect(buildEdgePath(a, b, 0, false)).toBe('M0,0 C55.00000000000001,0 44.99999999999999,120 100,120');
  });

  it('routes the first parent edge (i===0) outward then down for a cross-lane jump beyond DX', () => {
    const a = { X: 0, Y: 0 };
    const b = { X: 300, Y: 120 };
    expect(buildEdgePath(a, b, 0, false)).toBe('M0,0 C55.00000000000001,0 45,120 100,120 L300,120');
  });

  it('routes a second-parent edge (i!==0) down then inward for a cross-lane jump beyond DX', () => {
    const a = { X: 0, Y: 0 };
    const b = { X: 300, Y: 120 };
    expect(buildEdgePath(a, b, 1, false)).toBe('M0,0 L200,0 C255,0 245,120 300,120');
  });
});
