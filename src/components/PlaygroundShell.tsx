// The final assembly (tasks.md 7.9): wires the terminal, the SVG commit
// graph + camera + WAAPI choreography, the files strip / toasts / tooltip /
// conflict resolver+pill / inline editor / action bar / empty state
// (Phases 3-6), and Phase 7's theme/persistence/mobile/a11y hooks
// (`useTheme`, `usePersistence`, `useMobile`, `useReducedMotion`,
// `LiveRegion`) into one tree. Supersedes the Phase 3-6 `App.tsx` bridge's
// local stand-ins: the `theme` `useState`, the hardcoded `reducedRef`, and
// the ad hoc `useViewport()`.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGitPlayground } from '../app/useGitPlayground';
import type { PersistenceDeps } from '../app/useGitPlayground';
import { useHostingView } from '../app/useHostingView';
import { useTerminalWindow } from '../hooks/useTerminalWindow';
import { useCamera } from '../hooks/useCamera';
import type { CameraEnv, CameraGraphState } from '../hooks/useCamera';
import { useChoreography } from '../hooks/useChoreography';
import { useToasts } from '../hooks/useToasts';
import { useTooltip } from '../hooks/useTooltip';
import { useMobile } from '../hooks/useMobile';
import { useTheme } from '../hooks/useTheme';
import type { Theme } from '../hooks/useTheme';
import { usePersistence } from '../hooks/usePersistence';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { TerminalWindow } from './TerminalWindow';
import { Canvas } from './Canvas';
import { GraphLayer } from './GraphLayer';
import type { GraphHandlers } from './GraphLayer';
import { CameraControls } from './CameraControls';
import { FilesStrip } from './FilesStrip';
import { ActionBar } from './ActionBar';
import { ToastStack } from './ToastStack';
import { Tooltip } from './Tooltip';
import { ConflictResolver } from './ConflictResolver';
import { ConflictPill } from './ConflictPill';
import { FileEditorModal } from './FileEditorModal';
import { EmptyState } from './EmptyState';
import { FlyOverlay } from './FlyOverlay';
import { LiveRegion } from './LiveRegion';
import { HostingView } from './hosting/HostingView';
import { promptSegs, filesModel, stripSummary, resolverModel } from '../ui/selectors';
import { tipData, tipPlacement } from '../ui/tooltip';
import { layoutOf } from '../ui/layoutCache';
import { GitEngine } from '../engine';
import type { RepoState } from '../engine/types';
import styles from './PlaygroundShell.module.css';

// Byte-identical to the oracle's post-reset notice lines (design-handoff/Git
// Playground.dc.html's `resetExample`/`resetEmpty`).
const RESET_EXAMPLE_NOTICE = '\x01m\x02Repositorio reiniciado: README.md y dos commits en main.\x03';
const RESET_EMPTY_NOTICE = '\x01m\x02Carpeta vacía. Empieza con git init.\x03';

// Hoisted (rerender-memo-with-default-value): a fresh `[]` literal at the
// `leaving ?? []` call site below would give `GraphLayer` (a `memo()`
// component, design D8) a new array reference on every render with no
// pending plan, defeating its shallow-prop memoization.
const NO_LEAVING_LABELS: readonly never[] = [];

export function PlaygroundShell() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const view = useMobile(canvasRef);
  const term = useTerminalWindow(view);
  const envRef = useRef<CameraEnv>({ vw: view.vw, vh: view.vh, mobile: view.mobile, term: term.box, termMin: term.min });
  const graphRef = useRef<CameraGraphState>({ layout: null, headHash: null });
  // Read once (oracle: `this.reduced=matchMedia(...).matches`, set in
  // componentDidMount and never re-checked).
  const reducedRef = useReducedMotion();

  // The whole shell's root (design D15: every choreography DOM query —
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

  // Full `gitpg:v1` round trip (tasks.md 7.3/7.4): read once, lazily, and
  // written back explicitly (design D12) from the same points the oracle's
  // `save()` fires — `useGitPlayground`'s `PersistenceDeps.persist` below
  // covers apply/clear/load; `useTheme`'s `onChange` covers the theme
  // toggle. `themeRef` lets `persist` read the LATEST theme value without
  // `useGitPlayground` needing to know about theme at all.
  const persistence = usePersistence();
  const themeRef = useRef<Theme>(persistence.initial.theme);
  const persist = useCallback(
    (repo: RepoState, hist: string[]) => {
      persistence.save({ repo, theme: themeRef.current, hist });
    },
    [persistence],
  );
  const persistenceDeps: PersistenceDeps = {
    initialRepo: persistence.initial.repo,
    initialHist: persistence.initial.hist,
    persist,
  };

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
  const playground = useGitPlayground(choreo, persistenceDeps);
  const hostingView = useHostingView();

  // Theme toggle (tasks.md 7.1/7.2) — `onChange` keeps `themeRef` current
  // and triggers the oracle's `toggleTheme -> save()` on demand (no repo
  // arg: defaults to the current repo, matching `useGitPlayground`'s
  // `persistNow()` escape hatch).
  const { toggle: onToggleTheme } = useTheme(persistence.initial.theme, (next) => {
    themeRef.current = next;
    playground.persistNow();
  });

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
  // when they actually do.
  const graphHandlers: GraphHandlers = useMemo(
    () => ({ onHover: tooltip.hover, onUnhover: tooltip.unhover, onRemoteBoxClick: hostingView.openView }),
    [tooltip.hover, tooltip.unhover, hostingView.openView],
  );
  const tipId = tooltip.tip && tooltip.tip.kind === 'commit' ? tooltip.tip.id : null;
  const tip = repo && tooltip.tip ? tipData(tooltip.tip, repo) : null;

  const filesModelValue = filesModel(repo);
  const stripSummaryValue = stripSummary(repo);
  const resolverModelValue = resolverModel(repo);
  const hasRemote = !!repo && Object.keys(repo.remote.branches).length > 0;
  const showEmpty = !layout || layout.nodes.length === 0;

  // Simulated hosting web view (tasks.md Phase 3): both entry points
  // (ActionBar's "Pull requests (n)" button and the remote-box click wired
  // into `graphHandlers` above) are gated on `hasRemote`, same as the
  // teammate button — a PR needs an `origin` to exist.
  const originBranches = repo ? Object.keys(repo.remote.branches) : [];
  const prs = repo ? GitEngine.listPullRequests(repo) : [];
  const hostingCount = prs.filter((pr) => pr.status === 'open').length;

  // PR detail (tasks.md Phase 4): `prView` walks ancestors and diffs trees
  // (`mergeBase`/`diffArboles`), so it's memoized on `[repo, route]` rather
  // than recomputed on every render — `repo` only changes when a command
  // actually applies, and `route` only changes on navigation, so this skips
  // recomputation on unrelated re-renders (e.g. every terminal keystroke).
  const hostingRoute = hostingView.route;
  const activePrView = useMemo(
    () => (repo && hostingRoute.kind === 'pr' ? GitEngine.prView(repo, hostingRoute.id) : null),
    [repo, hostingRoute],
  );

  return (
    <div ref={rootRef} className={styles.root}>
      <Canvas canvasRef={canvasRef} onPointerDown={camera.onCanvasPointerDown}>
        {layout && (
          <GraphLayer
            layout={layout}
            planVersion={choreo.planVersion}
            tipId={tipId}
            worldRef={camera.worldRef}
            handlers={graphHandlers}
            refs={choreo.refs}
            fxRef={fxRef}
            leaving={choreo.planRef.current?.leaving ?? NO_LEAVING_LABELS}
          />
        )}
      </Canvas>

      {showEmpty &&
        (repo?.inited ? (
          <EmptyState
            title="Aún no hay commits"
            text='Crea un archivo (echo "hola" > notas.txt), prepáralo con git add y guárdalo con git commit -m "Primer commit".'
          />
        ) : (
          <EmptyState
            title="Esta carpeta todavía no es un repositorio"
            text="Escribe git init en la terminal para que Git empiece a vigilarla."
          />
        ))}

      <FilesStrip
        model={filesModelValue}
        summary={stripSummaryValue}
        mobile={view.mobile}
        open={stripOpen}
        mobileShown={stripMobile}
        onToggle={onToggleStrip}
        onShowMobile={onShowMobileStrip}
      />

      <ActionBar
        showMate={hasRemote}
        mateLabel={view.mobile ? 'Compañero' : 'Simular cambio de un compañero en origin'}
        onMate={playground.simulateTeammate}
        onToggleTheme={onToggleTheme}
        resetOpen={playground.state.resetOpen}
        onToggleReset={playground.toggleResetMenu}
        onResetExample={() => playground.loadRepo(GitEngine.ejemplo(), RESET_EXAMPLE_NOTICE)}
        onResetEmpty={() => playground.loadRepo(GitEngine.vacio(), RESET_EMPTY_NOTICE)}
        showHosting={hasRemote}
        hostingCount={hostingCount}
        onOpenHosting={hostingView.openView}
      />

      {hostingView.open && (
        <HostingView
          route={hostingView.route}
          prs={prs}
          originBranches={originBranches}
          prView={activePrView}
          onClose={hostingView.closeView}
          onGoToList={hostingView.goToList}
          onGoToNew={hostingView.goToNew}
          onGoToPr={hostingView.goToPr}
          onSetTab={hostingView.setTab}
          onCreate={playground.hosting.create}
          onCommentPr={playground.hosting.comment}
          onClosePr={playground.hosting.close}
          onReopenPr={playground.hosting.reopen}
          onMergePr={playground.hosting.merge}
        />
      )}

      <ToastStack toasts={toasts.toasts} />

      {tip &&
        (() => {
          const screenPos = camera.w2s({ X: tooltip.tip!.X, Y: tooltip.tip!.Y });
          const placement = tipPlacement(screenPos, tooltip.tip!.r, camera.camRef.current.k, view.vw);
          return <Tooltip data={tip} placement={placement} />;
        })()}

      {resolverModelValue?.hasConflict &&
        (playground.state.resolverHidden ? (
          <ConflictPill onShow={() => playground.setResolverHidden(false)} />
        ) : (
          <ConflictResolver
            model={resolverModelValue}
            onResolve={playground.resolveConflict}
            onEdit={playground.openEditor}
            onHide={() => playground.setResolverHidden(true)}
          />
        ))}

      {playground.state.editor && (
        <FileEditorModal
          file={playground.state.editor.file}
          text={playground.state.editor.text}
          onChange={playground.setEditorText}
          onSave={() => playground.saveFile(playground.state.editor!.file, playground.state.editor!.text)}
          onCancel={playground.closeEditor}
        />
      )}

      <CameraControls
        bottom={term.camBottom}
        onZoomIn={camera.zoomIn}
        onZoomOut={camera.zoomOut}
        onFit={camera.fit}
        onCenterHead={camera.centerHead}
      />
      <TerminalWindow
        windowRef={termWindowRef}
        geom={term.geom}
        min={term.min}
        open={term.open}
        resizable={term.resizable}
        mobile={view.mobile}
        onDragStart={term.onDragStart}
        onResizeStart={term.onResizeStart}
        onToggleMin={term.toggleMin}
        onToggleMax={term.toggleMax}
        lines={playground.state.lines}
        promptSegs={promptSegs(repo)}
        input={playground.state.input}
        onInputChange={playground.setInput}
        onSubmit={playground.run}
        onHistoryPrev={playground.historyPrev}
        onHistoryNext={playground.historyNext}
        onComplete={playground.completeInput}
        onClearLines={playground.clearLines}
      />
      <FlyOverlay overlayRef={overlayRef} />
      <LiveRegion text={playground.state.live} />
    </div>
  );
}
