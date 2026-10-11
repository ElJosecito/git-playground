import { describe, it, expect } from 'vitest';
import { computeUnlocks } from '../unlocks';
import type { LevelUnlockMeta } from '../unlocks';

const LEVELS: LevelUnlockMeta[] = [
  { id: 'w1-01', world: 1, order: 1 },
  { id: 'w1-02', world: 1, order: 2 },
  { id: 'w1-03', world: 1, order: 3 },
  { id: 'w2-01', world: 2, order: 1 },
  { id: 'w2-02', world: 2, order: 2 },
];

describe('computeUnlocks (level-progress "Linear World Unlock")', () => {
  it('only the first level of world 1 is unlocked with no progress at all', () => {
    const unlocked = computeUnlocks(LEVELS, {});
    expect(unlocked.has('w1-01')).toBe(true);
    expect(unlocked.has('w1-02')).toBe(false);
    expect(unlocked.has('w1-03')).toBe(false);
    expect(unlocked.has('w2-01')).toBe(false);
  });

  it('unlocks linearly within a world as each level earns at least 1 star', () => {
    const unlocked = computeUnlocks(LEVELS, { 'w1-01': { stars: 2 } });
    expect(unlocked.has('w1-02')).toBe(true);
    expect(unlocked.has('w1-03')).toBe(false);
  });

  it('keeps the next world locked while any level in the current world has 0 stars', () => {
    const unlocked = computeUnlocks(LEVELS, { 'w1-01': { stars: 3 }, 'w1-02': { stars: 1 } });
    expect(unlocked.has('w1-03')).toBe(true);
    expect(unlocked.has('w2-01')).toBe(false);
    expect(unlocked.has('w2-02')).toBe(false);
  });

  it('unlocks the next world\'s first level once every level in the current world has >=1 star', () => {
    const unlocked = computeUnlocks(LEVELS, {
      'w1-01': { stars: 3 },
      'w1-02': { stars: 1 },
      'w1-03': { stars: 2 },
    });
    expect(unlocked.has('w2-01')).toBe(true);
    expect(unlocked.has('w2-02')).toBe(false);
  });

  it('a 0-star completion does not count as unlocking the next level (defensive: stars always >=1 once completed, but guards malformed data)', () => {
    const unlocked = computeUnlocks(LEVELS, { 'w1-01': { stars: 0 } });
    expect(unlocked.has('w1-02')).toBe(false);
  });
});
