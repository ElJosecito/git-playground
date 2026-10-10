// Derived read selectors over hosting state — new behavior (no oracle
// equivalent). Commits/files/diff are always computed from the live
// `s.remote.branches`, never cached on the PR record (design.md "Live
// Commit and Diff Tracking").
import { keys } from '../util';
import { anc, treeOf, mergeBase } from '../refs';
import { diffArboles } from '../diff';
import { computeMergeability } from './mergeability';
import { hostingOf } from './state';
import type { Commit, RepoState, Tree } from '../types';
import type { Mergeability, PullRequest } from './types';

export function listPullRequests(s: RepoState): PullRequest[] {
  return hostingOf(s).prs;
}

export interface PrView {
  pr: PullRequest;
  commits: Commit[];
  files: { f: string; t: '+' | '−' | '~' }[];
  diff: string[];
  mergeability: Mergeability | null;
}

function changedFiles(base: Tree, head: Tree): { f: string; t: '+' | '−' | '~' }[] {
  return keys(base, head)
    .filter((f) => base[f] !== head[f])
    .map((f) => ({ f, t: base[f] === undefined ? '+' : head[f] === undefined ? '−' : '~' }) as { f: string; t: '+' | '−' | '~' });
}

export function prView(s: RepoState, id: number): PrView | null {
  const pr = hostingOf(s).prs.find((p) => p.id === id);
  if (!pr) return null;
  const sourceHash = s.remote.branches[pr.source] ?? null;
  const targetHash = s.remote.branches[pr.target] ?? null;
  const base = sourceHash && targetHash ? mergeBase(s, sourceHash, targetHash) : null;
  const sourceAnc = sourceHash ? anc(s, sourceHash) : {};
  const baseAnc = base ? anc(s, base) : {};
  const commits = sourceHash ? s.order.filter((h) => sourceAnc[h] && !baseAnc[h]).map((h) => s.commits[h]!) : [];
  const baseTree = treeOf(s, base);
  const sourceTree = treeOf(s, sourceHash);
  return {
    pr,
    commits,
    files: sourceHash ? changedFiles(baseTree, sourceTree) : [],
    diff: sourceHash ? diffArboles(baseTree, sourceTree) : [],
    mergeability: pr.status === 'open' ? computeMergeability(s, pr.source, pr.target) : null,
  };
}
