// Full `gitpg:v1` persistence round trip (tasks.md 7.3/7.4), 1:1 port of the
// oracle's boot + `save()` (design-handoff/Git Playground.dc.html):
//   boot: `let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}
//     const repo=saved&&saved.repo&&saved.repo.v===1?saved.repo:this.GE.ejemplo();
//     const theme=(saved&&saved.theme)||'dark';this.hist=(saved&&saved.hist)||[];`
//   write: `save(repo){try{localStorage.setItem(KEY,JSON.stringify({repo:repo||
//     this.state.repo,theme:this.state.theme,hist:this.hist.slice(-100)}));}catch(e){}}`
//
// Per design.md's hook table: "Returns `{initial: {repo, theme, hist}},
// save(snapshot)}`. Reads lazily once and checks `repo.v === 1`, falling
// back to `ejemplo()`. Saves `hist.slice(-100)`. Both read and write are
// wrapped in try/catch." `PlaygroundShell` is the only caller: it supplies
// `initial.repo`/`initial.hist` to `useGitPlayground`'s `PersistenceDeps`
// and `initial.theme` to `useTheme`, then wires `save` back into both
// (D12: explicit `persist()` in handlers, not an effect on every state
// change) — superseding `src/app/history.ts`'s hist-only slot in the real
// app (that module remains only as `useGitPlayground`'s standalone-hook
// fallback default when no `PersistenceDeps` are injected).
import { useCallback, useMemo, useState } from 'react';
import { GitEngine } from '../engine';
import type { RepoState } from '../engine/types';

export type Theme = 'dark' | 'light';

export const PERSISTENCE_KEY = 'gitpg:v1';
const MAX_HIST = 100;

export interface PersistedSnapshot {
  repo: RepoState;
  theme: Theme;
  hist: string[];
}

export interface UsePersistenceResult {
  initial: PersistedSnapshot;
  save(snapshot: PersistedSnapshot): void;
}

interface RawSnapshot {
  repo?: unknown;
  theme?: unknown;
  hist?: unknown;
}

function isRepoV1(value: unknown): value is RepoState {
  return !!value && typeof value === 'object' && (value as { v?: unknown }).v === 1;
}

function readInitial(): PersistedSnapshot {
  try {
    const raw = localStorage.getItem(PERSISTENCE_KEY);
    const saved = raw ? (JSON.parse(raw) as RawSnapshot) : null;
    const repo = isRepoV1(saved?.repo) ? saved!.repo : GitEngine.ejemplo();
    const theme: Theme = saved?.theme === 'light' ? 'light' : 'dark';
    const hist = Array.isArray(saved?.hist) ? saved!.hist!.filter((e): e is string => typeof e === 'string') : [];
    return { repo, theme, hist };
  } catch {
    return { repo: GitEngine.ejemplo(), theme: 'dark', hist: [] };
  }
}

export function usePersistence(): UsePersistenceResult {
  const [initial] = useState<PersistedSnapshot>(readInitial);

  const save = useCallback((snapshot: PersistedSnapshot): void => {
    try {
      localStorage.setItem(
        PERSISTENCE_KEY,
        JSON.stringify({ repo: snapshot.repo, theme: snapshot.theme, hist: snapshot.hist.slice(-MAX_HIST) }),
      );
    } catch {
      // Mirrors the oracle's save(): storage failures are silently ignored.
    }
  }, []);

  // Memoized so the RESULT object itself is referentially stable across
  // rerenders (not just `initial`/`save` individually) — callers that
  // depend on the whole object (e.g. `PlaygroundShell`'s `persist`
  // useCallback, which lists `[persistence]` as a dep) would otherwise
  // recompute on every unrelated rerender, cascading into effects
  // re-running (e.g. reinstalling `window.GitPlayground`) every time.
  return useMemo(() => ({ initial, save }), [initial, save]);
}
