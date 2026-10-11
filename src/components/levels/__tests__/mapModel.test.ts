// RED (levels UI redesign): the pure view-model behind the redesigned level
// map — overall progress, per-world progress, the "Continuar" target and
// the locked-world hint. It only READS progress (stars/unlocks/inProgress
// are computed elsewhere); it never changes their semantics.
import { describe, it, expect } from 'vitest';
import { buildMapSummary, lockedHintFor, shortHash } from '../mapModel';
import type { MapLevelInput } from '../mapModel';

const LEVELS: MapLevelInput[] = [
  { id: 'a1', title: 'A uno', world: 1, order: 1 },
  { id: 'a2', title: 'A dos', world: 1, order: 2 },
  { id: 'a3', title: 'A tres', world: 1, order: 3 },
  { id: 'b1', title: 'B uno', world: 2, order: 1 },
  { id: 'b2', title: 'B dos', world: 2, order: 2 },
];

const NAMES: Record<number, string> = { 1: 'Básicos', 2: 'Ramas' };
const nameOf = (w: number) => NAMES[w] ?? `Mundo ${w}`;

describe('buildMapSummary', () => {
  it('a fresh player: nothing earned, next is the very first level and it is not a resume', () => {
    const s = buildMapSummary(LEVELS, { completed: {}, inProgress: {}, unlocked: new Set(['a1']) }, nameOf);
    expect(s.earnedStars).toBe(0);
    expect(s.maxStars).toBe(15);
    expect(s.completedLevels).toBe(0);
    expect(s.totalLevels).toBe(5);
    expect(s.next).toEqual({ id: 'a1', title: 'A uno', world: 1, order: 1, resume: false });
  });

  it('next is the first unlocked, not-completed level once some progress exists (resume)', () => {
    const s = buildMapSummary(
      LEVELS,
      { completed: { a1: { stars: 3 } }, inProgress: {}, unlocked: new Set(['a1', 'a2']) },
      nameOf,
    );
    expect(s.next).toMatchObject({ id: 'a2', resume: true });
    expect(s.earnedStars).toBe(3);
    expect(s.completedLevels).toBe(1);
  });

  it('an in-progress unlocked level wins over an earlier untouched one', () => {
    const s = buildMapSummary(
      LEVELS,
      {
        completed: { a1: { stars: 2 }, a2: { stars: 1 }, a3: { stars: 3 } },
        inProgress: { b2: {} },
        unlocked: new Set(['a1', 'a2', 'a3', 'b1', 'b2']),
      },
      nameOf,
    );
    expect(s.next).toMatchObject({ id: 'b2', resume: true });
  });

  it('next is null once every level is completed', () => {
    const completed = Object.fromEntries(LEVELS.map((l) => [l.id, { stars: 3 as const }]));
    const s = buildMapSummary(LEVELS, { completed, inProgress: {}, unlocked: new Set(LEVELS.map((l) => l.id)) }, nameOf);
    expect(s.next).toBeNull();
    expect(s.earnedStars).toBe(15);
    expect(s.completedLevels).toBe(5);
  });

  it('per-world progress: completed count, stars and the world holding the next level', () => {
    const s = buildMapSummary(
      LEVELS,
      { completed: { a1: { stars: 3 }, a2: { stars: 2 } }, inProgress: {}, unlocked: new Set(['a1', 'a2', 'a3']) },
      nameOf,
    );
    const [w1, w2] = s.worlds;
    expect(w1).toMatchObject({ world: 1, name: 'Básicos', completed: 2, total: 3, stars: 5, maxStars: 9, unlocked: true, done: false, current: true, lockedHint: null });
    expect(w1!.levels.map((l) => l.isNext)).toEqual([false, false, true]);
    expect(w2).toMatchObject({ world: 2, completed: 0, total: 2, unlocked: false, current: false });
  });

  it('a locked world explains which world unlocks it', () => {
    const s = buildMapSummary(LEVELS, { completed: {}, inProgress: {}, unlocked: new Set(['a1']) }, nameOf);
    expect(s.worlds[1]!.lockedHint).toBe('Completa Básicos para desbloquear');
  });

  it('a level only counts as in progress while it is not completed', () => {
    const s = buildMapSummary(
      LEVELS,
      { completed: { a1: { stars: 1 } }, inProgress: { a1: {} }, unlocked: new Set(['a1', 'a2']) },
      nameOf,
    );
    expect(s.worlds[0]!.levels[0]).toMatchObject({ stars: 1, inProgress: false });
  });
});

describe('shortHash', () => {
  it('is a stable 7-char lowercase hex string per id', () => {
    expect(shortHash('basics-01-primer-commit')).toMatch(/^[0-9a-f]{7}$/);
    expect(shortHash('basics-01-primer-commit')).toBe(shortHash('basics-01-primer-commit'));
    expect(shortHash('a')).not.toBe(shortHash('b'));
  });
});

describe('lockedHintFor', () => {
  it('a locked level inside an open world points at the previous level', () => {
    expect(lockedHintFor(LEVELS[2]!, LEVELS, new Set(['a1', 'a2']), nameOf)).toBe('Completa «A dos» para desbloquear');
  });

  it('a level in a locked world points at the previous world', () => {
    expect(lockedHintFor(LEVELS[4]!, LEVELS, new Set(['a1']), nameOf)).toBe('Completa Básicos para desbloquear');
  });
});
