// @vitest-environment jsdom
// RED (tasks.md Phase 5, 5.1): a stateful wrapper over the pure
// `src/lessons/session.ts` transitions (design.md Key Decisions:
// "useLevelSession updates its ref synchronously") — `LevelShell`'s
// `persist` callback reads `ref.current` to avoid a stale closure without
// needing its own identity to change every time the session updates.
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLevelSession } from '../useLevelSession';

describe('useLevelSession', () => {
  it('starts at a fresh session (0 hints, no solution, 0 count)', () => {
    const { result } = renderHook(() => useLevelSession());
    expect(result.current.session).toEqual({ hintsUsed: 0, solutionShown: false, count: 0 });
    expect(result.current.hasUsedHints).toBe(false);
  });

  it('revealHint increments hintsUsed up to totalHints and updates the ref synchronously', () => {
    const { result } = renderHook(() => useLevelSession());
    act(() => result.current.revealHint(2));
    expect(result.current.session.hintsUsed).toBe(1);
    expect(result.current.ref.current.hintsUsed).toBe(1);
    expect(result.current.hasUsedHints).toBe(true);
    act(() => result.current.revealHint(2));
    act(() => result.current.revealHint(2));
    expect(result.current.session.hintsUsed).toBe(2);
  });

  it('showSolution sets solutionShown and counts as hints used', () => {
    const { result } = renderHook(() => useLevelSession());
    act(() => result.current.showSolution());
    expect(result.current.session.solutionShown).toBe(true);
    expect(result.current.hasUsedHints).toBe(true);
  });

  it('recordAction only increments count when counts is true', () => {
    const { result } = renderHook(() => useLevelSession());
    act(() => result.current.recordAction(false));
    expect(result.current.session.count).toBe(0);
    act(() => result.current.recordAction(true));
    expect(result.current.session.count).toBe(1);
  });

  it('reset returns to a fresh session', () => {
    const { result } = renderHook(() => useLevelSession());
    act(() => {
      result.current.revealHint(2);
      result.current.recordAction(true);
    });
    act(() => result.current.reset());
    expect(result.current.session).toEqual({ hintsUsed: 0, solutionShown: false, count: 0 });
  });

  it('accepts an initial session (snapshot restore)', () => {
    const { result } = renderHook(() => useLevelSession({ hintsUsed: 1, solutionShown: false, count: 3 }));
    expect(result.current.session).toEqual({ hintsUsed: 1, solutionShown: false, count: 3 });
    expect(result.current.hasUsedHints).toBe(true);
  });
});
