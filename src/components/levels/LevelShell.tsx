// GREEN (tasks.md Phase 5, 5.2): the level-session assembly (level-player
// spec's domain purpose: "the UI that runs a level session"). Composes the
// exact same `useWorkspace`/`WorkspaceView` the sandbox uses (design.md Key
// Decisions: "Shared Component Reuse") plus `LessonPanel`/`SuccessDialog`
// and the level-scoped persistence/session wiring design.md's "Level deps"
// bullet describes.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PersistenceDeps, PlayerActionEvent } from '../../app/useGitPlayground';
import { useWorkspace } from '../workspace/useWorkspace';
import { WorkspaceView } from '../workspace/WorkspaceView';
import { ActionBar } from '../ActionBar';
import { useProgress } from '../../lessons/progress/ProgressContext';
import { useLevelSession } from './useLevelSession';
import { LessonPanel } from './LessonPanel';
import { SuccessDialog } from './SuccessDialog';
import { seedOf } from '../../lessons/seed';
import { nextLevelOf } from '../../lessons/catalog';
import { evaluateLevel } from '../../engine/lessons/evaluate';
import { computeBudget, countsLiveAction } from '../../engine/lessons/counting';
import { computeStars } from '../../lessons/progress/stars';
import type { LevelDef, PlayerAction } from '../../engine/lessons/types';
import type { RepoState } from '../../engine/types';
import type { Stars } from '../../lessons/progress/schema';

export interface LevelShellProps {
  level: LevelDef;
  /** Bumps the parent's remount key (design.md: "Level reset: clear the
   * snapshot and remount LevelShell via key `${id}:${nonce}`") — the
   * remount itself is owned by the ROUTE (`LevelRoute`'s body), not this
   * component. */
  onResetLevel(): void;
}

const MAP_HREF = '#/niveles';

// Distinct from `level.objective` (already shown in `LessonPanel`) so a
// level never duplicates the exact same sentence in both the terminal and
// the lesson panel.
const LEVEL_BOOT_LINES = ['Revisa el objetivo y la lista de pasos en el panel lateral, y escribe comandos de Git en la terminal para completarlos.', ''];

export function LevelShell({ level, onResetLevel }: LevelShellProps) {
  const progress = useProgress();
  const seed = useMemo(() => seedOf(level), [level.id, level.version]);
  const budget = useMemo(() => computeBudget(level), [level]);
  const snapshot = progress.snapshotFor(level.id, level.version);

  const initialSession = useMemo(
    () => (snapshot ? { hintsUsed: snapshot.hintsUsed, solutionShown: snapshot.solutionShown, count: snapshot.count } : undefined),
    // Intentionally read only once per mount — `LevelShell` is remounted
    // (new instance) whenever the level content or a reset changes, via
    // the caller's `${id}:${nonce}` key, so this never needs to react to
    // `snapshot` changing after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const session = useLevelSession(initialSession);

  const completedRef = useRef(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [earnedStars, setEarnedStars] = useState<Stars>(3);

  const onAction = useCallback(
    (action: PlayerActionEvent) => {
      session.recordAction(countsLiveAction(action as PlayerAction));
    },
    [session],
  );

  const persist = useCallback(
    (repo: RepoState, hist: string[]) => {
      if (completedRef.current) return;
      const s = session.ref.current;
      const untouched = s.hintsUsed === 0 && !s.solutionShown && s.count === 0;
      if (repo === seed && untouched) return;
      progress.saveSnapshot(level.id, { levelVersion: level.version, repo, hist, hintsUsed: s.hintsUsed, solutionShown: s.solutionShown, count: s.count });
    },
    // `progress.saveSnapshot`/`session`/`seed` are each stable per mount
    // (same instance/memo for this `LevelShell`'s whole lifetime); `level`
    // doesn't change without a remount either.
    [progress, session, seed, level.id, level.version],
  );

  const persistenceDeps: PersistenceDeps = useMemo(
    () => ({ initialRepo: snapshot?.repo ?? seed, initialHist: snapshot?.hist ?? [], persist }),
    // Read once per mount, same reasoning as `initialSession` above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const ws = useWorkspace({
    persistence: persistenceDeps,
    onAction,
    bootLines: LEVEL_BOOT_LINES,
    hostingEnabled: !!level.hosting,
  });

  const repo = ws.repo ?? seed;
  const evaluation = useMemo(() => evaluateLevel(level, repo), [level, repo]);

  useEffect(() => {
    if (!evaluation.solved || completedRef.current) return;
    completedRef.current = true;
    const stars = computeStars({ hintsUsed: session.hasUsedHints, count: session.ref.current.count, budget });
    progress.recordCompletion(level.id, { stars, count: session.ref.current.count });
    progress.clearSnapshot(level.id);
    setEarnedStars(stars);
    setShowSuccess(true);
    // `session`/`progress`/`level`/`budget` are stable for this mount;
    // only `evaluation.solved` flipping to true should (once) trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluation.solved]);

  const handleReset = useCallback(() => {
    progress.clearSnapshot(level.id);
    onResetLevel();
  }, [progress, level.id, onResetLevel]);

  const next = nextLevelOf(level);
  const nextDisabled = !next || !progress.unlocked.has(next.id);

  return (
    <>
      <WorkspaceView
        ws={ws}
        toolbar={
          <ActionBar
            showMate={false}
            mateLabel=""
            onMate={() => {}}
            onToggleTheme={() => {}}
            resetOpen={false}
            onToggleReset={() => {}}
            onResetExample={() => {}}
            onResetEmpty={() => {}}
            showHosting={ws.hostingVisible}
            hostingCount={ws.hostingCount}
            onOpenHosting={ws.hostingView.openView}
            showReset={false}
            homeHref={MAP_HREF}
          />
        }
      >
        <LessonPanel
          level={level}
          evaluation={evaluation}
          budget={budget}
          count={session.session.count}
          hintsUsed={session.session.hintsUsed}
          solutionShown={session.session.solutionShown}
          onRevealHint={() => {
            session.revealHint(level.hints.length);
            // Revealing a hint/solution must be persisted immediately — not
            // only on the next command — so a remount before any command
            // runs doesn't lose the hints-used flag that caps stars at 1
            // (level-progress spec "Star Scoring Rule").
            ws.playground.persistNow();
          }}
          onShowSolution={() => {
            session.showSolution();
            ws.playground.persistNow();
          }}
          onReset={handleReset}
          mapHref={MAP_HREF}
        />
      </WorkspaceView>
      {showSuccess && (
        <SuccessDialog
          stars={earnedStars}
          onNext={() => {
            if (next) window.location.hash = `#/niveles/${next.id}`;
          }}
          nextDisabled={nextDisabled}
          onRepeat={handleReset}
          onBackToMap={() => {
            window.location.hash = MAP_HREF;
          }}
          onClose={() => setShowSuccess(false)}
        />
      )}
    </>
  );
}
