// GREEN (tasks.md Phase 5, 5.2): stateful wrapper over the pure
// `src/lessons/session.ts` transitions — re-renders `LevelShell`/
// `LessonPanel` on every change (via `session`) while also exposing a
// `ref` that always holds the LATEST value synchronously (design.md Key
// Decisions: "useLevelSession updates its ref synchronously"), so a
// callback that must read the current session without depending on it
// (`LevelShell`'s `persist`, invoked from `useGitPlayground`'s handlers)
// never sees a stale closure.
import { useCallback, useRef, useState } from 'react';
import { createSession, revealHint, showSolution, recordAction, hasUsedHints } from '../../lessons/session';
import type { LevelSession } from '../../lessons/session';

export interface UseLevelSessionResult {
  session: LevelSession;
  ref: { current: LevelSession };
  revealHint(totalHints: number): void;
  showSolution(): void;
  recordAction(counts: boolean): void;
  reset(): void;
  hasUsedHints: boolean;
}

export function useLevelSession(initial?: LevelSession): UseLevelSessionResult {
  const [session, setSession] = useState<LevelSession>(() => initial ?? createSession());
  const ref = useRef(session);
  ref.current = session;

  const onRevealHint = useCallback((totalHints: number) => {
    const next = revealHint(ref.current, totalHints);
    ref.current = next;
    setSession(next);
  }, []);

  const onShowSolution = useCallback(() => {
    const next = showSolution(ref.current);
    ref.current = next;
    setSession(next);
  }, []);

  const onRecordAction = useCallback((counts: boolean) => {
    const next = recordAction(ref.current, counts);
    ref.current = next;
    setSession(next);
  }, []);

  const reset = useCallback(() => {
    const next = createSession();
    ref.current = next;
    setSession(next);
  }, []);

  return {
    session,
    ref,
    revealHint: onRevealHint,
    showSolution: onShowSolution,
    recordAction: onRecordAction,
    reset,
    hasUsedHints: hasUsedHints(session),
  };
}
