// The shared sandbox/level "workspace" data hook (design.md Key Decisions:
// "Workspace extraction. useWorkspace(opts) takes over everything
// PlaygroundShell owns" except theme/persistence, which stay with the
// caller since a level session persists to a level-scoped snapshot, not
// `gitpg:v1`). Extracted 1:1 from `PlaygroundShell` (tasks.md Phase 7) —
// `PlaygroundShell` now composes this hook with `WorkspaceView` instead of
// owning the wiring itself; a future `LevelShell` (Phase 5) will do the
// same with its own `persistence`/`onAction`/`bootLines`/`hostingEnabled`.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGitPlayground } from '../../app/useGitPlayground';
import type { PersistenceDeps, UseGitPlaygroundOptions } from '../../app/useGitPlayground';
import { useHostingView } from '../../app/useHostingView';
import { useTerminalWindow } from '../../hooks/useTerminalWindow';
import { useCamera } from '../../hooks/useCamera';
import type { CameraEnv, CameraGraphState } from '../../hooks/useCamera';
import { useChoreography } from '../../hooks/useChoreography';
import { useToasts } from '../../hooks/useToasts';
import { useTooltip } from '../../hooks/useTooltip';
import { useMobile } from '../../hooks/useMobile';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { GraphHandlers } from '../GraphLayer';
import { promptSegs, filesModel, stripSummary, resolverModel } from '../../ui/selectors';
import { tipData, tipPlacement } from '../../ui/tooltip';
import { layoutOf } from '../../ui/layoutCache';
import { GitEngine } from '../../engine';

// Hoisted (rerender-memo-with-default-value): a fresh `[]` literal at the
// `leaving ?? []` call site would give `GraphLayer` (a `memo()` component)
// a new array reference on every render with no pending plan, defeating
// its shallow-prop memoization.
export const NO_LEAVING_LABELS: readonly never[] = [];

export interface UseWorkspaceOptions {
  persistence?: PersistenceDeps;
  onAction?: UseGitPlaygroundOptions['onAction'];
  bootLines?: UseGitPlaygroundOptions['bootLines'];
  /** Gates the remote-box-click entry point into the hosting web view
   * (design.md: "graphHandlers memo (remote-box click only when
   * hostingEnabled)"). Defaults to `true` — the sandbox's current,
   * unchanged behavior. A level without `allowHostingUI` passes `false`
   * so no PR entry point is reachable anywhere in its shell
   * (level-player spec "Shared Component Reuse": "no hosting entry point
   * appears anywhere in the shell"). */
  hostingEnabled?: boolean;
}

export function useWorkspace(options: UseWorkspaceOptions = {}) {
  const { persistence, onAction, bootLines, hostingEnabled = true } = options;

  const canvasRef = useRef<HTMLDivElement>(null);
  const view = useMobile(canvasRef);
  const term = useTerminalWindow(view);
  const envRef = useRef<CameraEnv>({ vw: view.vw, vh: view.vh, mobile: view.mobile, term: term.box, termMin: term.min });
  const graphRef = useRef<CameraGraphState>({ layout: null, headHash: null });
  // Read once (oracle: `this.reduced=matchMedia(...).matches`, set in
  // componentDidMount and never re-checked).
  const reducedRef = useReducedMotion();

  // The whole workspace's root (design D15: every choreography DOM query —
  // `[data-chip]`, `[data-label]`, `[data-h]`, `[data-zone]`, `[data-stash]`
  // — is scoped to this), the `fly()` chip overlay (design D9), the
  // `particle()` layer inside the SVG world group (design D9), and the
  // terminal's root (shaken on a command error).
  const rootRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<SVGGElement>(null);
  const termWindowRef = useRef<HTMLDivElement>(null);

  const toasts = useToasts();
  const tooltip = useTooltip();

  // `stripOpen`/`stripMobile` are local UI toggle state, same as the
  // oracle's own component state (they are not part of `playgroundReducer`
  // per design.md's reducer shape).
  const [stripOpen, setStripOpen] = useState(true);
  const [stripMobile, setStripMobile] = useState(false);

  // Camera movement (manual pan/zoom or a programmatic `camTo`) dismisses
  // any open tooltip, same as the oracle's `manual()`/`camTo()` clearing
  // `state.tip`. `camera` only closes over `graphRef`/`envRef` (mutable
  // containers, not values), so it can be created before `playground`
  // below even though `graphRef`'s CONTENT is only set once `playground`'s
  // repo is known (just after).
  const camera = useCamera({ canvasRef, envRef, reducedRef, graphRef, onMove: tooltip.clear });

  // `choreo` drives `useGitPlayground`'s `prepare()`/`after()`/
  // `finishAll()` calls (design's data-flow diagram) — it must exist
  // before `playground` is created.
  const choreo = useChoreography({ rootRef, overlayRef, fxRef, termRef: termWindowRef, camera, reducedRef, toasts });
  const playground = useGitPlayground(choreo, persistence, { onAction, bootLines });
  const hostingView = useHostingView();

  const onToggleStrip = useCallback(() => {
    if (view.mobile) setStripMobile(false);
    else setStripOpen((v) => !v);
  }, [view.mobile]);
  const onShowMobileStrip = useCallback(() => setStripMobile(true), []);

  // Refs are updated every render (not in an effect) so camera/choreography
  // callbacks invoked from DOM event listeners — wheel, pointer drag,
  // button clicks — always see the latest viewport/terminal/layout
  // snapshot without the camera hook itself re-subscribing on every
  // repo/viewport change (design D10: camera state must survive renders
  // untouched).
  envRef.current = { vw: view.vw, vh: view.vh, mobile: view.mobile, term: term.box, termMin: term.min };
  const repo = playground.state.repo;
  const layout = repo ? layoutOf(repo) : null;
  graphRef.current = {
    layout,
    headHash: repo ? GitEngine.headHash(repo) : null,
  };

  const didInitialFitRef = useRef(false);
  const fitAllRef = useRef(camera.fitAll);
  fitAllRef.current = camera.fitAll;
  useEffect(() => {
    if (!didInitialFitRef.current && term.box && repo) {
      didInitialFitRef.current = true;
      fitAllRef.current(0);
    }
    // `camera` is a fresh object identity every render by construction
    // (`useCamera` returns a new result object each call, same as every
    // other hook here) — keying this effect on it would re-run every
    // render. `fitAllRef` always points at the latest `camera.fitAll`
    // without being a dependency (advanced-effect-event-deps).
  }, [term.box, repo]);

  // Memoized (not a fresh object literal every render) so it doesn't defeat
  // `GraphLayer`'s `memo()` (design D8) — `tooltip.hover`/`tooltip.unhover`
  // are themselves stable (`useCallback`), so this only changes identity
  // when they actually do, or when `hostingEnabled` flips (level without
  // `allowHostingUI`: no PR entry point anywhere, including the remote box).
  const graphHandlers: GraphHandlers = useMemo(
    () => ({ onHover: tooltip.hover, onUnhover: tooltip.unhover, onRemoteBoxClick: hostingEnabled ? hostingView.openView : undefined }),
    [tooltip.hover, tooltip.unhover, hostingView.openView, hostingEnabled],
  );
  const tipId = tooltip.tip && tooltip.tip.kind === 'commit' ? tooltip.tip.id : null;
  const tip = repo && tooltip.tip ? tipData(tooltip.tip, repo) : null;

  const filesModelValue = filesModel(repo);
  const stripSummaryValue = stripSummary(repo);
  const resolverModelValue = resolverModel(repo);
  // `hasRemote` gates the "teammate" trigger (fetch/pull practice) — a
  // remote/origin concern, independent of hosting/PR UI. A level's
  // `allowHostingUI` has no bearing on whether it has a remote.
  const hasRemote = !!repo && Object.keys(repo.remote.branches).length > 0;
  const showEmpty = !layout || layout.nodes.length === 0;

  // Simulated hosting web view: both entry points (a toolbar's "Pull
  // requests (n)" button and the remote-box click wired into
  // `graphHandlers` above) are gated on `hasRemote` AND `hostingEnabled` —
  // a PR needs an `origin` to exist, and a level without `allowHostingUI`
  // must not expose one at all.
  const hostingVisible = hasRemote && hostingEnabled;
  const originBranches = repo ? Object.keys(repo.remote.branches) : [];
  const prs = repo ? GitEngine.listPullRequests(repo) : [];
  const hostingCount = prs.filter((pr) => pr.status === 'open').length;

  // PR detail: `prView` walks ancestors and diffs trees (`mergeBase`/
  // `diffArboles`), so it's memoized on `[repo, route]` rather than
  // recomputed on every render — `repo` only changes when a command
  // actually applies, and `route` only changes on navigation, so this skips
  // recomputation on unrelated re-renders (e.g. every terminal keystroke).
  const hostingRoute = hostingView.route;
  const activePrView = useMemo(
    () => (repo && hostingRoute.kind === 'pr' ? GitEngine.prView(repo, hostingRoute.id) : null),
    [repo, hostingRoute],
  );

  return {
    canvasRef,
    rootRef,
    overlayRef,
    fxRef,
    termWindowRef,
    view,
    term,
    toasts,
    tooltip,
    camera,
    choreo,
    playground,
    hostingView,
    stripOpen,
    stripMobile,
    onToggleStrip,
    onShowMobileStrip,
    repo,
    layout,
    graphHandlers,
    tipId,
    tip,
    tipPlacement,
    promptSegs: promptSegs(repo),
    filesModelValue,
    stripSummaryValue,
    resolverModelValue,
    hasRemote,
    hostingVisible,
    showEmpty,
    hostingEnabled,
    originBranches,
    prs,
    hostingCount,
    activePrView,
  };
}

export type UseWorkspaceResult = ReturnType<typeof useWorkspace>;
