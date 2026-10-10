// Automatic PR status transitions mirroring GitHub: new behavior (no oracle
// equivalent) — see design.md "Auto transitions" decision and spec's
// "Automatic Status Mirrors GitHub" requirement. Runs at the end of every
// successful `envolver()`/`ejecutar()` call (wired in `run.ts`), right
// before `diffEventos`. No-ops immediately when the repo has no hosting
// state yet, so repos without PR activity never gain a `hosting` key.
import { isWellFormedHosting } from './state';
import { isAnc } from '../refs';
import type { Recorder } from '../recorder';
import type { RepoState } from '../types';
import type { HostingState, PullRequest } from './types';

function closeAuto(hosting: HostingState, pr: PullRequest, reason: 'source-deleted' | 'target-deleted', r: Recorder): void {
  hosting.clock++;
  pr.status = 'closed';
  pr.closeReason = reason;
  pr.timeline.push({ kind: 'closed', reason, at: hosting.clock });
  r.ev('pr-closed', { id: pr.id, reason });
}

function mergeAuto(hosting: HostingState, pr: PullRequest, targetHash: string, r: Recorder): void {
  hosting.clock++;
  pr.status = 'merged';
  pr.mergedHash = targetHash;
  pr.timeline.push({ kind: 'merged', strategy: 'external', hash: targetHash, at: hosting.clock });
  r.ev('pr-merged', { id: pr.id, strategy: 'external', target: pr.target, hash: targetHash, branchDeleted: false });
}

export function syncHosting(s: RepoState, r: Recorder): void {
  const hosting = s.hosting;
  if (!isWellFormedHosting(hosting)) return;
  for (const pr of hosting.prs) {
    if (pr.status !== 'open') continue;
    const sourceHash = s.remote.branches[pr.source];
    const targetHash = s.remote.branches[pr.target];
    if (!sourceHash) closeAuto(hosting, pr, 'source-deleted', r);
    else if (!targetHash) closeAuto(hosting, pr, 'target-deleted', r);
    else if (isAnc(s, sourceHash, targetHash)) mergeAuto(hosting, pr, targetHash, r);
  }
}
