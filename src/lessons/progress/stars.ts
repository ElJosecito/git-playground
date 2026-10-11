// Star scoring rule (level-progress spec "Star Scoring Rule"). Evaluated
// in this exact precedence — `hintsUsed` (which already folds in "the
// solution was shown", see `src/lessons/session.ts`'s `hasUsedHints`)
// always caps the attempt at 1 star, regardless of budget; only once that
// is false does the budget comparison decide between 2 and 3.
import type { Stars } from './schema';

export interface StarInput {
  hintsUsed: boolean;
  count: number;
  budget: number;
}

export function computeStars({ hintsUsed, count, budget }: StarInput): Stars {
  if (hintsUsed) return 1;
  return count <= budget ? 3 : 2;
}
