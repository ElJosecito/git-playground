import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChoreography } from '../useChoreography';
import type { UseCameraResult } from '../useCamera';
import { GitEngine } from '../../engine';
import type { Cam } from '../../ui/geometry';

// Ported 1:1 from the DC template's `apply()`/`after()`/`finishAnims()`/
// `choreo()` and the `nodeRef`/`rnodeRef`/`edgeRef`/`labelRef`/`pulseRef`/
// `stashRef` ref callbacks (design-handoff/Git Playground.dc.html, lines
// 296-407). Design D5 (`useLayoutEffect` keyed on `transition.id`) and D6
// (`WeakMap<Element,Plan>` birth guard) are the hook's job — the caller
// (`useGitPlayground`) only calls `prepare()`/`after()`/`finishAll()`.
function makeFakeCamera() {
  const camRef = { current: { x: 0, y: 0, k: 1 } };
  const camFinalRef: { current: Cam | null } = { current: null };
  const lastManualRef = { current: 0 };
  const worldRef = { current: null };
  return {
    worldRef,
    camRef,
    lastManualRef,
    camFinalRef,
    apply: vi.fn(),
    zoomAt: vi.fn(),
    camTo: vi.fn(),
    finish: vi.fn(),
    fitAll: vi.fn(),
    fitBox: vi.fn((_b, maxK) => ({ x: 0, y: 0, k: maxK ?? 1.15 })),
    headCam: vi.fn((k: number) => ({ x: 1, y: 1, k })),
    inView: vi.fn(() => true),
    w2s: vi.fn((p: { X: number; Y: number }) => ({ x: p.X, y: p.Y })),
    markManual: vi.fn(),
    onCanvasPointerDown: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    fit: vi.fn(),
    centerHead: vi.fn(),
  };
}

function setup() {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const rootRef = { current: root as HTMLElement | null };
  const overlay = document.createElement('div');
  const overlayRef = { current: overlay as HTMLDivElement | null };
  const fx = document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGGElement;
  const fxRef = { current: fx as SVGGElement | null };
  const term = document.createElement('div');
  const termRef = { current: term as HTMLElement | null };
  const reducedRef = { current: false };
  const camera = makeFakeCamera();
  const toasts = { push: vi.fn() };
  const hook = renderHook(() => useChoreography({ rootRef, overlayRef, fxRef, termRef, camera: camera as unknown as UseCameraResult, reducedRef, toasts }));
  return { ...hook, root, overlay, fx, term, camera, toasts, reducedRef };
}

describe('useChoreography', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('prepare() computes a plan and sticks it in planRef, but keeps the PREVIOUS plan on an error call (oracle: `if(plan)this.plan=plan`)', () => {
    const { result } = setup();
    let s = GitEngine.ejemplo();
    s = GitEngine.ejecutar(s, 'echo hi > a.txt').estado;
    const prev = GitEngine.ejecutar(s, 'git add a.txt').estado;
    const res = GitEngine.ejecutar(prev, 'git commit -m hi');
    act(() => result.current.prepare(res.eventos, prev, res.estado, false));
    const firstPlan = result.current.planRef.current;
    expect(firstPlan).not.toBeNull();

    act(() => result.current.prepare([], res.estado, res.estado, true));
    expect(result.current.planRef.current).toBe(firstPlan);
  });

  it('after() on a command error shakes the terminal element and returns "Error. " + the plain-text output, without pushing a toast', () => {
    const { result, term, toasts } = setup();
    const animateSpy = vi.spyOn(Element.prototype, 'animate');
    const prev = GitEngine.ejemplo();
    const res = GitEngine.ejecutar(prev, 'git this-is-not-a-command');
    expect(res.error).toBe(true);
    let live = '';
    act(() => {
      result.current.prepare(res.eventos, prev, res.estado, true);
      live = result.current.after(res, prev, res.estado);
    });
    expect(live.startsWith('Error.')).toBe(true);
    expect(toasts.push).not.toHaveBeenCalled();
    expect(animateSpy.mock.instances).toContain(term);
    animateSpy.mockRestore();
  });

  it('after() on success pushes an explain toast and returns the explain text + output as the live announcement', () => {
    const { result, toasts } = setup();
    let s = GitEngine.ejemplo();
    s = GitEngine.ejecutar(s, 'echo hi > a.txt').estado;
    const prev = GitEngine.ejecutar(s, 'git add a.txt').estado;
    const res = GitEngine.ejecutar(prev, 'git commit -m hi');
    let live = '';
    act(() => {
      result.current.prepare(res.eventos, prev, res.estado, false);
      live = result.current.after(res, prev, res.estado);
    });
    expect(toasts.push).toHaveBeenCalledTimes(1);
    const explained = toasts.push.mock.calls[0]![0];
    expect(live).toContain(explained.text.replace(/`/g, ''));
  });

  it('after() skips the choreography (no camera move) when a newer prepare() has already replaced the pending plan (stale-command guard)', () => {
    const { result, camera } = setup();
    let s = GitEngine.ejemplo();
    s = GitEngine.ejecutar(s, 'echo hi > a.txt').estado;
    const prev1 = GitEngine.ejecutar(s, 'git add a.txt').estado;
    const res1 = GitEngine.ejecutar(prev1, 'git commit -m hi');
    act(() => result.current.prepare(res1.eventos, prev1, res1.estado, false));

    // A second command runs and replaces planRef before the first's after() fires.
    const res2 = GitEngine.ejecutar(res1.estado, 'git status');
    act(() => result.current.prepare(res2.eventos, res1.estado, res2.estado, false));

    camera.camTo.mockClear();
    act(() => {
      result.current.after(res1, prev1, res1.estado);
    });
    expect(camera.camTo).not.toHaveBeenCalled();
  });

  it('finishAll() clears the overlay, finishes non-infinite WAAPI animations (leaving infinite ones alone), and delegates camera cleanup to camera.finish()', () => {
    const { result, overlay, camera } = setup();
    overlay.appendChild(document.createElement('div'));
    expect(overlay.children).toHaveLength(1);

    // The shared `setup.dom.ts` `Element.prototype.animate` stub always
    // reports `iterations: 1` from a real call, so finite/infinite are
    // simulated directly here instead (same shape `finishAll()` reads:
    // `a.effect.getTiming().iterations` and `a.finish()`).
    const finiteAnim = { effect: { getTiming: () => ({ iterations: 1 }) }, finish: vi.fn() };
    const infiniteAnim = { effect: { getTiming: () => ({ iterations: Infinity }) }, finish: vi.fn() };
    vi.spyOn(document, 'getAnimations').mockReturnValue([finiteAnim, infiniteAnim] as unknown as Animation[]);

    act(() => result.current.finishAll());

    expect(overlay.children).toHaveLength(0);
    expect(camera.finish).toHaveBeenCalled();
    expect(finiteAnim.finish).toHaveBeenCalled();
    expect(infiniteAnim.finish).not.toHaveBeenCalled();
  });

  it('finishAll() clears a pending plan\'s "leaving" labels and bumps planVersion', () => {
    const { result } = setup();
    const afterCreate = GitEngine.ejecutar(GitEngine.ejemplo(), 'git branch demo').estado;
    const res = GitEngine.ejecutar(afterCreate, 'git branch -d demo');
    act(() => result.current.prepare(res.eventos, afterCreate, res.estado, false));
    expect(result.current.planRef.current!.leaving.length).toBeGreaterThan(0);
    const versionBefore = result.current.planVersion;

    act(() => result.current.finishAll());

    expect(result.current.planRef.current!.leaving).toEqual([]);
    expect(result.current.planVersion).toBeGreaterThan(versionBefore);
  });

  it('refs.node plays the birth animation once per (element, plan) — a second ref invocation with the same plan is a no-op (design D6)', () => {
    const { result } = setup();
    let s = GitEngine.ejemplo();
    s = GitEngine.ejecutar(s, 'echo hi > a.txt').estado;
    const prev = GitEngine.ejecutar(s, 'git add a.txt').estado;
    const res = GitEngine.ejecutar(prev, 'git commit -m hi');
    act(() => result.current.prepare(res.eventos, prev, res.estado, false));
    const newHash = result.current.planRef.current!.newNodes[0]!;

    const el = document.createElementNS('http://www.w3.org/2000/svg', 'g') as unknown as SVGElement;
    el.setAttribute('data-h', newHash);
    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    inner.setAttribute('data-inner', '1');
    el.appendChild(inner);
    const animateSpy = vi.spyOn(Element.prototype, 'animate');

    act(() => result.current.refs.node(el as unknown as SVGGElement));
    const callsAfterFirst = animateSpy.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);

    act(() => result.current.refs.node(el as unknown as SVGGElement));
    expect(animateSpy.mock.calls.length).toBe(callsAfterFirst);
    animateSpy.mockRestore();
  });

  it('refs.pulse plays its continuous ping only once ever per element, regardless of plan identity', () => {
    const { result } = setup();
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle') as unknown as Element;
    const animateSpy = vi.spyOn(Element.prototype, 'animate');

    act(() => result.current.refs.pulse(el));
    act(() => result.current.refs.pulse(el));
    expect(animateSpy).toHaveBeenCalledTimes(1);
    animateSpy.mockRestore();
  });

  it('refs.label plays the exit animation for a data-leaving element, and the enter animation for a brand-new label', () => {
    const { result } = setup();
    const afterCreate = GitEngine.ejecutar(GitEngine.ejemplo(), 'git branch demo');
    act(() => result.current.prepare(afterCreate.eventos, GitEngine.ejemplo(), afterCreate.estado, false));

    const leavingEl = document.createElementNS('http://www.w3.org/2000/svg', 'g') as unknown as SVGElement;
    leavingEl.setAttribute('data-label', 'whatever');
    leavingEl.setAttribute('data-leaving', '1');
    const leavingInner = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    leavingInner.setAttribute('data-inner', '1');
    leavingEl.appendChild(leavingInner);
    const animateSpy = vi.spyOn(Element.prototype, 'animate');
    act(() => result.current.refs.label(leavingEl as unknown as SVGGElement));
    expect(animateSpy).toHaveBeenCalled();
    animateSpy.mockClear();

    const newEl = document.createElementNS('http://www.w3.org/2000/svg', 'g') as unknown as SVGElement;
    newEl.setAttribute('data-label', 'b:demo');
    const newInner = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    newInner.setAttribute('data-inner', '1');
    newEl.appendChild(newInner);
    act(() => result.current.refs.label(newEl as unknown as SVGGElement));
    expect(animateSpy).toHaveBeenCalled();
    animateSpy.mockRestore();
  });

  // Regression: `refs` used to be a fresh `{ node, rnode, edge, label,
  // pulse, stash }` object literal on every render even though all six
  // callbacks are themselves stable (`useCallback`). `GraphLayer` is
  // `memo()`-ed and receives `refs` as a prop (design D8) — a new `refs`
  // identity every render defeats that memoization entirely.
  it('`refs` stays referentially stable across rerenders (so GraphLayer\'s memo() isn\'t defeated by a fresh refs object every render)', () => {
    const { result, rerender } = setup();
    const firstRefs = result.current.refs;
    rerender();
    expect(result.current.refs).toBe(firstRefs);
  });
});
