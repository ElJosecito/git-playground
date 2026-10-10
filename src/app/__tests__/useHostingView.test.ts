// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHostingView } from '../useHostingView';

// New behavior (design.md "File Changes": `src/app/useHostingView.ts` —
// "Route state: list/new/pr{id,tab}"). Local, unpersisted UI route state for
// the simulated hosting web view, same convention as `stripOpen`/
// `stripMobile` in `PlaygroundShell` (design: "Local useHostingView ... not
// persisted").
describe('useHostingView', () => {
  it('boots closed, on the list route', () => {
    const { result } = renderHook(() => useHostingView());
    expect(result.current.open).toBe(false);
    expect(result.current.route).toEqual({ kind: 'list' });
  });

  it('openView() opens the view and (re)resets the route to list', () => {
    const { result } = renderHook(() => useHostingView());
    act(() => result.current.goToNew());
    act(() => result.current.openView());
    expect(result.current.open).toBe(true);
    expect(result.current.route).toEqual({ kind: 'list' });
  });

  it('closeView() closes the view without touching the route', () => {
    const { result } = renderHook(() => useHostingView());
    act(() => result.current.openView());
    act(() => result.current.goToNew());
    act(() => result.current.closeView());
    expect(result.current.open).toBe(false);
    expect(result.current.route).toEqual({ kind: 'new' });
  });

  it('goToNew() then goToList() navigates between the two non-detail routes', () => {
    const { result } = renderHook(() => useHostingView());
    act(() => result.current.goToNew());
    expect(result.current.route).toEqual({ kind: 'new' });
    act(() => result.current.goToList());
    expect(result.current.route).toEqual({ kind: 'list' });
  });

  it('goToPr(id) defaults to the conversation tab; setTab() changes only the tab, keeping the id', () => {
    const { result } = renderHook(() => useHostingView());
    act(() => result.current.goToPr(7));
    expect(result.current.route).toEqual({ kind: 'pr', id: 7, tab: 'conversation' });
    act(() => result.current.setTab('commits'));
    expect(result.current.route).toEqual({ kind: 'pr', id: 7, tab: 'commits' });
  });

  it('setTab() is a no-op while on the list/new routes (no detail id to attach the tab to)', () => {
    const { result } = renderHook(() => useHostingView());
    act(() => result.current.setTab('changes'));
    expect(result.current.route).toEqual({ kind: 'list' });
  });
});
