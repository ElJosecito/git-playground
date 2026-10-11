import { describe, it, expect } from 'vitest';
import { computeStars } from '../stars';

describe('computeStars (level-progress "Star Scoring Rule")', () => {
  it('awards 1 star whenever a hint or the solution was used, regardless of budget', () => {
    expect(computeStars({ hintsUsed: true, count: 1, budget: 10 })).toBe(1);
    expect(computeStars({ hintsUsed: true, count: 999, budget: 1 })).toBe(1);
  });

  it('awards 3 stars when no hints were used and the attempt stayed within budget', () => {
    expect(computeStars({ hintsUsed: false, count: 4, budget: 6 })).toBe(3);
    expect(computeStars({ hintsUsed: false, count: 6, budget: 6 })).toBe(3);
  });

  it('awards 2 stars when no hints were used but the attempt exceeded budget', () => {
    expect(computeStars({ hintsUsed: false, count: 7, budget: 6 })).toBe(2);
  });
});
