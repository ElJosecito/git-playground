// Derived (never persisted) mergeability for a pull request — new behavior
// (no oracle equivalent). Computed on demand from `s.remote.branches`
// (design.md "Outdated PRs" decision / spec's "Derived Mergeability"
// requirement): `conflicts` (base 3-way merge) blocks every strategy;
// `outdated` is informational only and never blocks; `canRebase:false` (via
// a `replayOnto` dry run) blocks only the rebase strategy, even when the
// base merge is clean.
import { fusionar3 } from '../diff';
import { treeOf, mergeBase, anc } from '../refs';
import { replayOnto, sourceOnlyCommits } from './replay';
import type { Hash, RepoState } from '../types';
import type { Mergeability } from './types';

export function computeMergeability(s: RepoState, source: string, target: string): Mergeability {
  const sourceHash: Hash | undefined = s.remote.branches[source];
  const targetHash: Hash | undefined = s.remote.branches[target];
  if (!sourceHash || !targetHash) {
    return { state: 'missing-branch', conflicts: [], ahead: 0, behind: 0, outdated: false, canRebase: false };
  }

  const A = anc(s, sourceHash);
  const B = anc(s, targetHash);
  let ahead = 0;
  let behind = 0;
  for (const h in A) if (!B[h]) ahead++;
  for (const h in B) if (!A[h]) behind++;

  const base = mergeBase(s, sourceHash, targetHash);
  const m = fusionar3(treeOf(s, base), treeOf(s, targetHash), treeOf(s, sourceHash));
  if (m.conf.length) {
    return { state: 'conflicts', conflicts: m.conf, ahead, behind, outdated: false, canRebase: false };
  }

  const todo = sourceOnlyCommits(s, sourceHash, targetHash);
  const replay = replayOnto(s, todo, targetHash);
  return { state: 'clean', conflicts: [], ahead, behind, outdated: behind > 0, canRebase: replay.ok };
}
