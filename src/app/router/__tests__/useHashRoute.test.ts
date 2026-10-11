// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHashRoute } from '../useHashRoute';

// app-routing spec: "Deep link loads a level directly" and "Back button
// returns to the previous route" — this hook is the single subscription
// point other components read the current route from
// (useSyncExternalStore over hashchange, design.md's "Router: hand-rolled.
// ... useSyncExternalStore on hashchange").
describe('useHashRoute', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('reflects the landing route when the hash is empty', () => {
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.route).toEqual({ name: 'landing' });
  });

  it('deep link: boots directly into the level route for the hash present at mount', () => {
    window.location.hash = '#/niveles/basics-01-primer-commit';
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.route).toEqual({ name: 'level', id: 'basics-01-primer-commit' });
  });

  it('updates when navigate() pushes a new route', async () => {
    const { result } = renderHook(() => useHashRoute());
    act(() => result.current.navigate({ name: 'playground' }));
    await vi.waitFor(() => expect(result.current.route).toEqual({ name: 'playground' }));
  });

  it('back/forward: navigating to a second route then going back restores the first', async () => {
    const { result } = renderHook(() => useHashRoute());
    act(() => result.current.navigate({ name: 'levelMap' }));
    await vi.waitFor(() => expect(result.current.route).toEqual({ name: 'levelMap' }));
    act(() => result.current.navigate({ name: 'playground' }));
    await vi.waitFor(() => expect(result.current.route).toEqual({ name: 'playground' }));
    act(() => window.history.back());
    await vi.waitFor(() => expect(result.current.route).toEqual({ name: 'levelMap' }));
  });
});
