// The shared sandbox/level "workspace" presentation (design.md Key
// Decisions: "WorkspaceView({ws, toolbar, emptyState?, className,
// children})"). Extracted 1:1 from `PlaygroundShell`'s JSX (tasks.md Phase
// 7) — `toolbar` is a slot so the sandbox and a future `LevelShell` can
// each supply their own `ActionBar` configuration (different
// `showReset`/`homeHref`) without this component caring which.
import type { ReactNode } from 'react';
import { Canvas } from '../Canvas';
import { GraphLayer } from '../GraphLayer';
import { CameraControls } from '../CameraControls';
import { FilesStrip } from '../FilesStrip';
import type { FileActionResult } from '../FilesStrip';
import { ToastStack } from '../ToastStack';
import { Tooltip } from '../Tooltip';
import { ConflictResolver } from '../ConflictResolver';
import { ConflictPill } from '../ConflictPill';
import { FileEditorModal } from '../FileEditorModal';
import { EmptyState } from '../EmptyState';
import { FlyOverlay } from '../FlyOverlay';
import { LiveRegion } from '../LiveRegion';
import { TerminalWindow } from '../TerminalWindow';
import { HostingView } from '../hosting/HostingView';
import type { UseWorkspaceResult } from './useWorkspace';
import { NO_LEAVING_LABELS } from './useWorkspace';
import { parseLine } from '../../ui/markup';
import styles from './WorkspaceView.module.css';

/** Decodes a `HostingOutcome`-shaped engine error (`lines`, markup-encoded)
 * into the plain Spanish text `FilesStrip`'s inline error UI expects — the
 * panel is a pure renderer and shouldn't need to know about the engine's
 * `\x01kind\x02text\x03` wire format. */
function plainTextOf(lines: string[]): string {
  return lines
    .map((line) => parseLine(line).map((seg) => seg.t).join(''))
    .join(' ')
    .trim();
}

function toFileActionResult(outcome: { ok: true } | { ok: false; lines: string[] }): FileActionResult {
  return outcome.ok ? { ok: true } : { ok: false, error: plainTextOf(outcome.lines) };
}

export interface EmptyStateCopy {
  notInited: { title: string; text: string };
  noCommits: { title: string; text: string };
}

// The sandbox's exact existing copy (design-handoff/Git Playground.dc.html's
// `resetEmpty`/post-init-but-no-commits placeholder) — the DEFAULT, so
// `PlaygroundShell` renders byte-identical text without passing anything.
const DEFAULT_EMPTY_STATE: EmptyStateCopy = {
  notInited: {
    title: 'Esta carpeta todavía no es un repositorio',
    text: 'Escribe git init en la terminal para que Git empiece a vigilarla.',
  },
  noCommits: {
    title: 'Aún no hay commits',
    text: 'Crea un archivo (echo "hola" > notas.txt), prepáralo con git add y guárdalo con git commit -m "Primer commit".',
  },
};

export interface WorkspaceViewProps {
  ws: UseWorkspaceResult;
  /** The action bar / toolbar to render (sandbox and a future LevelShell
   * each supply their own `ActionBar` configuration). */
  toolbar: ReactNode;
  /** Overrides the two empty-state copy variants; defaults to the
   * sandbox's existing copy. */
  emptyState?: EmptyStateCopy;
  className?: string;
  children?: ReactNode;
}

export function WorkspaceView({ ws, toolbar, emptyState = DEFAULT_EMPTY_STATE, className, children }: WorkspaceViewProps) {
  const { repo, layout } = ws;
  const rootClassName = className ? `${styles.root} ${className}` : styles.root;

  return (
    <div ref={ws.rootRef} className={rootClassName}>
      <Canvas canvasRef={ws.canvasRef} onPointerDown={ws.camera.onCanvasPointerDown}>
        {layout && (
          <GraphLayer
            layout={layout}
            planVersion={ws.choreo.planVersion}
            tipId={ws.tipId}
            worldRef={ws.camera.worldRef}
            handlers={ws.graphHandlers}
            refs={ws.choreo.refs}
            fxRef={ws.fxRef}
            leaving={ws.choreo.planRef.current?.leaving ?? NO_LEAVING_LABELS}
          />
        )}
      </Canvas>

      {ws.showEmpty &&
        (repo?.inited ? (
          <EmptyState title={emptyState.noCommits.title} text={emptyState.noCommits.text} />
        ) : (
          <EmptyState title={emptyState.notInited.title} text={emptyState.notInited.text} />
        ))}

      <FilesStrip
        model={ws.filesModelValue}
        summary={ws.stripSummaryValue}
        mobile={ws.view.mobile}
        open={ws.stripOpen}
        mobileShown={ws.stripMobile}
        onToggle={ws.onToggleStrip}
        onShowMobile={ws.onShowMobileStrip}
        onCreateFile={(name) => toFileActionResult(ws.playground.createFile(name))}
        onRenameFile={(from, to) => toFileActionResult(ws.playground.renameFile(from, to))}
        onDeleteFile={(name) => toFileActionResult(ws.playground.deleteFile(name))}
        onEditFile={ws.playground.openEditor}
      />

      {toolbar}

      {ws.hostingView.open && (
        <HostingView
          route={ws.hostingView.route}
          prs={ws.prs}
          originBranches={ws.originBranches}
          prView={ws.activePrView}
          onClose={ws.hostingView.closeView}
          onGoToList={ws.hostingView.goToList}
          onGoToNew={ws.hostingView.goToNew}
          onGoToPr={ws.hostingView.goToPr}
          onSetTab={ws.hostingView.setTab}
          onCreate={ws.playground.hosting.create}
          onCommentPr={ws.playground.hosting.comment}
          onClosePr={ws.playground.hosting.close}
          onReopenPr={ws.playground.hosting.reopen}
          onMergePr={ws.playground.hosting.merge}
        />
      )}

      <ToastStack toasts={ws.toasts.toasts} />

      {ws.tip &&
        (() => {
          const screenPos = ws.camera.w2s({ X: ws.tooltip.tip!.X, Y: ws.tooltip.tip!.Y });
          const placement = ws.tipPlacement(screenPos, ws.tooltip.tip!.r, ws.camera.camRef.current.k, ws.view.vw);
          return <Tooltip data={ws.tip} placement={placement} />;
        })()}

      {ws.resolverModelValue?.hasConflict &&
        (ws.playground.state.resolverHidden ? (
          <ConflictPill onShow={() => ws.playground.setResolverHidden(false)} />
        ) : (
          <ConflictResolver
            model={ws.resolverModelValue}
            onResolve={ws.playground.resolveConflict}
            onEdit={ws.playground.openEditor}
            onHide={() => ws.playground.setResolverHidden(true)}
          />
        ))}

      {ws.playground.state.editor && (
        <FileEditorModal
          file={ws.playground.state.editor.file}
          text={ws.playground.state.editor.text}
          onChange={ws.playground.setEditorText}
          onSave={() => ws.playground.saveFile(ws.playground.state.editor!.file, ws.playground.state.editor!.text)}
          onCancel={ws.playground.closeEditor}
        />
      )}

      <CameraControls
        bottom={ws.term.camBottom}
        onZoomIn={ws.camera.zoomIn}
        onZoomOut={ws.camera.zoomOut}
        onFit={ws.camera.fit}
        onCenterHead={ws.camera.centerHead}
      />
      <TerminalWindow
        windowRef={ws.termWindowRef}
        geom={ws.term.geom}
        min={ws.term.min}
        open={ws.term.open}
        resizable={ws.term.resizable}
        mobile={ws.view.mobile}
        onDragStart={ws.term.onDragStart}
        onResizeStart={ws.term.onResizeStart}
        onToggleMin={ws.term.toggleMin}
        onToggleMax={ws.term.toggleMax}
        lines={ws.playground.state.lines}
        promptSegs={ws.promptSegs}
        input={ws.playground.state.input}
        onInputChange={ws.playground.setInput}
        onSubmit={ws.playground.run}
        onHistoryPrev={ws.playground.historyPrev}
        onHistoryNext={ws.playground.historyNext}
        onComplete={ws.playground.completeInput}
        onClearLines={ws.playground.clearLines}
      />
      <FlyOverlay overlayRef={ws.overlayRef} />
      <LiveRegion text={ws.playground.state.live} />
      {children}
    </div>
  );
}
