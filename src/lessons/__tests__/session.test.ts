import { describe, it, expect } from 'vitest';
import { createSession, revealHint, showSolution, recordAction, hasUsedHints } from '../session';

describe('level session (pure, in-memory attempt state — design.md "useLevelSession")', () => {
  it('starts with zero hints, no solution shown, and a zero action count', () => {
    const session = createSession();
    expect(session).toEqual({ hintsUsed: 0, solutionShown: false, count: 0 });
    expect(hasUsedHints(session)).toBe(false);
  });

  it('revealHint increments hintsUsed up to totalHints, then stops', () => {
    let session = createSession();
    session = revealHint(session, 2);
    expect(session.hintsUsed).toBe(1);
    session = revealHint(session, 2);
    expect(session.hintsUsed).toBe(2);
    session = revealHint(session, 2); // no more hints to reveal
    expect(session.hintsUsed).toBe(2);
    expect(hasUsedHints(session)).toBe(true);
  });

  it('showSolution flips solutionShown and counts as having used hints', () => {
    const session = showSolution(createSession());
    expect(session.solutionShown).toBe(true);
    expect(hasUsedHints(session)).toBe(true);
  });

  it('recordAction increments count only when the action counts', () => {
    let session = createSession();
    session = recordAction(session, true);
    expect(session.count).toBe(1);
    session = recordAction(session, false);
    expect(session.count).toBe(1);
  });

  it('every transition returns a new object (no mutation of the input)', () => {
    const session = createSession();
    const next = revealHint(session, 3);
    expect(next).not.toBe(session);
    expect(session.hintsUsed).toBe(0);
  });
});
