import { describe, it, expect } from 'vitest';
import { emptyStore, parseStore } from '../schema';
import { GitEngine } from '../../../engine';

describe('parseStore (gitpg:levels:v1 schema parsing)', () => {
  it('returns an empty store for null/missing input', () => {
    expect(parseStore(null)).toEqual(emptyStore());
  });

  it('returns an empty store for corrupt (unparsable) JSON', () => {
    expect(parseStore('{not json')).toEqual(emptyStore());
  });

  it('returns an empty store when v !== 1', () => {
    expect(parseStore(JSON.stringify({ v: 2, completed: {}, inProgress: {} }))).toEqual(emptyStore());
  });

  it('returns an empty store for a non-object top level', () => {
    expect(parseStore(JSON.stringify('just a string'))).toEqual(emptyStore());
    expect(parseStore(JSON.stringify(42))).toEqual(emptyStore());
  });

  it('parses a well-formed store with completed and in-progress entries', () => {
    const repo = GitEngine.vacio();
    const raw = {
      v: 1,
      completed: { 'basics-01': { stars: 3, bestCount: 4, at: 1000 } },
      inProgress: { 'basics-02': { levelVersion: 1, repo, hist: ['git status'], hintsUsed: 1, solutionShown: false, count: 2 } },
    };
    const parsed = parseStore(JSON.stringify(raw));
    expect(parsed.completed['basics-01']).toEqual({ stars: 3, bestCount: 4, at: 1000 });
    expect(parsed.inProgress['basics-02']?.hintsUsed).toBe(1);
  });

  it('drops an in-progress snapshot whose repo.v !== 1 (foreign/corrupt snapshot)', () => {
    const raw = {
      v: 1,
      completed: {},
      inProgress: { 'basics-02': { levelVersion: 1, repo: { v: 2 }, hist: [], hintsUsed: 0, solutionShown: false, count: 0 } },
    };
    const parsed = parseStore(JSON.stringify(raw));
    expect(parsed.inProgress).toEqual({});
  });

  it('defaults missing completed/inProgress maps to empty objects', () => {
    const parsed = parseStore(JSON.stringify({ v: 1 }));
    expect(parsed).toEqual(emptyStore());
  });
});
