// WAAPI choreography. 1:1 port of the DC template's `apply()`/`after()`/
// `finishAnims()`/`choreo()`/`fly()`/`particle()`/`snapRects()`/`chip()`/
// `pulseHead()` plus the `nodeRef`/`rnodeRef`/`edgeRef`/`labelRef`/
// `pulseRef`/`stashRef` ref callbacks (design-handoff/Git Playground.dc.html,
// lines 296-407).
//
// Design decisions this hook implements:
// - D5: the after-command hook point is a `useLayoutEffect` keyed on
//   `transition.id` — owned by the CALLER (`useGitPlayground`), which reads
//   the committed DOM via `prepare()`'s `before` snapshot and calls
//   `after()`. This hook only exposes `prepare`/`after`/`finishAll`.
// - D6: the "animate once" guard is a `WeakMap<Element,Plan>` (for the
//   node/rnode/edge/label birth refs, which re-check per NEW plan) plus two
//   `WeakSet<Element>` (for `pulse`/`stash`, which — like the oracle's
//   `el.__p`/plain `el.__born` truthy checks — never replay regardless of
//   plan identity).
// - D9: `fly()` appends into the caller-owned `overlayRef` `<div>`;
//   `particle()` appends into the caller-owned `fxRef` `<g data-fx>` (NOT
//   `worldRef` directly, unlike the oracle, so React never has to reconcile
//   imperatively-appended children of the SVG world group it owns).
// - D15: every DOM query (`[data-chip]`, `[data-stash]`, `[data-label]`,
//   `[data-zone]`, `[data-h]`) is scoped to the caller-owned `rootRef`.
//
// Deviation from the oracle: `Date.now()`/`this.lastManual`/`this.reduced`
// are read explicitly (via `camera.lastManualRef`/`reducedRef`/`Date.now()`
// at the call site) rather than off `this`, since there is no single
// instance object here — `prepare()`/`after()` are plain callbacks.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { mkPlan } from '../ui/plan';
import type { Plan } from '../ui/plan';
import { layoutOf } from '../ui/layoutCache';
import { explicar } from '../engine/explain';
import { headHash } from '../engine/state';
import { EASE_IN_OUT, EASE_OUT, EASE_SPRING } from '../ui/motion';
import type { UseCameraResult } from './useCamera';
import type { Box, CommandResult, ExplainResult, GitEvent, Hash, LLabel, Point, RepoState } from '../engine/types';

export interface ChoreographyToasts {
  push(expl: ExplainResult): void;
}

export interface UseChoreographyParams {
  /** Scopes every `data-*` query (design D15) — the whole playground shell. */
  rootRef: RefObject<HTMLElement | null>;
  /** The `fly()` label-chip overlay (`FlyOverlay`'s div, design D9). */
  overlayRef: RefObject<HTMLDivElement | null>;
  /** The `particle()` layer (`GraphLayer`'s `<g data-fx>`, design D9). */
  fxRef: RefObject<SVGGElement | null>;
  /** The terminal's root element, shaken on a command error. */
  termRef: RefObject<HTMLElement | null>;
  camera: UseCameraResult;
  reducedRef: RefObject<boolean>;
  toasts: ChoreographyToasts;
}

export interface ChoreographyRefs {
  node: (el: SVGGElement | null) => void;
  rnode: (el: SVGGElement | null) => void;
  edge: (el: SVGPathElement | null) => void;
  label: (el: SVGGElement | null) => void;
  pulse: (el: Element | null) => void;
  stash: (el: SVGGElement | null) => void;
}

export interface UseChoreographyResult {
  planRef: RefObject<Plan | null>;
  /** Bumped (oracle's `gv`) when a plan's "leaving" labels are cleared, so
   * `GraphLayer` (which reads `leaving` from a prop) re-renders without
   * them. */
  planVersion: number;
  /** Captures the `before` DOM snapshot and computes the plan for the
   * command that is about to be applied — call BEFORE dispatching the
   * result, while the DOM still reflects `prev`. */
  prepare(evs: GitEvent[], prev: RepoState, next: RepoState, isError: boolean): void;
  /** Call from a `useLayoutEffect` keyed on `transition.id`, AFTER the DOM
   * has committed `next`. Returns the aria-live announcement text. */
  after(res: CommandResult, prev: RepoState, next: RepoState): string;
  /** Cancels pending timers/camera animation, force-finishes non-infinite
   * WAAPI animations, clears the fly overlay, and drops any pending
   * "leaving" labels. Call before starting a new command (oracle's
   * `finishAnims()`). */
  finishAll(): void;
  refs: ChoreographyRefs;
}

type FlyPoint = DOMRect | { x: number; y: number };

function centerOf(p: FlyPoint): { x: number; y: number } {
  const r = p as DOMRect;
  return r.width != null ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : (p as { x: number; y: number });
}

function snapRects(root: Element | null): Record<string, DOMRect> {
  const result: Record<string, DOMRect> = {};
  if (!root) return result;
  root.querySelectorAll('[data-chip]').forEach((el) => {
    const key = el.getAttribute('data-chip');
    if (key) result[key] = el.getBoundingClientRect();
  });
  const stash = root.querySelector('[data-stash]');
  if (stash) result.__stash = stash.getBoundingClientRect();
  return result;
}

function chipEl(root: Element | null, key: string): Element | null {
  return root ? root.querySelector(`[data-chip="${CSS.escape(key)}"]`) : null;
}

function fly(
  overlay: HTMLDivElement | null,
  reduced: boolean,
  a: FlyPoint | null | undefined,
  b: FlyPoint | null | undefined,
  label: string,
  color: string,
  delay: number,
  dur: number,
  shrink: boolean,
  target?: Element | null,
): void {
  if (!overlay || !a || !b || reduced) return;
  const pa = centerOf(a);
  const pb = centerOf(b);
  const el = document.createElement('div');
  el.textContent = label;
  Object.assign(el.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    font: "500 12px 'Geist Mono', monospace",
    padding: '3px 8px',
    borderRadius: '6px',
    background: 'var(--surface-solid)',
    boxShadow: `0 0 0 1px ${color}, 0 8px 20px rgba(0,0,0,.35)`,
    color,
    whiteSpace: 'nowrap',
  });
  overlay.appendChild(el);
  const mx = (pa.x + pb.x) / 2;
  const my = Math.min(pa.y, pb.y) - 50;
  const T = (p: { x: number; y: number }, s: number): string => `translate(${p.x}px,${p.y}px) translate(-50%,-50%) scale(${s})`;
  const an = el.animate(
    [
      { transform: T(pa, 1), opacity: 0 },
      { transform: T({ x: pa.x * 0.85 + mx * 0.15, y: pa.y * 0.85 + my * 0.15 }, 1.04), opacity: 1, offset: 0.15 },
      { transform: T({ x: mx, y: my }, shrink ? 0.85 : 1.04), opacity: 1, offset: 0.5 },
      { transform: T(pb, shrink ? 0.25 : 1), opacity: shrink ? 0 : 1 },
    ],
    { duration: dur, delay, easing: EASE_IN_OUT, fill: 'both' },
  );
  const remove = (): void => el.remove();
  an.onfinish = remove;
  an.oncancel = remove;
  if (target) target.animate([{ opacity: 0 }, { opacity: 0, offset: 0.98 }, { opacity: 1 }], { duration: delay + dur });
}

function particle(fx: SVGGElement | null, reduced: boolean, a: Point, b: Point, color: string, delay: number): void {
  if (!fx || reduced) return;
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  c.setAttribute('r', '5');
  c.style.fill = color;
  fx.appendChild(c);
  const mx = (a.X + b.X) / 2 + 30;
  const my = (a.Y + b.Y) / 2;
  const an = c.animate(
    [
      { transform: `translate(${a.X}px,${a.Y}px) scale(.4)`, opacity: 0 },
      { transform: `translate(${mx}px,${my}px) scale(1)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${b.X}px,${b.Y}px) scale(.5)`, opacity: 0 },
    ],
    { duration: 520, delay, easing: EASE_IN_OUT, fill: 'both' },
  );
  const remove = (): void => c.remove();
  an.onfinish = remove;
  an.oncancel = remove;
}

function pulseHead(root: Element | null, hash: Hash | null): void {
  const el = hash ? root?.querySelector(`[data-h="${CSS.escape(hash)}"] [data-ripple]`) : null;
  el?.animate([{ opacity: 0.8, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(2.4)' }], { duration: 700, easing: EASE_OUT });
}

function findEvent<T extends GitEvent['type']>(evs: GitEvent[], t: T): Extract<GitEvent, { type: T }> | undefined {
  return evs.find((e) => e.type === t) as Extract<GitEvent, { type: T }> | undefined;
}

interface ChoreoCtx {
  root: Element | null;
  overlay: HTMLDivElement | null;
  fx: SVGGElement | null;
  reduced: boolean;
  camera: UseCameraResult;
  later(fn: () => void, ms: number): void;
  clearLeaving(): void;
}

/** 1:1 port of the oracle's `choreo(evs,before,prev,next,P)`. */
function choreo(evs: GitEvent[], before: Record<string, DOMRect>, prev: RepoState, next: RepoState, plan: Plan | null, ctx: ChoreoCtx): void {
  if (!plan) return;
  const L = plan.Ln;
  const g = <T extends GitEvent['type']>(t: T) => findEvent(evs, t);
  const after = snapRects(ctx.root);
  const handled = new Set<string>();

  const ce = g('commit-created') ?? g('commit-amended') ?? g('merge-commit') ?? g('cherry-picked') ?? g('reverted');
  if (ce && L.pos[ce.hash]) {
    const to = ctx.camera.w2s(L.pos[ce.hash]!);
    Object.keys(before)
      .filter((k) => k.startsWith('s:'))
      .forEach((k, i) => fly(ctx.overlay, ctx.reduced, before[k], to, k.slice(2), 'var(--success)', i * 70, 420, true));
  }

  evs.forEach((e, i) => {
    if (e.type !== 'file-staged') return;
    handled.add('s:' + e.file);
    const a = before['w:' + e.file] || before['c:' + e.file];
    fly(ctx.overlay, ctx.reduced, a, after['s:' + e.file], e.file, 'var(--success)', i * 80, 440, false, chipEl(ctx.root, 's:' + e.file));
  });
  evs.forEach((e, i) => {
    if (e.type !== 'file-unstaged') return;
    fly(ctx.overlay, ctx.reduced, before['s:' + e.file], after['w:' + e.file], e.file, 'var(--text-secondary)', i * 80, 440, false);
  });

  const sp = g('stash-pushed');
  if (sp) {
    const box = L.stash ? ctx.camera.w2s({ X: L.stash.X, Y: L.stash.Y }) : null;
    sp.files.forEach((f, i) => fly(ctx.overlay, ctx.reduced, before['w:' + f] || before['s:' + f], box, f, 'var(--text-secondary)', i * 70, 480, true));
  }

  const so = g('stash-popped');
  if (so && plan.Lp.stash) {
    const box = ctx.camera.w2s({ X: plan.Lp.stash.X, Y: plan.Lp.stash.Y });
    so.files.forEach((f, i) => {
      handled.add('w:' + f);
      fly(ctx.overlay, ctx.reduced, box, after['w:' + f], f, 'var(--warning)', i * 70, 480, false, chipEl(ctx.root, 'w:' + f));
    });
  }

  const rs = g('reset');
  if (rs && rs.mode !== 'hard') {
    const src = after['c:__head'];
    Object.keys(after)
      .filter((k) => (k.startsWith('s:') || k.startsWith('w:')) && !before[k])
      .forEach((k, i) => {
        handled.add(k);
        fly(ctx.overlay, ctx.reduced, src, after[k], k.slice(2), rs.mode === 'soft' ? 'var(--success)' : 'var(--warning)', i * 80, 480, false, chipEl(ctx.root, k));
      });
  }

  if (!ctx.reduced) {
    Object.keys(after).forEach((k) => {
      if (before[k] || handled.has(k) || k.startsWith('c:')) return;
      chipEl(ctx.root, k)?.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: EASE_OUT });
    });

    evs.forEach((e) => {
      if (e.type !== 'file-modified') return;
      chipEl(ctx.root, 'w:' + e.file)?.animate(
        [
          { boxShadow: 'inset 0 0 0 1px rgba(251,191,36,0)' },
          { boxShadow: 'inset 0 0 0 1px rgba(251,191,36,.9)', background: 'rgba(251,191,36,.18)' },
          { boxShadow: 'inset 0 0 0 1px rgba(251,191,36,0)' },
        ],
        { duration: 700, easing: 'ease-out' },
      );
    });

    const resetEv = g('reset');
    if (g('switched') || g('detached') || (resetEv && resetEv.mode === 'hard') || g('fast-forward')) {
      ctx.root?.querySelector('[data-zone="w"]')?.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 380, easing: EASE_OUT });
    }
  }

  // Ref labels that moved along a path (branch fast-forward, HEAD move…).
  if (!ctx.reduced) {
    const lp: Record<string, LLabel> = {};
    plan.Lp.labels.forEach((l) => {
      lp[l.key] = l;
    });
    L.labels.forEach((l) => {
      const o = lp[l.key];
      if (!o || (o.X === l.X && o.Y === l.Y)) return;
      const el = ctx.root?.querySelector(`[data-label="${CSS.escape(l.key)}"]`);
      if (!el) return;
      let pts: [number, number][] = [[o.X, o.Y]];
      const fromH = o.h;
      const toH = l.h;
      const dy = l.Y - L.pos[toH]!.Y;
      const chain = (a: Hash, b: Hash): Hash[] | null => {
        const out: Hash[] = [];
        let x: Hash | undefined = a;
        let guard = 0;
        while (x && x !== b && next.commits[x] && guard++ < 40) {
          out.push(x);
          x = next.commits[x]!.parents[0];
        }
        return x === b ? out : null;
      };
      let c = chain(toH, fromH);
      if (c && c.length > 1) {
        pts = pts.concat(c.reverse().map((h): [number, number] => [L.pos[h]!.X, L.pos[h]!.Y + dy]));
      } else {
        c = chain(fromH, toH);
        if (c && c.length > 1) {
          pts = pts.concat(c.slice(1).map((h): [number, number] => [L.pos[h]!.X, L.pos[h]!.Y + dy]), [[l.X, l.Y]]);
        } else if (l.kind === 'head') {
          const lift = g('head-detached') ? 70 : 40;
          pts.push([(o.X + l.X) / 2, Math.min(o.Y, l.Y) - lift]);
          pts.push([l.X, l.Y]);
        } else {
          pts.push([l.X, l.Y]);
        }
      }
      if (pts[pts.length - 1]![0] !== l.X || pts[pts.length - 1]![1] !== l.Y) pts.push([l.X, l.Y]);
      el.animate(pts.map((p) => ({ transform: `translate(${p[0]}px,${p[1]}px)` })), {
        duration: Math.min(900, 260 + pts.length * 110),
        delay: plan.labelDelay,
        easing: EASE_OUT,
        fill: 'backwards',
      });
      if (l.kind === 'head' && g('head-detached')) {
        el.querySelector('[data-inner]')?.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }],
          { duration: 500, delay: plan.labelDelay, easing: EASE_OUT },
        );
      }
    });
  }

  // Push: particles flying from local to remote positions.
  if (plan.push) {
    plan.newR.forEach((h, i) => {
      const a = L.pos[h];
      const b = L.rpos[h];
      if (a && b) {
        const rn = L.rnodes.find((n) => n.h === h);
        particle(ctx.fx, ctx.reduced, a, b, rn?.color ?? 'var(--text-secondary)', plan.base + i * 120);
      }
    });
  }

  if (plan.leaving.length) {
    ctx.later(() => ctx.clearLeaving(), 420);
  }

  // Camera.
  if (ctx.reduced) return;
  const headHashNext = headHash(next);
  const hp = (headHashNext && L.pos[headHashNext]) || null;
  if (Date.now() - ctx.camera.lastManualRef.current < 4000) {
    pulseHead(ctx.root, headHashNext);
    return;
  }
  if (plan.wide) {
    const pts: Point[] = [];
    const addH = (h: Hash | null | undefined, pp: Record<Hash, Point>): void => {
      if (h && pp[h]) pts.push(pp[h]!);
    };
    plan.newNodes.forEach((h) => {
      addH(h, L.pos);
      const c = next.commits[h]!;
      c.parents.forEach((p) => addH(p, L.pos));
      if (c.copyOf) addH(c.copyOf, L.pos);
      if (c.cherryOf) addH(c.cherryOf, L.pos);
    });
    evs.forEach((e) => {
      if (e.type !== 'ref-moved') return;
      addH(e.from, L.pos);
      addH(e.to, L.pos);
    });
    plan.newR.forEach((h) => {
      addH(h, L.rpos);
      addH(h, L.pos);
    });
    if (hp) pts.push(hp);
    const ph = headHash(prev);
    if (ph && L.pos[ph]) pts.push(L.pos[ph]!);
    if (L.phantom) pts.push(L.phantom.P);
    if (pts.length) {
      const b: Box = {
        x0: Math.min(...pts.map((p) => p.X)) - 110,
        x1: Math.max(...pts.map((p) => p.X)) + 110,
        y0: Math.min(...pts.map((p) => p.Y)) - 110,
        y1: Math.max(...pts.map((p) => p.Y)) + 60,
      };
      const out = ctx.camera.fitBox(b, Math.min(ctx.camera.camRef.current.k * 0.9, 1));
      ctx.camera.camTo(out, 650);
      const fin = ctx.camera.headCam(clamp(Math.max(out.k * 1.15, 0.9), 0.4, 1.1));
      ctx.camera.camFinalRef.current = fin;
      ctx.later(() => ctx.camera.camTo(fin, 700), Math.max(700, plan.end));
      // Skipped dead code (not a missed port): the oracle's
      // `if(!g('merge-conflict'))return;` here is immediately followed by
      // an unconditional `return;` — both branches return, so it is
      // provably a no-op in the original too.
    }
    return;
  }
  if (hp && !ctx.camera.inView(hp)) {
    ctx.camera.camTo(ctx.camera.headCam(clamp(ctx.camera.camRef.current.k, 0.7, 1.2)), 700);
    return;
  }
  if (plan.isCommit && hp) {
    const k0 = ctx.camera.camRef.current.k;
    // Algebraic simplification of the oracle's `w2s(hp)` immediately
    // followed by subtracting the canvas's own `getBoundingClientRect()`
    // offset back out: that round trip always cancels to `hp.X*k+cam.x` /
    // `hp.Y*k+cam.y` (deviation: skips a redundant DOM read, same result;
    // the oracle's destructured `{W,H}=this.vp()` on this line is unused
    // dead code too, so it is not ported either).
    const px = hp.X * k0 + ctx.camera.camRef.current.x;
    const py = hp.Y * k0 + ctx.camera.camRef.current.y;
    const tgt = { k: k0 * 1.06, x: px - (px - ctx.camera.camRef.current.x) * 1.06, y: py - (py - ctx.camera.camRef.current.y) * 1.06 };
    const back = { ...ctx.camera.camRef.current };
    ctx.later(() => {
      ctx.camera.camTo(tgt, 240);
      ctx.camera.camFinalRef.current = back;
      ctx.later(() => ctx.camera.camTo(back, 320), 260);
    }, Math.max(0, plan.labelDelay - 120));
  } else if (plan.newR.length) {
    const rp = L.rpos[plan.newR[0]!];
    if (rp && !ctx.camera.inView(rp) && L.bbox) ctx.camera.camTo(ctx.camera.fitBox(L.bbox), 700);
  }
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

export function useChoreography({ rootRef, overlayRef, fxRef, termRef, camera, reducedRef, toasts }: UseChoreographyParams): UseChoreographyResult {
  const planRef = useRef<Plan | null>(null);
  const pendingPlanRef = useRef<Plan | null>(null);
  const beforeRef = useRef<Record<string, DOMRect>>({});
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [planVersion, setPlanVersion] = useState(0);

  const bornMapRef = useRef(new WeakMap<Element, Plan>());
  const pulsedSetRef = useRef(new WeakSet<Element>());
  const stashBornSetRef = useRef(new WeakSet<Element>());

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
    },
    [],
  );

  const later = useCallback((fn: () => void, ms: number): void => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);

  const clearLeaving = useCallback((): void => {
    if (planRef.current && planRef.current.leaving.length) {
      planRef.current = { ...planRef.current, leaving: [] };
    }
    setPlanVersion((v) => v + 1);
  }, []);

  const prepare = useCallback(
    (evs: GitEvent[], prev: RepoState, next: RepoState, isError: boolean): void => {
      beforeRef.current = snapRects(rootRef.current);
      const plan = isError
        ? null
        : mkPlan({ evs, prev, next, Lp: layoutOf(prev), Ln: layoutOf(next), reduced: reducedRef.current, lastManual: camera.lastManualRef.current, now: Date.now() });
      pendingPlanRef.current = plan;
      if (plan) planRef.current = plan;
    },
    [rootRef, reducedRef, camera.lastManualRef],
  );

  const after = useCallback(
    (res: CommandResult, prev: RepoState, next: RepoState): string => {
      const plain = res.salida.map((l) => l.replace(/\x01[^\x02]*\x02/g, '').replace(/\x03/g, '')).join(' ');
      if (res.error) {
        const el = termRef.current;
        if (el && !reducedRef.current) {
          el.animate(
            [
              { transform: 'translateX(0)' },
              { transform: 'translateX(-6px)' },
              { transform: 'translateX(6px)' },
              { transform: 'translateX(-4px)' },
              { transform: 'translateX(3px)' },
              { transform: 'translateX(0)' },
            ],
            { duration: 300, easing: 'ease-out' },
          );
        }
        return `Error. ${plain}`;
      }
      const explained = explicar(res.eventos, next);
      if (explained) toasts.push(explained);
      const live = `${explained ? explained.text.replace(/`/g, '') + ' ' : ''}${plain.slice(0, 300)}`;
      const plan = pendingPlanRef.current;
      if (plan && plan === planRef.current) {
        choreo(res.eventos, beforeRef.current, prev, next, plan, {
          root: rootRef.current,
          overlay: overlayRef.current,
          fx: fxRef.current,
          reduced: reducedRef.current,
          camera,
          later,
          clearLeaving,
        });
      }
      return live;
    },
    [termRef, reducedRef, toasts, rootRef, overlayRef, fxRef, camera, later, clearLeaving],
  );

  const finishAll = useCallback((): void => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    camera.finish();
    try {
      document.getAnimations().forEach((a) => {
        const timing = a.effect?.getTiming?.();
        if (timing && timing.iterations === Infinity) return;
        try {
          a.finish();
        } catch {
          // Some elements/animations may not support finish(); ignore.
        }
      });
    } catch {
      // getAnimations() may be unsupported; ignore.
    }
    if (overlayRef.current) overlayRef.current.innerHTML = '';
    if (planRef.current && planRef.current.leaving.length) clearLeaving();
  }, [camera, overlayRef, clearLeaving]);

  const node = useCallback((el: SVGGElement | null): void => {
    if (!el) return;
    const plan = planRef.current;
    if (!plan) return;
    const h = el.getAttribute('data-h');
    const d = h != null ? plan.births[h] : undefined;
    if (d == null || bornMapRef.current.get(el) === plan) return;
    bornMapRef.current.set(el, plan);
    const inner = el.querySelector('[data-inner]');
    const rip = el.querySelector('[data-ripple]');
    if (reducedRef.current) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'backwards' });
      return;
    }
    const f = plan.from[h!];
    const to = plan.Ln.pos[h!]!;
    if (f) {
      const mid = { X: (f.X + to.X) / 2, Y: Math.min(f.Y, to.Y) - 90 };
      el.animate(
        [
          { transform: `translate(${f.X}px,${f.Y}px)`, opacity: 0.3 },
          { transform: `translate(${mid.X}px,${mid.Y}px)`, opacity: 0.7, offset: 0.5 },
          { transform: `translate(${to.X}px,${to.Y}px)`, opacity: 1 },
        ],
        { duration: 620, delay: d, easing: EASE_IN_OUT, fill: 'backwards' },
      );
    } else {
      inner?.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.15)', offset: 0.6 }, { transform: 'scale(1)' }], {
        duration: 450,
        delay: d,
        easing: EASE_OUT,
        fill: 'backwards',
      });
    }
    el.querySelector('text')?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, delay: d + (f ? 600 : 200), fill: 'backwards' });
    rip?.animate([{ opacity: 0.7, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(2.6)' }], {
      duration: 700,
      delay: d + (f ? 600 : 160),
      easing: EASE_OUT,
    });
  }, [reducedRef]);

  const rnode = useCallback((el: SVGGElement | null): void => {
    if (!el) return;
    const plan = planRef.current;
    if (!plan) return;
    const h = el.getAttribute('data-rh');
    const d = h != null ? plan.rbirths[h] : undefined;
    if (d == null || bornMapRef.current.get(el) === plan) return;
    bornMapRef.current.set(el, plan);
    if (reducedRef.current) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'backwards' });
      return;
    }
    el.querySelector('[data-inner]')?.animate(
      [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }],
      { duration: 450, delay: d, easing: EASE_OUT, fill: 'backwards' },
    );
  }, [reducedRef]);

  const edge = useCallback((el: SVGPathElement | null): void => {
    if (!el) return;
    const plan = planRef.current;
    if (!plan) return;
    const ch = el.getAttribute('data-child');
    const isRemote = el.hasAttribute('data-remote');
    const d = ch != null ? (isRemote ? plan.rbirths[ch] : plan.births[ch]) : undefined;
    if (d == null || bornMapRef.current.get(el) === plan) return;
    bornMapRef.current.set(el, plan);
    if (reducedRef.current) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'backwards' });
      return;
    }
    let len = 200;
    try {
      len = el.getTotalLength();
    } catch {
      // Some test/edge environments may not support getTotalLength(); keep the fallback.
    }
    const delay = !isRemote && plan.from[ch!] ? d + 540 : Math.max(0, d - 200);
    el.animate([{ strokeDasharray: `${len} ${len}`, strokeDashoffset: len }, { strokeDasharray: `${len} ${len}`, strokeDashoffset: 0 }], {
      duration: 380,
      delay,
      easing: EASE_OUT,
      fill: 'backwards',
    });
  }, [reducedRef]);

  const label = useCallback((el: SVGGElement | null): void => {
    if (!el) return;
    const plan = planRef.current;
    if (!plan) return;
    const k = el.getAttribute('data-label');
    const inner = el.querySelector('[data-inner]');
    if (!inner || bornMapRef.current.get(el) === plan) return;
    if (el.getAttribute('data-leaving')) {
      bornMapRef.current.set(el, plan);
      inner.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.6)' }], { duration: 380, easing: EASE_OUT, fill: 'forwards' });
      return;
    }
    if (!k || !plan.newLabels[k]) return;
    bornMapRef.current.set(el, plan);
    if (reducedRef.current) {
      inner.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'backwards' });
      return;
    }
    const tag = k.startsWith('g:');
    inner.animate(
      tag
        ? [{ opacity: 0, transform: 'translateY(-22px)' }, { opacity: 1, transform: 'translateY(2px)', offset: 0.7 }, { opacity: 1, transform: 'none' }]
        : [{ opacity: 0, transform: 'translateY(24px) scale(0.3)' }, { opacity: 1, transform: 'none' }],
      { duration: 450, delay: plan.labelDelay, easing: EASE_SPRING, fill: 'backwards' },
    );
  }, [reducedRef]);

  const pulse = useCallback((el: Element | null): void => {
    if (!el || pulsedSetRef.current.has(el)) return;
    pulsedSetRef.current.add(el);
    el.animate([{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], { duration: 1400, iterations: Infinity, easing: 'ease-in-out' });
  }, []);

  const stash = useCallback((el: SVGGElement | null): void => {
    if (!el) return;
    const plan = planRef.current;
    if (!plan || stashBornSetRef.current.has(el)) return;
    stashBornSetRef.current.add(el);
    if (plan.Lp.stash) return;
    el.querySelector('[data-inner]')?.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], {
      duration: 450,
      delay: 300,
      easing: EASE_SPRING,
      fill: 'backwards',
    });
  }, []);

  // Memoized so `refs` is referentially stable across renders — all six
  // callbacks are themselves stable (`useCallback`), but the object
  // literal wrapping them was not, which defeated `GraphLayer`'s `memo()`
  // (design D8: it receives `refs` as a shallow-compared prop).
  const refs = useMemo(() => ({ node, rnode, edge, label, pulse, stash }), [node, rnode, edge, label, pulse, stash]);

  return {
    planRef,
    planVersion,
    prepare,
    after,
    finishAll,
    refs,
  };
}
