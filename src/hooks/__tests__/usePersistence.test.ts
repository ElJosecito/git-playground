// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useCallback } from 'react';
import { renderHook, act } from '@testing-library/react';
import { usePersistence, PERSISTENCE_KEY } from '../usePersistence';
import { useGitPlayground } from '../../app/useGitPlayground';
import { vacio } from '../../engine/state';

// Oracle round trip (design-handoff/Git Playground.dc.html):
// boot: `let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}
//   const repo=saved&&saved.repo&&saved.repo.v===1?saved.repo:this.GE.ejemplo();
//   const theme=(saved&&saved.theme)||'dark';this.hist=(saved&&saved.hist)||[];`
// write: `save(repo){try{localStorage.setItem(KEY,JSON.stringify({repo:repo||
//   this.state.repo,theme:this.state.theme,hist:this.hist.slice(-100)}));}catch(e){}}`
describe('usePersistence', () => {
  beforeEach(() => localStorage.clear());

  it('falls back to ejemplo()/dark/[] when nothing is stored', () => {
    const { result } = renderHook(() => usePersistence());
    expect(result.current.initial.repo.inited).toBe(true);
    expect(result.current.initial.repo.files['README.md']).toBeDefined();
    expect(result.current.initial.theme).toBe('dark');
    expect(result.current.initial.hist).toEqual([]);
  });

  it('loads a valid v===1 repo, theme, and hist from storage', () => {
    const stored = { repo: { ...vacio(), v: 1 }, theme: 'light', hist: ['git status'] };
    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(stored));
    const { result } = renderHook(() => usePersistence());
    expect(result.current.initial.repo).toEqual(stored.repo);
    expect(result.current.initial.theme).toBe('light');
    expect(result.current.initial.hist).toEqual(['git status']);
  });

  it('falls back to ejemplo() when the stored repo has no v===1 marker (corrupt/legacy data)', () => {
    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({ repo: { inited: true }, theme: 'light', hist: [] }));
    const { result } = renderHook(() => usePersistence());
    expect(result.current.initial.repo.inited).toBe(true);
    expect(result.current.initial.repo.files['README.md']).toBeDefined();
  });

  it('falls back to defaults for corrupt JSON', () => {
    localStorage.setItem(PERSISTENCE_KEY, '{not json');
    const { result } = renderHook(() => usePersistence());
    expect(result.current.initial.theme).toBe('dark');
    expect(result.current.initial.hist).toEqual([]);
  });

  it('filters non-string hist entries defensively', () => {
    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({ hist: ['ok', 42, null] }));
    const { result } = renderHook(() => usePersistence());
    expect(result.current.initial.hist).toEqual(['ok']);
  });

  it('save() writes the full {repo, theme, hist} snapshot under the shared key', () => {
    const { result } = renderHook(() => usePersistence());
    const repo = { ...vacio(), v: 1 as const };
    act(() => result.current.save({ repo, theme: 'light', hist: ['git log'] }));
    const saved = JSON.parse(localStorage.getItem(PERSISTENCE_KEY)!);
    expect(saved).toEqual({ repo, theme: 'light', hist: ['git log'] });
  });

  it('save() caps hist to the last 100 entries', () => {
    const { result } = renderHook(() => usePersistence());
    const repo = { ...vacio(), v: 1 as const };
    const hist = Array.from({ length: 120 }, (_, i) => `cmd ${i}`);
    act(() => result.current.save({ repo, theme: 'dark', hist }));
    const saved = JSON.parse(localStorage.getItem(PERSISTENCE_KEY)!) as { hist: string[] };
    expect(saved.hist).toHaveLength(100);
    expect(saved.hist[0]).toBe('cmd 20');
    expect(saved.hist.at(-1)).toBe('cmd 119');
  });

  it('does not throw when localStorage.setItem fails', () => {
    const original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => {
      throw new Error('quota exceeded');
    };
    const { result } = renderHook(() => usePersistence());
    const repo = { ...vacio(), v: 1 as const };
    expect(() => act(() => result.current.save({ repo, theme: 'dark', hist: [] }))).not.toThrow();
    localStorage.setItem = original;
  });

  it('reads storage only once (lazy initial), even across re-renders', () => {
    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({ repo: { ...vacio(), v: 1 }, theme: 'light', hist: [] }));
    const { result, rerender } = renderHook(() => usePersistence());
    const firstInitial = result.current.initial;
    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({ repo: { ...vacio(), v: 1 }, theme: 'dark', hist: ['x'] }));
    rerender();
    expect(result.current.initial).toBe(firstInitial);
  });

  // Regression: the hook used to return a fresh `{ initial, save }` object
  // literal every render even though `initial` (useState) and `save`
  // (useCallback) were each individually stable. A caller that depends on
  // the WHOLE result object (e.g. PlaygroundShell's `persist` useCallback,
  // which lists `[persistence]` as a dep) would then see a "new" value on
  // every render and recompute downstream callbacks, which can cascade into
  // effects re-running on every unrelated rerender.
  it('returns a referentially stable result object across unrelated rerenders (useMemo)', () => {
    const { result, rerender } = renderHook(() => usePersistence());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  // Integration regression (mirrors PlaygroundShell's wiring): a `persist`
  // callback derived with `[persistence]` as its dep used to be recreated
  // every render — because `usePersistence()`'s result object was — which
  // cascaded into `useGitPlayground` recreating `run`/`loadRepo` on every
  // unrelated rerender and reinstalling `window.GitPlayground` every time.
  describe('downstream stability (PlaygroundShell-style `persist` wiring)', () => {
    afterEach(() => {
      delete (window as { GitPlayground?: unknown }).GitPlayground;
    });

    function useHost() {
      const persistence = usePersistence();
      const persist = useCallback(
        (repo: Parameters<typeof persistence.save>[0]['repo'], hist: string[]) =>
          persistence.save({ repo, theme: 'dark', hist }),
        [persistence],
      );
      return useGitPlayground(undefined, { persist });
    }

    it('does not reinstall window.GitPlayground across an unrelated rerender', () => {
      const { rerender } = renderHook(() => useHost());
      const first = window.GitPlayground;
      expect(first).toBeDefined();
      rerender();
      expect(window.GitPlayground).toBe(first);
    });
  });
});
