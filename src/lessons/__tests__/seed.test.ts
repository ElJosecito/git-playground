// RED (tasks.md Phase 5, 5.1): `seedOf` — a level's starting `RepoState`,
// produced by replaying `setup` through the real engine from `vacio()`
// (level-engine spec "Deterministic Setup Replay"), memoized per level
// id+version (design.md Key Decisions: "seedOf is memoized per level") so
// `LevelShell` doesn't re-replay the setup script on every render/remount
// of the same level content.
import { describe, it, expect } from 'vitest';
import { seedOf } from '../seed';
import { evaluateLevel } from '../../engine/lessons/evaluate';
import type { LevelDef } from '../../engine/lessons/types';

function level(overrides: Partial<LevelDef> = {}): LevelDef {
  return {
    id: 'seed-test',
    world: 1,
    order: 1,
    version: 1,
    title: 'Título',
    objective: 'Objetivo',
    theory: [],
    setup: ['git init'],
    solution: [],
    goals: [{ id: 'g', label: 'g', check: (s) => s.inited }],
    hints: ['pista'],
    ...overrides,
  };
}

describe('seedOf', () => {
  it('replays setup from vacio() through the real engine', () => {
    const seed = seedOf(level({ id: 'basic-seed' }));
    expect(seed.inited).toBe(true);
  });

  it('memoizes by id+version — repeated calls for the same level return the identical object', () => {
    const a = seedOf(level({ id: 'memo-1' }));
    const b = seedOf(level({ id: 'memo-1' }));
    expect(a).toBe(b);
  });

  it('does not share the cached seed across different level ids', () => {
    const a = seedOf(level({ id: 'memo-a' }));
    const b = seedOf(level({ id: 'memo-b' }));
    expect(a).not.toBe(b);
  });

  it('a fresh setup replay never pre-solves the level', () => {
    const lvl = level({ id: 'not-presolved', setup: [], goals: [{ id: 'g', label: 'g', check: (s) => s.inited }] });
    const seed = seedOf(lvl);
    expect(evaluateLevel(lvl, seed).solved).toBe(false);
  });
});
