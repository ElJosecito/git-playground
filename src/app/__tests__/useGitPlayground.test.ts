// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGitPlayground } from '../useGitPlayground';
import { vacio } from '../../engine/state';
import { GitEngine } from '../../engine';
import type { CommandResult, RepoState } from '../../engine/types';

// Minimal stand-in for `useChoreography`'s result (design's data-flow
// diagram: "useGitPlayground (handlers): choreo.finishAll(); res=ejecutar
// (...); plan=choreo.prepare(...); ...; dispatch(...)" and "useLayoutEffect
// [transition.id] -> choreo.after()"). `useGitPlayground` only needs
// `finishAll`/`prepare`/`after`/`planRef` — it doesn't touch `refs`/
// `planVersion`.
function makeFakeChoreo(afterReturn = '') {
  return {
    planRef: { current: null as { leaving: unknown[] } | null },
    prepare: vi.fn(),
    after: vi.fn(() => afterReturn),
    finishAll: vi.fn(),
  };
}

describe('useGitPlayground', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    delete (window as { GitPlayground?: unknown }).GitPlayground;
  });

  it('boots with the example repo and the welcome banner', () => {
    const { result } = renderHook(() => useGitPlayground());
    expect(result.current.state.repo?.inited).toBe(true);
    expect(result.current.state.repo?.files['README.md']).toBeDefined();
    expect(result.current.state.lines).toHaveLength(3);
  });

  it('run() calls the engine in the handler and dispatches "applied" with the output', () => {
    const { result } = renderHook(() => useGitPlayground());
    act(() => result.current.run('git status'));
    // welcome (3) + echo (1) + at least one output line
    expect(result.current.state.lines.length).toBeGreaterThan(4);
    expect(result.current.state.input).toBe('');
  });

  it('mirrors the engine result through a repoRef so back-to-back commands see the latest state (D1)', () => {
    const { result } = renderHook(() => useGitPlayground());
    act(() => {
      result.current.run('git branch demo');
      result.current.run('git switch demo');
    });
    expect(result.current.state.repo?.head).toEqual({ type: 'branch', name: 'demo' });
  });

  it('routes an empty Enter through "echoed" without calling the engine', () => {
    const { result } = renderHook(() => useGitPlayground());
    const before = result.current.state.repo;
    act(() => result.current.run(''));
    expect(result.current.state.repo).toBe(before);
    expect(result.current.state.lines).toHaveLength(4);
  });

  it('"clear"/"cls" dispatch "cleared" (clears lines AND input)', () => {
    const { result } = renderHook(() => useGitPlayground());
    act(() => result.current.setInput('git lo'));
    act(() => result.current.run('clear'));
    expect(result.current.state.lines).toHaveLength(0);
  });

  // Oracle parity (design-handoff/Git Playground.dc.html, line 481): Ctrl+L
  // clears only the output lines, never the pending typed input. This is a
  // SEPARATE handler from `run('clear')`/`run('cls')` above.
  it('clearLines() clears only lines, leaving pending input untouched', () => {
    const { result } = renderHook(() => useGitPlayground());
    act(() => result.current.setInput('git lo'));
    act(() => result.current.clearLines());
    expect(result.current.state.lines).toHaveLength(0);
    expect(result.current.state.input).toBe('git lo');
  });

  it('opens the editor via "editorOpened" when the engine returns an "editar" accion, without applying its estado', () => {
    const { result } = renderHook(() => useGitPlayground());
    const repoBefore = result.current.state.repo;
    act(() => result.current.run('edit README.md'));
    expect(result.current.state.editor).toEqual({ file: 'README.md', text: repoBefore!.files['README.md'] });
    expect(result.current.state.repo).toBe(repoBefore);
  });

  it('openEditor() opens the editor for a given file directly, without echoing anything to the terminal (used by the conflict-resolver "Editar…" button)', () => {
    const { result } = renderHook(() => useGitPlayground());
    const linesBefore = result.current.state.lines.length;
    act(() => result.current.openEditor('README.md'));
    expect(result.current.state.editor).toEqual({ file: 'README.md', text: result.current.state.repo!.files['README.md'] });
    expect(result.current.state.lines).toHaveLength(linesBefore);
  });

  it('setEditorText() updates the open editor\'s text in place (controlled textarea)', () => {
    const { result } = renderHook(() => useGitPlayground());
    act(() => result.current.openEditor('README.md'));
    act(() => result.current.setEditorText('nuevo texto'));
    expect(result.current.state.editor).toEqual({ file: 'README.md', text: 'nuevo texto' });
  });

  it('closeEditor() closes the editor without applying any write (Cancelar)', () => {
    const { result } = renderHook(() => useGitPlayground());
    const repoBefore = result.current.state.repo;
    act(() => result.current.openEditor('README.md'));
    act(() => result.current.closeEditor());
    expect(result.current.state.editor).toBeNull();
    expect(result.current.state.repo).toBe(repoBefore);
  });

  it('saveFile() closes the editor and applies the write through the engine', () => {
    const { result } = renderHook(() => useGitPlayground());
    act(() => {
      result.current.saveFile('README.md', 'nuevo contenido');
    });
    expect(result.current.state.editor).toBeNull();
    expect(result.current.state.repo?.files['README.md']).toBe('nuevo contenido');
  });

  it('historyPrev/historyNext cycle through previously run commands', () => {
    const { result } = renderHook(() => useGitPlayground());
    act(() => {
      result.current.run('git status');
      result.current.run('git log');
    });
    act(() => result.current.historyPrev());
    expect(result.current.state.input).toBe('git log');
    act(() => result.current.historyPrev());
    expect(result.current.state.input).toBe('git status');
    act(() => result.current.historyNext());
    expect(result.current.state.input).toBe('git log');
    act(() => result.current.historyNext());
    expect(result.current.state.input).toBe('');
  });

  it('persists history under the shared gitpg:v1 storage key', () => {
    const { result } = renderHook(() => useGitPlayground());
    act(() => result.current.run('git status'));
    const saved = JSON.parse(localStorage.getItem('gitpg:v1')!) as { hist: string[] };
    expect(saved.hist).toEqual(['git status']);
  });

  describe('persistence wiring (design D12: explicit persist() in handlers)', () => {
    function makePersistenceSpy() {
      const initialRepo = vacio();
      initialRepo.inited = true;
      const persist = vi.fn();
      return { initialRepo, persist };
    }

    it('boots from an injected initialRepo/initialHist instead of ejemplo()', () => {
      const { initialRepo, persist } = makePersistenceSpy();
      const { result } = renderHook(() =>
        useGitPlayground(undefined, { initialRepo, initialHist: ['old cmd'], persist }),
      );
      expect(result.current.state.repo).toBe(initialRepo);
      act(() => result.current.historyPrev());
      expect(result.current.state.input).toBe('old cmd');
    });

    it('calls persist(repo, hist) with the NEW repo after a command applies (oracle: apply() -> save(next))', () => {
      const { initialRepo, persist } = makePersistenceSpy();
      const { result } = renderHook(() => useGitPlayground(undefined, { initialRepo, persist }));
      act(() => result.current.run('git status'));
      expect(persist).toHaveBeenCalledWith(result.current.state.repo, ['git status']);
    });

    it('calls persist() on clear/cls with the unchanged repo', () => {
      const { initialRepo, persist } = makePersistenceSpy();
      const { result } = renderHook(() => useGitPlayground(undefined, { initialRepo, persist }));
      act(() => result.current.run('clear'));
      expect(persist).toHaveBeenCalledWith(initialRepo, ['clear']);
    });

    it('calls persist() on loadRepo() with the new repo (oracle: loadRepo -> save(estado))', () => {
      const { initialRepo, persist } = makePersistenceSpy();
      const { result } = renderHook(() => useGitPlayground(undefined, { initialRepo, persist }));
      const fresh = vacio();
      act(() => result.current.loadRepo(fresh));
      expect(persist).toHaveBeenCalledWith(fresh, []);
    });

    it('does NOT call persist() when the engine opens the editor (oracle: no save() on the editar accion path)', () => {
      const { initialRepo, persist } = makePersistenceSpy();
      const { result } = renderHook(() => useGitPlayground(undefined, { initialRepo, persist }));
      act(() => result.current.run('edit README.md'));
      expect(persist).not.toHaveBeenCalled();
    });

    // Oracle: `toggleTheme:()=>{...this.setState({theme:th},()=>this.save());}`
    // — `save()` with no arg defaults to the CURRENT repo. Theme is owned
    // one level up (`useTheme`, not `useGitPlayground`), so the shell calls
    // this escape hatch from `useTheme`'s `onChange` instead.
    it('persistNow() calls persist(repo, hist) with the current repo/hist on demand', () => {
      const { initialRepo, persist } = makePersistenceSpy();
      const { result } = renderHook(() =>
        useGitPlayground(undefined, { initialRepo, initialHist: ['git log'], persist }),
      );
      act(() => result.current.persistNow());
      expect(persist).toHaveBeenCalledWith(initialRepo, ['git log']);
    });
  });

  it('completeInput() fills in a single unambiguous candidate', () => {
    const { result } = renderHook(() => useGitPlayground());
    act(() => result.current.completeInput('git stat'));
    expect(result.current.state.input).toBe('git status ');
  });

  it('completeInput() lists ambiguous candidates as a plain line without clearing input', () => {
    const { result } = renderHook(() => useGitPlayground());
    act(() => result.current.setInput('git re'));
    act(() => result.current.completeInput('git re'));
    expect(result.current.state.input).toBe('git re');
    expect(result.current.state.lines.length).toBeGreaterThan(3);
  });

  it('installs window.GitPlayground with the documented debug shape', () => {
    renderHook(() => useGitPlayground());
    expect(window.GitPlayground).toBeDefined();
    expect(typeof window.GitPlayground!.estado).toBe('function');
    expect(typeof window.GitPlayground!.ejecutar).toBe('function');
    expect(typeof window.GitPlayground!.motor).toBe('function');
    expect(typeof window.GitPlayground!.cargar).toBe('function');
  });

  it('window.GitPlayground.cargar() loads a repo via loadRepo', () => {
    const { result } = renderHook(() => useGitPlayground());
    const fresh = vacio();
    act(() => window.GitPlayground!.cargar(fresh));
    expect(result.current.state.repo).toBe(fresh);
  });

  it('keeps window.GitPlayground installed once even when choreo identity changes every render', () => {
    // PlaygroundShell passes a fresh `choreo` object each render (its
    // camera/toasts deps are not referentially stable), so the debug API
    // must not be torn down and reinstalled on every render.
    const { rerender } = renderHook(() => useGitPlayground(makeFakeChoreo()));
    const first = window.GitPlayground;
    rerender();
    rerender();
    expect(window.GitPlayground).toBe(first);
  });

  it('window.GitPlayground.ejecutar() uses the latest choreo after rerenders', () => {
    let choreo = makeFakeChoreo();
    const { rerender } = renderHook(() => useGitPlayground(choreo));
    const latest = makeFakeChoreo();
    choreo = latest;
    rerender();
    act(() => window.GitPlayground!.ejecutar('git status'));
    expect(latest.finishAll).toHaveBeenCalled();
  });

  it('uninstalls window.GitPlayground on unmount', () => {
    const { unmount } = renderHook(() => useGitPlayground());
    expect(window.GitPlayground).toBeDefined();
    unmount();
    expect(window.GitPlayground).toBeUndefined();
  });

  it('resolveConflict() and simulateTeammate() apply through the engine without an echo line', () => {
    const { result } = renderHook(() => useGitPlayground());
    const linesBefore = result.current.state.lines.length;
    act(() => result.current.simulateTeammate());
    expect(result.current.state.lines.length).toBeGreaterThan(linesBefore);
    expect(result.current.state.input).toBe('');
  });

  it('setResolverHidden() and toggleResetMenu() update the corresponding reducer flags', () => {
    const { result } = renderHook(() => useGitPlayground());
    act(() => result.current.setResolverHidden(true));
    expect(result.current.state.resolverHidden).toBe(true);
    act(() => result.current.toggleResetMenu());
    expect(result.current.state.resetOpen).toBe(true);
  });

  describe('choreography wiring (design\'s data-flow diagram)', () => {
    it('run() calls choreo.finishAll() first, even for an empty Enter (oracle: finishAnims() is the first line of run())', () => {
      const choreo = makeFakeChoreo();
      const { result } = renderHook(() => useGitPlayground(choreo));
      act(() => result.current.run(''));
      expect(choreo.finishAll).toHaveBeenCalledTimes(1);
      expect(choreo.prepare).not.toHaveBeenCalled();
    });

    it('run() of a real command calls choreo.prepare(eventos, prevRepo, nextRepo, false) with the PRE-command repo as prev', () => {
      const choreo = makeFakeChoreo();
      const { result } = renderHook(() => useGitPlayground(choreo));
      const prevRepo = result.current.state.repo;
      act(() => result.current.run('git status'));
      expect(choreo.prepare).toHaveBeenCalledTimes(1);
      const [evs, prevArg, nextArg, isError] = choreo.prepare.mock.calls[0]!;
      expect(prevArg).toBe(prevRepo);
      expect(nextArg).toBe(result.current.state.repo);
      expect(isError).toBe(false);
      expect(Array.isArray(evs)).toBe(true);
    });

    it('run() of an invalid command calls choreo.prepare(..., true) (isError)', () => {
      const choreo = makeFakeChoreo();
      const { result } = renderHook(() => useGitPlayground(choreo));
      act(() => result.current.run('git this-is-not-a-command'));
      expect(choreo.prepare).toHaveBeenCalledTimes(1);
      expect(choreo.prepare.mock.calls[0]![3]).toBe(true);
    });

    it('calls choreo.after(res, prev, next) once a transition is committed, and dispatches its return value as the live-region text', () => {
      const choreo = makeFakeChoreo('live announcement');
      const { result } = renderHook(() => useGitPlayground(choreo));
      act(() => result.current.run('git status'));
      expect(choreo.after).toHaveBeenCalledTimes(1);
      expect(result.current.state.live).toBe('live announcement');
    });

    it('resolveConflict()/simulateTeammate()/saveFile() each call choreo.finishAll() before applying', () => {
      const choreo = makeFakeChoreo();
      const { result } = renderHook(() => useGitPlayground(choreo));
      act(() => result.current.simulateTeammate());
      expect(choreo.finishAll).toHaveBeenCalledTimes(1);
      act(() => result.current.saveFile('README.md', 'x'));
      expect(choreo.finishAll).toHaveBeenCalledTimes(2);
    });

    it('loadRepo() calls choreo.finishAll() and clears the sticky planRef (oracle: finishAnims();this.plan=null)', () => {
      const choreo = makeFakeChoreo();
      choreo.planRef.current = { leaving: ['stale'] };
      const { result } = renderHook(() => useGitPlayground(choreo));
      act(() => result.current.loadRepo(vacio()));
      expect(choreo.finishAll).toHaveBeenCalledTimes(1);
      expect(choreo.planRef.current).toBeNull();
    });

    it('works with no choreo argument at all (backward compatible — Phase 7 default / tests without choreography)', () => {
      const { result } = renderHook(() => useGitPlayground());
      expect(() => act(() => result.current.run('git status'))).not.toThrow();
    });

    // Regression: two synchronous `run()` calls inside one `act()` (e.g.
    // two back-to-back `window.GitPlayground.ejecutar()` calls in the same
    // tick) batch into a single React commit. `state.transition` only ever
    // holds the LATEST transition, and the `useLayoutEffect` keyed on
    // `state.transition?.id` only fires once per commit — so the oracle
    // parity "after() runs synchronously for every applied command" broke:
    // only the second command's `after()` ran, and the first command's
    // toast/aria-live/animation choreography was silently dropped.
    it('drains after() for EVERY applied command, in order, even when two run() calls batch into one commit', () => {
      const choreo = makeFakeChoreo();
      const { result } = renderHook(() => useGitPlayground(choreo));
      act(() => {
        result.current.run('git branch demo');
        result.current.run('git switch demo');
      });

      expect(choreo.prepare).toHaveBeenCalledTimes(2);
      expect(choreo.after).toHaveBeenCalledTimes(2);

      const [prepPrev1, prepNext1] = [choreo.prepare.mock.calls[0]![1], choreo.prepare.mock.calls[0]![2]];
      const [prepPrev2, prepNext2] = [choreo.prepare.mock.calls[1]![1], choreo.prepare.mock.calls[1]![2]];

      const [afterRes1, afterPrev1, afterNext1] = choreo.after.mock.calls[0] as unknown as [
        CommandResult,
        RepoState,
        RepoState,
      ];
      const [afterRes2, afterPrev2, afterNext2] = choreo.after.mock.calls[1] as unknown as [
        CommandResult,
        RepoState,
        RepoState,
      ];

      // Command 1's after() gets command 1's own prev/next (not command 2's).
      expect(afterPrev1).toBe(prepPrev1);
      expect(afterNext1).toBe(prepNext1);
      expect(afterRes1.estado).toBe(prepNext1);

      // Command 2's after() gets command 2's own prev/next, chained from command 1's next.
      expect(afterPrev2).toBe(prepPrev2);
      expect(afterNext2).toBe(prepNext2);
      expect(afterRes2.estado).toBe(prepNext2);
      expect(afterNext1).toBe(afterPrev2);
    });
  });

  // New behavior (design's data-flow diagram: "useGitPlayground.hosting.
  // merge(id,...) -> ... -> error -> {ok:false,lines} -> inline message /
  // ok -> applyResult"). `hosting.create` is the first handler in that
  // group (tasks.md 4.7 adds comment/close/reopen/merge the same way).
  describe('useGitPlayground / hosting.create', () => {
    it('rejects and returns inline push-hint guidance lines, without touching the terminal or creating a PR, when the source branch is not on origin', () => {
      const { result } = renderHook(() => useGitPlayground());
      const linesBefore = result.current.state.lines.length;
      const repoBefore = result.current.state.repo;

      let outcome: ReturnType<typeof result.current.hosting.create> | undefined;
      act(() => {
        outcome = result.current.hosting.create({ source: 'feature', target: 'main', title: 'Mi cambio', body: '' });
      });

      expect(outcome).toEqual({ ok: false, lines: expect.any(Array) });
      const lines = (outcome as { ok: false; lines: string[] }).lines;
      expect(lines.join('\n')).toContain('git push -u origin feature');
      // No terminal output (design "Action Result Feedback") and no state
      // mutation at all — `applyResult` was never called on the error path.
      expect(result.current.state.lines.length).toBe(linesBefore);
      expect(result.current.state.repo).toBe(repoBefore);
      expect(GitEngine.listPullRequests(result.current.state.repo!)).toHaveLength(0);
    });

    it('creates the PR and applies the result via applyResult (persisted, no terminal output) when the source is pushed and ahead of the target', () => {
      const { result } = renderHook(() => useGitPlayground());
      act(() => {
        result.current.run('git checkout -b feature');
        result.current.run('echo hola > notas.txt');
        result.current.run('git add notas.txt');
        result.current.run('git commit -m feature');
        result.current.run('git push -u origin feature');
      });
      const linesBefore = result.current.state.lines.length;

      let outcome: ReturnType<typeof result.current.hosting.create> | undefined;
      act(() => {
        outcome = result.current.hosting.create({ source: 'feature', target: 'main', title: 'Mi cambio', body: '' });
      });

      expect(outcome).toEqual({ ok: true });
      expect(result.current.state.lines.length).toBe(linesBefore);
      const prs = GitEngine.listPullRequests(result.current.state.repo!);
      expect(prs).toHaveLength(1);
      expect(prs[0]).toMatchObject({ source: 'feature', target: 'main', title: 'Mi cambio', status: 'open' });
    });
  });

  // Task 4.7/4.8: `comment`/`close`/`reopen`/`merge` added to the same
  // `hosting` object as `create` (tasks.md Phase 4), following the exact
  // same error/ok shape (design's data-flow diagram).
  describe('useGitPlayground / hosting.comment, close, reopen, merge', () => {
    function openPrRepo(result: { current: ReturnType<typeof useGitPlayground> }): void {
      act(() => {
        result.current.run('git checkout -b feature');
        result.current.run('echo hola > notas.txt');
        result.current.run('git add notas.txt');
        result.current.run('git commit -m feature');
        result.current.run('git push -u origin feature');
      });
      act(() => {
        result.current.hosting.create({ source: 'feature', target: 'main', title: 'Mi cambio', body: '' });
      });
    }

    it('comment: rejects with inline lines and does not touch the terminal/repo when the body is empty', () => {
      const { result } = renderHook(() => useGitPlayground());
      openPrRepo(result);
      const linesBefore = result.current.state.lines.length;
      const repoBefore = result.current.state.repo;

      let outcome: ReturnType<typeof result.current.hosting.comment> | undefined;
      act(() => {
        outcome = result.current.hosting.comment(1, '   ');
      });

      expect(outcome).toEqual({ ok: false, lines: expect.any(Array) });
      expect(result.current.state.lines.length).toBe(linesBefore);
      expect(result.current.state.repo).toBe(repoBefore);
    });

    it('comment: applies the result (persisted, no terminal output) on success', () => {
      const { result } = renderHook(() => useGitPlayground());
      openPrRepo(result);
      const linesBefore = result.current.state.lines.length;

      let outcome: ReturnType<typeof result.current.hosting.comment> | undefined;
      act(() => {
        outcome = result.current.hosting.comment(1, 'Un comentario');
      });

      expect(outcome).toEqual({ ok: true });
      expect(result.current.state.lines.length).toBe(linesBefore);
      const pr = GitEngine.listPullRequests(result.current.state.repo!)[0]!;
      expect(pr.timeline.at(-1)).toMatchObject({ kind: 'comment', author: 'Tú', body: 'Un comentario' });
    });

    it('close: rejects an already-closed PR with inline lines', () => {
      const { result } = renderHook(() => useGitPlayground());
      openPrRepo(result);
      act(() => {
        result.current.hosting.close(1);
      });
      const repoBefore = result.current.state.repo;

      let outcome: ReturnType<typeof result.current.hosting.close> | undefined;
      act(() => {
        outcome = result.current.hosting.close(1);
      });

      expect(outcome).toEqual({ ok: false, lines: expect.any(Array) });
      expect(result.current.state.repo).toBe(repoBefore);
    });

    it('close: applies the result and marks the PR closed on success', () => {
      const { result } = renderHook(() => useGitPlayground());
      openPrRepo(result);

      let outcome: ReturnType<typeof result.current.hosting.close> | undefined;
      act(() => {
        outcome = result.current.hosting.close(1);
      });

      expect(outcome).toEqual({ ok: true });
      expect(GitEngine.listPullRequests(result.current.state.repo!)[0]!.status).toBe('closed');
    });

    it('reopen: rejects a PR that is not closed with inline lines', () => {
      const { result } = renderHook(() => useGitPlayground());
      openPrRepo(result);
      const repoBefore = result.current.state.repo;

      let outcome: ReturnType<typeof result.current.hosting.reopen> | undefined;
      act(() => {
        outcome = result.current.hosting.reopen(1);
      });

      expect(outcome).toEqual({ ok: false, lines: expect.any(Array) });
      expect(result.current.state.repo).toBe(repoBefore);
    });

    it('reopen: applies the result and marks the PR open on success', () => {
      const { result } = renderHook(() => useGitPlayground());
      openPrRepo(result);
      act(() => {
        result.current.hosting.close(1);
      });

      let outcome: ReturnType<typeof result.current.hosting.reopen> | undefined;
      act(() => {
        outcome = result.current.hosting.reopen(1);
      });

      expect(outcome).toEqual({ ok: true });
      expect(GitEngine.listPullRequests(result.current.state.repo!)[0]!.status).toBe('open');
    });

    it('merge: rejects an unknown PR id with inline lines, without touching the terminal', () => {
      const { result } = renderHook(() => useGitPlayground());
      openPrRepo(result);
      const linesBefore = result.current.state.lines.length;
      const repoBefore = result.current.state.repo;

      let outcome: ReturnType<typeof result.current.hosting.merge> | undefined;
      act(() => {
        outcome = result.current.hosting.merge(999, 'squash', false);
      });

      expect(outcome).toEqual({ ok: false, lines: expect.any(Array) });
      expect(result.current.state.lines.length).toBe(linesBefore);
      expect(result.current.state.repo).toBe(repoBefore);
    });

    it('merge: applies the result (persisted, no terminal output) and marks the PR merged on success, deleting the source branch when asked', () => {
      const { result } = renderHook(() => useGitPlayground());
      openPrRepo(result);
      const linesBefore = result.current.state.lines.length;

      let outcome: ReturnType<typeof result.current.hosting.merge> | undefined;
      act(() => {
        outcome = result.current.hosting.merge(1, 'squash', true);
      });

      expect(outcome).toEqual({ ok: true });
      expect(result.current.state.lines.length).toBe(linesBefore);
      const pr = GitEngine.listPullRequests(result.current.state.repo!)[0]!;
      expect(pr.status).toBe('merged');
      expect(result.current.state.repo!.remote.branches.feature).toBeUndefined();
    });
  });
});
