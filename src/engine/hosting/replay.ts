// Pure replay of "source-only" commits onto a new base — the simulated
// hosting layer's server-side analog of `git rebase`. New behavior (no
// oracle equivalent), but reuses the oracle's own `fusionar3` 3-way merge
// and the same todo filter as `procesarRebase` (commands/integrate.ts):
// `O && !U && parents.length < 2` (design.md "Rebase strategy"). Unlike
// `procesarRebase`, this never mutates `HEAD`/`files`/`index` — it is a
// pure dry run, used both to execute the rebase merge strategy and to
// probe `canRebase` for mergeability (design's "same loop... plus a dry-run
// mode").
import { fusionar3 } from '../diff';
import { treeOf, anc } from '../refs';
import { same } from '../util';
import type { Hash, RepoState, Tree } from '../types';

export interface ReplayCommit {
  hash: Hash;
  msg: string;
  author: string;
  tree: Tree;
}

export interface ReplayResult {
  ok: boolean;
  commits: ReplayCommit[];
  conflictAt: Hash | null;
}

/** Source-only commits: reachable from `source`, not from `target`, excluding merge commits. */
export function sourceOnlyCommits(s: RepoState, source: Hash, target: Hash): Hash[] {
  const O = anc(s, source);
  const U = anc(s, target);
  return s.order.filter((h) => O[h] && !U[h] && s.commits[h]!.parents.length < 2);
}

/**
 * Replays `todo` (oldest first) onto `onto`'s tree, one commit at a time via
 * `fusionar3`, skipping any commit whose resulting tree is unchanged (same
 * "already applied" skip as `procesarRebase`). Stops at the first conflict.
 */
export function replayOnto(s: RepoState, todo: Hash[], onto: Hash): ReplayResult {
  const commits: ReplayCommit[] = [];
  let cur = treeOf(s, onto);
  for (const h of todo) {
    const c = s.commits[h]!;
    const m = fusionar3(treeOf(s, c.parents[0] ?? null), cur, c.tree);
    if (m.conf.length) return { ok: false, commits, conflictAt: h };
    if (same(m.tree, cur)) continue;
    commits.push({ hash: h, msg: c.msg, author: c.author, tree: m.tree });
    cur = m.tree;
  }
  return { ok: true, commits, conflictAt: null };
}
