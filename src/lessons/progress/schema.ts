// `gitpg:levels:v1` schema + parsing (level-progress spec "gitpg:levels:v1
// Schema" / design.md Contracts: "LevelsStoreV1 = {v:1, completed: {id:
// {stars, bestCount, at}}, inProgress: {id: {levelVersion, repo, hist,
// hintsUsed, solutionShown, count}}}"). Fully independent of the
// sandbox's `gitpg:v1` — its own storage key, never read or written by
// `themeStorage.ts`/`usePersistence.ts`.
//
// Parse rule (spec "In-Progress Snapshot Versioning" + level-progress
// "`gitpg:levels:v1` Schema"): corrupt JSON or `v !== 1` at the TOP level
// discards the WHOLE store (falls back to `emptyStore()`); a malformed or
// foreign in-progress snapshot (`repo.v !== 1`) is dropped on its own,
// without discarding an otherwise well-formed store. A `levelVersion`
// mismatch for a specific level is a separate, CONTEXTUAL check — done by
// `store.ts`'s `snapshotFor` at load time, not here (this module doesn't
// know which level version is "current").
import type { RepoState } from '../../engine/types';

export const LEVELS_STORAGE_KEY = 'gitpg:levels:v1';

export type Stars = 1 | 2 | 3;

export interface CompletedEntry {
  stars: Stars;
  bestCount: number;
  at: number;
}

export interface InProgressSnapshot {
  levelVersion: number;
  repo: RepoState;
  hist: string[];
  hintsUsed: number;
  solutionShown: boolean;
  count: number;
}

export interface LevelsStoreV1 {
  v: 1;
  completed: Record<string, CompletedEntry>;
  inProgress: Record<string, InProgressSnapshot>;
}

export function emptyStore(): LevelsStoreV1 {
  return { v: 1, completed: {}, inProgress: {} };
}

function isObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

function isCompletedEntry(x: unknown): x is CompletedEntry {
  return isObject(x) && typeof x.stars === 'number' && typeof x.bestCount === 'number' && typeof x.at === 'number';
}

function isSnapshot(x: unknown): x is InProgressSnapshot {
  return (
    isObject(x) &&
    typeof x.levelVersion === 'number' &&
    isObject(x.repo) &&
    (x.repo as { v?: unknown }).v === 1 &&
    Array.isArray(x.hist) &&
    typeof x.hintsUsed === 'number' &&
    typeof x.solutionShown === 'boolean' &&
    typeof x.count === 'number'
  );
}

function filteredRecord<T>(value: unknown, guard: (x: unknown) => x is T): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isObject(value)) return out;
  for (const [id, entry] of Object.entries(value)) {
    if (guard(entry)) out[id] = entry;
  }
  return out;
}

export function parseStore(raw: string | null): LevelsStoreV1 {
  if (!raw) return emptyStore();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed) || parsed.v !== 1) return emptyStore();
    return {
      v: 1,
      completed: filteredRecord(parsed.completed, isCompletedEntry),
      inProgress: filteredRecord(parsed.inProgress, isSnapshot),
    };
  } catch {
    return emptyStore();
  }
}
