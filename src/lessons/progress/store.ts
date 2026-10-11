// `gitpg:levels:v1` read/write (level-progress spec requirements "Reload
// restores completed levels and unlocks", "Corrupt or missing ledger falls
// back safely", "In-Progress Snapshot Versioning", "Reset Progress"). All
// mutation helpers are immutable (`withX` returns a NEW store) so a caller
// (Phase 5's `ProgressContext`, this batch's own tests) can diff/replace
// React state cleanly instead of relying on in-place mutation.
import { LEVELS_STORAGE_KEY, emptyStore, parseStore } from './schema';
import type { CompletedEntry, InProgressSnapshot, LevelsStoreV1, Stars } from './schema';

export function loadStore(): LevelsStoreV1 {
  try {
    return parseStore(localStorage.getItem(LEVELS_STORAGE_KEY));
  } catch {
    return emptyStore();
  }
}

function isQuotaExceeded(e: unknown): boolean {
  return isNamedError(e) && e.name === 'QuotaExceededError';
}

function isNamedError(e: unknown): e is { name: string } {
  return !!e && typeof e === 'object' && 'name' in e;
}

function writeStore(store: LevelsStoreV1): void {
  localStorage.setItem(LEVELS_STORAGE_KEY, JSON.stringify(store));
}

/** Persists `store`. On `QuotaExceededError`, drops every in-progress
 * snapshot EXCEPT `keepLevelId` (design.md: "Snapshots: per level. On
 * QuotaExceededError, drop the other snapshots and retry once.") and
 * retries exactly once. Any further failure is silently ignored — same
 * convention as `usePersistence`/`themeStorage`. Returns whichever store
 * actually ended up persisted (or attempted), so a caller's in-memory
 * state stays consistent with storage. */
export function persistStore(store: LevelsStoreV1, keepLevelId?: string): LevelsStoreV1 {
  try {
    writeStore(store);
    return store;
  } catch (e) {
    if (!isQuotaExceeded(e)) return store;
    const kept = keepLevelId ? store.inProgress[keepLevelId] : undefined;
    const trimmed: LevelsStoreV1 = { ...store, inProgress: kept ? { [keepLevelId!]: kept } : {} };
    try {
      writeStore(trimmed);
    } catch {
      // Give up silently; the caller's in-memory state is still `trimmed`.
    }
    return trimmed;
  }
}

export function withSnapshot(store: LevelsStoreV1, levelId: string, snapshot: InProgressSnapshot): LevelsStoreV1 {
  return { ...store, inProgress: { ...store.inProgress, [levelId]: snapshot } };
}

export function withClearedSnapshot(store: LevelsStoreV1, levelId: string): LevelsStoreV1 {
  if (!(levelId in store.inProgress)) return store;
  const inProgress = { ...store.inProgress };
  delete inProgress[levelId];
  return { ...store, inProgress };
}

/** Records a completed attempt. The ledger keeps the MAX stars ever earned
 * and the MIN (best) counted-action total ever achieved (design.md:
 * "Stars: ... The ledger keeps the max."); `at` only moves forward when
 * this attempt matched or improved the best star count. Also clears any
 * in-progress snapshot for the level — it's done, there is nothing left to
 * resume. */
export function withCompletion(store: LevelsStoreV1, levelId: string, result: { stars: Stars; count: number; at?: number }): LevelsStoreV1 {
  const at = result.at ?? Date.now();
  const prev = store.completed[levelId];
  const merged: CompletedEntry = prev
    ? {
        stars: Math.max(prev.stars, result.stars) as Stars,
        bestCount: Math.min(prev.bestCount, result.count),
        at: result.stars >= prev.stars ? at : prev.at,
      }
    : { stars: result.stars, bestCount: result.count, at };
  const cleared = withClearedSnapshot(store, levelId);
  return { ...cleared, completed: { ...cleared.completed, [levelId]: merged } };
}

/** The in-progress snapshot for `levelId`, or `null` when there is none OR
 * its `levelVersion` doesn't match `currentVersion` (spec "In-Progress
 * Snapshot Versioning": "a levelVersion mismatch is discarded at load"). */
export function snapshotFor(store: LevelsStoreV1, levelId: string, currentVersion: number): InProgressSnapshot | null {
  const snap = store.inProgress[levelId];
  return snap && snap.levelVersion === currentVersion ? snap : null;
}

/** Clears ONLY `gitpg:levels:v1` (spec "Reset Progress") — never touches
 * `gitpg:v1`, which lives under a completely different key. */
export function resetProgress(): LevelsStoreV1 {
  try {
    localStorage.removeItem(LEVELS_STORAGE_KEY);
  } catch {
    // Mirrors usePersistence/themeStorage: storage failures are ignored.
  }
  return emptyStore();
}
