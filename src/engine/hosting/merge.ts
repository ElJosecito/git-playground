// Server-side merge for a pull request: new behavior (no oracle
// equivalent), but writes only to `s.remote.branches`/`s.remote.known`,
// creating commits with `extra:{local:false}` exactly like `companero()`
// does for Lucía's commits — so the local repo only learns about the merge
// through the existing fetch/pull path (design.md "Server Merge
// Mechanics"). Never touches `HEAD`, `files`, `index` or `s.tracking`.
import { fail } from '../errors';
import { envolver } from '../run';
import { laneFor, nuevoCommit } from '../state';
import { treeOf, mergeBase } from '../refs';
import { fusionar3 } from '../diff';
import { AUTOR } from '../constants';
import { computeMergeability } from './mergeability';
import { replayOnto, sourceOnlyCommits } from './replay';
import { ensureHosting } from './state';
import type { CommandResult, Hash, RepoState } from '../types';
import type { HostingState, MergeStrategy, PullRequest } from './types';

function requirePr(hosting: HostingState, id: number): PullRequest {
  const pr = hosting.prs.find((p) => p.id === id);
  if (!pr) fail(`No existe el pull request #${id}.`);
  return pr;
}

export function mergePullRequest(estado: RepoState, id: number, strategy: MergeStrategy, deleteBranch: boolean): CommandResult {
  return envolver(estado, (s, r) => {
    const hosting = ensureHosting(s);
    const pr = requirePr(hosting, id);
    if (pr.status !== 'open') fail(`El pull request #${id} no está abierto.`);

    const mergeability = computeMergeability(s, pr.source, pr.target);
    if (mergeability.state === 'missing-branch') {
      fail(`No se puede fusionar el pull request #${id}: falta la rama de origen o de destino en origin.`);
    }
    if (mergeability.state === 'conflicts') {
      fail(`No se puede fusionar el pull request #${id}: hay conflictos en ${mergeability.conflicts.join(', ')}.`, 'Resuélvelos localmente, haz push y vuelve a intentarlo.');
    }
    if (strategy === 'rebase' && !mergeability.canRebase) {
      fail(`No se puede rebasar el pull request #${id}: algunos commits generarían conflicto al reaplicarse.`, 'Actualiza tu rama localmente (merge o rebase) y vuelve a hacer push.');
    }

    const sourceHash = s.remote.branches[pr.source]!;
    const targetHash = s.remote.branches[pr.target]!;
    const lane = laneFor(s, pr.target);
    let head: Hash;

    if (strategy === 'merge' || strategy === 'squash') {
      const base = mergeBase(s, sourceHash, targetHash);
      const m = fusionar3(treeOf(s, base), treeOf(s, targetHash), treeOf(s, sourceHash));
      const c =
        strategy === 'merge'
          ? nuevoCommit(s, { msg: `Merge pull request #${id} from ${pr.source}`, parents: [targetHash, sourceHash], tree: m.tree, lane, author: AUTOR, extra: { local: false } })
          : nuevoCommit(s, { msg: `${pr.title} (#${id})`, parents: [targetHash], tree: m.tree, lane, author: AUTOR, extra: { local: false } });
      s.remote.known[c.hash] = 1;
      head = c.hash;
    } else {
      const todo = sourceOnlyCommits(s, sourceHash, targetHash);
      const replay = replayOnto(s, todo, targetHash);
      head = targetHash;
      for (const rc of replay.commits) {
        const n = nuevoCommit(s, { msg: rc.msg, parents: [head], tree: rc.tree, lane, author: rc.author, extra: { local: false, copyOf: rc.hash } });
        s.remote.known[n.hash] = 1;
        head = n.hash;
      }
    }

    s.remote.branches[pr.target] = head;
    const branchDeleted = deleteBranch;
    if (branchDeleted) delete s.remote.branches[pr.source];

    hosting.clock++;
    pr.status = 'merged';
    pr.mergedHash = head;
    pr.timeline.push({ kind: 'merged', strategy, hash: head, at: hosting.clock });
    if (branchDeleted) {
      hosting.clock++;
      pr.timeline.push({ kind: 'branch-deleted', branch: pr.source, at: hosting.clock });
    }
    r.ev('pr-merged', { id, strategy, target: pr.target, hash: head, branchDeleted });
  });
}
