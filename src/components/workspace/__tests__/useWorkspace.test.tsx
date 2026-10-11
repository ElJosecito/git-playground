// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkspace } from '../useWorkspace';
import { vacio } from '../../../engine/state';

// level-player spec "Shared Component Reuse": "Level without a PR goal
// hides HostingView ... no hosting entry point appears anywhere in the
// shell." design.md Key Decisions: "graphHandlers memo (remote-box click
// only when hostingEnabled)." `hostingEnabled` defaults to `true` (the
// sandbox's unchanged behavior) — this is NEW behavior introduced by the
// Phase 2 workspace extraction, not covered by `PlaygroundShell`'s
// (unedited) approval-test suite.
describe('useWorkspace / hostingEnabled', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    delete (window as { GitPlayground?: unknown }).GitPlayground;
  });

  function repoWithRemote(result: { current: ReturnType<typeof useWorkspace> }, fromScratch = false): void {
    act(() => {
      if (fromScratch) {
        result.current.playground.run('git init');
        result.current.playground.run('echo base > base.txt');
        result.current.playground.run('git add base.txt');
        result.current.playground.run('git commit -m base');
      }
      result.current.playground.run('git checkout -b feature');
      result.current.playground.run('echo hola > notas.txt');
      result.current.playground.run('git add notas.txt');
      result.current.playground.run('git commit -m feature');
      result.current.playground.run('git push -u origin feature');
    });
  }

  it('defaults to hostingEnabled:true — hasRemote implies hostingVisible and a wired remote-box click', () => {
    const { result } = renderHook(() => useWorkspace());
    repoWithRemote(result);
    expect(result.current.hasRemote).toBe(true);
    expect(result.current.hostingVisible).toBe(true);
    expect(typeof result.current.graphHandlers.onRemoteBoxClick).toBe('function');
  });

  it('hostingEnabled:false hides hostingVisible and leaves the remote-box click unwired, even with a remote', () => {
    const { result } = renderHook(() => useWorkspace({ hostingEnabled: false }));
    repoWithRemote(result);
    expect(result.current.hasRemote).toBe(true);
    expect(result.current.hostingVisible).toBe(false);
    expect(result.current.graphHandlers.onRemoteBoxClick).toBeUndefined();
  });

  it('hostingEnabled:false does not affect hasRemote itself (teammate trigger stays independent of hosting)', () => {
    const { result } = renderHook(() =>
      useWorkspace({ hostingEnabled: false, persistence: { initialRepo: vacio() } }),
    );
    expect(result.current.hasRemote).toBe(false);
    repoWithRemote(result, true);
    expect(result.current.hasRemote).toBe(true);
    // hasRemote became true even though hosting stays disabled.
    expect(result.current.hostingVisible).toBe(false);
  });
});
