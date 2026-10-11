// @vitest-environment jsdom
// Needs a real `localStorage` (jsdom provides it natively; no custom setup
// file required for that alone) — the module under test is otherwise pure
// node-testable logic, same convention as `usePersistence`/`themeStorage`.
import { describe, it, expect, beforeEach } from 'vitest';
import { GitEngine } from '../../../engine';
import { emptyStore, LEVELS_STORAGE_KEY } from '../schema';
import { loadStore, persistStore, withSnapshot, withClearedSnapshot, withCompletion, snapshotFor, resetProgress } from '../store';
import type { InProgressSnapshot } from '../schema';

function mkSnapshot(overrides: Partial<InProgressSnapshot> = {}): InProgressSnapshot {
  return { levelVersion: 1, repo: GitEngine.vacio(), hist: [], hintsUsed: 0, solutionShown: false, count: 0, ...overrides };
}

describe('level-progress store (gitpg:levels:v1)', () => {
  beforeEach(() => localStorage.clear());

  it('loadStore returns an empty store when nothing is saved yet', () => {
    expect(loadStore()).toEqual(emptyStore());
  });

  it('persistStore writes the exact store to gitpg:levels:v1, independent of gitpg:v1', () => {
    const store = withCompletion(emptyStore(), 'basics-01', { stars: 3, count: 5 });
    persistStore(store);
    const raw = JSON.parse(localStorage.getItem(LEVELS_STORAGE_KEY)!);
    expect(raw.completed['basics-01']).toMatchObject({ stars: 3, bestCount: 5 });
    expect(localStorage.getItem('gitpg:v1')).toBeNull();
  });

  it('round trips through loadStore after persistStore', () => {
    const store = withSnapshot(emptyStore(), 'basics-02', mkSnapshot({ hintsUsed: 1 }));
    persistStore(store);
    const reloaded = loadStore();
    expect(reloaded.inProgress['basics-02']?.hintsUsed).toBe(1);
  });

  it('withSnapshot/withClearedSnapshot add and remove an in-progress entry immutably', () => {
    const empty = emptyStore();
    const withIt = withSnapshot(empty, 'basics-02', mkSnapshot());
    expect(withIt).not.toBe(empty);
    expect(withIt.inProgress['basics-02']).toBeDefined();
    const cleared = withClearedSnapshot(withIt, 'basics-02');
    expect(cleared.inProgress['basics-02']).toBeUndefined();
    expect(empty.inProgress).toEqual({}); // original untouched
  });

  it('withCompletion keeps the max stars and the min (best) command count across attempts', () => {
    let store = withCompletion(emptyStore(), 'basics-01', { stars: 2, count: 8, at: 100 });
    expect(store.completed['basics-01']).toEqual({ stars: 2, bestCount: 8, at: 100 });

    // A worse attempt (fewer stars) must not downgrade the ledger.
    store = withCompletion(store, 'basics-01', { stars: 1, count: 3, at: 200 });
    expect(store.completed['basics-01']).toEqual({ stars: 2, bestCount: 3, at: 100 });

    // A better attempt (more stars) upgrades stars and refreshes `at`.
    store = withCompletion(store, 'basics-01', { stars: 3, count: 4, at: 300 });
    expect(store.completed['basics-01']).toEqual({ stars: 3, bestCount: 3, at: 300 });
  });

  it('withCompletion clears any in-progress snapshot for the completed level', () => {
    const withIt = withSnapshot(emptyStore(), 'basics-01', mkSnapshot());
    const completed = withCompletion(withIt, 'basics-01', { stars: 3, count: 1 });
    expect(completed.inProgress['basics-01']).toBeUndefined();
  });

  it('snapshotFor returns the snapshot only when levelVersion matches (stale version discarded)', () => {
    const store = withSnapshot(emptyStore(), 'basics-02', mkSnapshot({ levelVersion: 1 }));
    expect(snapshotFor(store, 'basics-02', 1)).not.toBeNull();
    expect(snapshotFor(store, 'basics-02', 2)).toBeNull();
    expect(snapshotFor(store, 'does-not-exist', 1)).toBeNull();
  });

  it('persistStore drops OTHER snapshots and retries once on QuotaExceededError, keeping the specified level', () => {
    const store = withSnapshot(withSnapshot(emptyStore(), 'basics-01', mkSnapshot()), 'basics-02', mkSnapshot({ hintsUsed: 2 }));
    const realSetItem = Storage.prototype.setItem;
    let calls = 0;
    Storage.prototype.setItem = function (key: string, value: string) {
      calls++;
      if (calls === 1) {
        const err = new Error('exceeded quota');
        err.name = 'QuotaExceededError';
        throw err;
      }
      return realSetItem.call(this, key, value);
    };
    try {
      const result = persistStore(store, 'basics-02');
      expect(result.inProgress).toEqual({ 'basics-02': store.inProgress['basics-02'] });
      const raw = JSON.parse(localStorage.getItem(LEVELS_STORAGE_KEY)!);
      expect(Object.keys(raw.inProgress)).toEqual(['basics-02']);
    } finally {
      Storage.prototype.setItem = realSetItem;
    }
  });

  it('resetProgress clears ONLY gitpg:levels:v1, leaving gitpg:v1 untouched', () => {
    localStorage.setItem('gitpg:v1', JSON.stringify({ repo: {}, theme: 'dark', hist: [] }));
    persistStore(withCompletion(emptyStore(), 'basics-01', { stars: 3, count: 1 }));
    const result = resetProgress();
    expect(result).toEqual(emptyStore());
    expect(localStorage.getItem(LEVELS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem('gitpg:v1')).not.toBeNull();
  });
});
