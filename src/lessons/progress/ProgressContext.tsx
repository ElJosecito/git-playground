// React context wrapping the `gitpg:levels:v1` store (design.md's file
// layout: "progress: src/lessons/progress/{schema, store, stars, unlocks,
// ProgressContext}"). Takes `levels` (a flat `LevelUnlockMeta[]`) as a
// PROP rather than importing the real curriculum catalog — Phase 7's
// `worldsMeta.ts` doesn't exist yet; Phase 6's `LevelMap`/Phase 5's
// `LevelShell` will pass it once it does.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { loadStore, persistStore, withSnapshot, withClearedSnapshot, withCompletion, snapshotFor as snapshotForStore, resetProgress as resetProgressStore } from './store';
import { computeUnlocks } from './unlocks';
import type { InProgressSnapshot, LevelsStoreV1, Stars } from './schema';
import type { LevelUnlockMeta } from './unlocks';

export interface ProgressContextValue {
  store: LevelsStoreV1;
  unlocked: Set<string>;
  recordCompletion(levelId: string, result: { stars: Stars; count: number }): void;
  saveSnapshot(levelId: string, snapshot: InProgressSnapshot): void;
  clearSnapshot(levelId: string): void;
  snapshotFor(levelId: string, currentVersion: number): InProgressSnapshot | null;
  resetProgress(): void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export interface ProgressProviderProps {
  levels: readonly LevelUnlockMeta[];
  children: ReactNode;
}

export function ProgressProvider({ levels, children }: ProgressProviderProps) {
  const [store, setStore] = useState<LevelsStoreV1>(() => loadStore());

  const recordCompletion = useCallback((levelId: string, result: { stars: Stars; count: number }) => {
    setStore((prev) => persistStore(withCompletion(prev, levelId, result)));
  }, []);

  const saveSnapshot = useCallback((levelId: string, snapshot: InProgressSnapshot) => {
    setStore((prev) => persistStore(withSnapshot(prev, levelId, snapshot), levelId));
  }, []);

  const clearSnapshot = useCallback((levelId: string) => {
    setStore((prev) => persistStore(withClearedSnapshot(prev, levelId)));
  }, []);

  const snapshotFor = useCallback((levelId: string, currentVersion: number) => snapshotForStore(store, levelId, currentVersion), [store]);

  const resetProgress = useCallback(() => {
    setStore(resetProgressStore());
  }, []);

  const unlocked = useMemo(() => computeUnlocks(levels, store.completed), [levels, store.completed]);

  const value = useMemo<ProgressContextValue>(
    () => ({ store, unlocked, recordCompletion, saveSnapshot, clearSnapshot, snapshotFor, resetProgress }),
    [store, unlocked, recordCompletion, saveSnapshot, clearSnapshot, snapshotFor, resetProgress],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within a ProgressProvider');
  return ctx;
}
