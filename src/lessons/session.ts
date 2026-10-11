// Pure, in-memory level-attempt state (design.md: "useLevelSession updates
// its ref synchronously."). This module owns only the VALUE and its
// transitions; Phase 5's `useLevelSession` hook will hold it in a ref/state
// and persist snapshots of it via `src/lessons/progress/store.ts`. Kept
// framework-free (no React) so it's trivially node-testable on its own.
export interface LevelSession {
  hintsUsed: number;
  solutionShown: boolean;
  count: number;
}

export function createSession(): LevelSession {
  return { hintsUsed: 0, solutionShown: false, count: 0 };
}

/** Reveals the next hint, capped at `totalHints` (level-player spec
 * "Progressive Hints and Solution Reveal": "Hints MUST reveal one at a
 * time on explicit request, in order."). A no-op once every hint has
 * already been revealed. */
export function revealHint(session: LevelSession, totalHints: number): LevelSession {
  if (session.hintsUsed >= totalHints) return session;
  return { ...session, hintsUsed: session.hintsUsed + 1 };
}

/** Viewing the solution counts as a hint used (level-player spec: "Viewing
 * the solution counts as a hint used"), capping stars per the star rule —
 * see `hasUsedHints` below and `progress/stars.ts`'s `computeStars`. */
export function showSolution(session: LevelSession): LevelSession {
  return { ...session, solutionShown: true };
}

/** Increments the live action counter, but only when `counts` is true
 * (the caller classifies via `src/engine/lessons/counting.ts`'s
 * `countsLiveAction` first). */
export function recordAction(session: LevelSession, counts: boolean): LevelSession {
  return counts ? { ...session, count: session.count + 1 } : session;
}

/** True once any hint OR the solution was used this attempt — the single
 * condition that caps a completion at 1 star (`progress/stars.ts`'s
 * `computeStars`). */
export function hasUsedHints(session: LevelSession): boolean {
  return session.hintsUsed > 0 || session.solutionShown;
}
