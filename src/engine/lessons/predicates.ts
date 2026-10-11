// Pure checklist predicates (level-engine spec "Pure Checklist Predicates":
// "no engine mutation") — building blocks for a `LevelDef`'s `Goal.check`
// functions. Built on top of the existing `refs`/`files`/`hosting` read
// selectors; none of them touch the simulator engine itself. HARD
// CONSTRAINT: never read a commit's `t` field — `t` is `Date.now()` by
// default (design.md: "Commit t is Date.now(), so predicates must never
// read t.") and therefore non-deterministic across setup replays.
import { curName, isAnc, anc } from '../refs';
import { headHash } from '../state';
import { treeOf } from '../refs';
import { estadoArchivos } from '../files';
import { hostingOf } from '../hosting/state';
import type { Hash, RepoState } from '../types';
import type { PrStatus, PullRequest } from '../hosting/types';

function tipOf(s: RepoState, branch?: string): Hash | null {
  return branch === undefined ? headHash(s) : (s.branches[branch] ?? null);
}

export function currentBranch(s: RepoState): string | null {
  return curName(s);
}

export function isDetached(s: RepoState): boolean {
  return s.head.type === 'detached';
}

export function branchExists(s: RepoState, name: string): boolean {
  return name in s.branches;
}

export function branchAt(s: RepoState, name: string): Hash | null {
  return s.branches[name] ?? null;
}

/** Number of commits reachable from `branch`'s tip (or HEAD when omitted),
 * inclusive. 0 for an unknown branch or no commits yet. */
export function commitCount(s: RepoState, branch?: string): number {
  const h = tipOf(s, branch);
  return h ? Object.keys(anc(s, h)).length : 0;
}

/** The commit message at `branch`'s tip (or HEAD when omitted), or `null`
 * when there is no such tip yet. */
export function headMessage(s: RepoState, branch?: string): string | null {
  const h = tipOf(s, branch);
  return h ? s.commits[h]!.msg : null;
}

/** True once `file` is present in HEAD's committed tree (i.e. it survived a
 * commit) — being staged alone is NOT enough. */
export function fileTracked(s: RepoState, file: string): boolean {
  return file in treeOf(s, headHash(s));
}

/** True while the index differs from HEAD for `file` (there is a staged
 * change for it, whether new, modified, or removed). */
export function fileStaged(s: RepoState, file: string): boolean {
  return s.index[file] !== treeOf(s, headHash(s))[file];
}

/** The working-tree content of `file`, or `undefined` when it doesn't
 * exist in the working tree. */
export function fileContent(s: RepoState, file: string): string | undefined {
  return s.files[file];
}

/** True when there are no staged, unstaged, or conflicted changes. */
export function workingClean(s: RepoState): boolean {
  const { st, un, conf } = estadoArchivos(s);
  return st.length === 0 && un.length === 0 && conf.length === 0;
}

export function hasConflict(s: RepoState): boolean {
  return !!s.op && 'conflicts' in s.op && s.op.conflicts.length > 0;
}

export function opInProgress(s: RepoState): boolean {
  return s.op !== null;
}

/** True once `source`'s tip is an ancestor of `target`'s tip (i.e. `source`
 * has been fully merged into `target`). False when either branch is
 * missing. */
export function isMerged(s: RepoState, target: string, source: string): boolean {
  const sourceHash = s.branches[source];
  const targetHash = s.branches[target];
  if (!sourceHash || !targetHash) return false;
  return isAnc(s, sourceHash, targetHash);
}

/** True when no ancestor commit of `branch`'s tip (or HEAD when omitted)
 * has more than one parent — i.e. there is no merge commit anywhere in its
 * history. */
export function isLinear(s: RepoState, branch?: string): boolean {
  const h = tipOf(s, branch);
  if (!h) return true;
  return Object.keys(anc(s, h)).every((x) => s.commits[x]!.parents.length <= 1);
}

export function tagAt(s: RepoState, name: string): Hash | null {
  return s.tags[name] ?? null;
}

export function stashCount(s: RepoState): number {
  return s.stash.length;
}

export function remoteHasBranch(s: RepoState, name: string): boolean {
  return name in s.remote.branches;
}

/** True once `branch`'s local tip is exactly what origin has for it (fully
 * pushed, nothing left to send). */
export function isPushed(s: RepoState, branch: string): boolean {
  const local = s.branches[branch];
  return !!local && s.remote.branches[branch] === local;
}

export function upstreamOf(s: RepoState, branch: string): string | null {
  return s.upstream[branch] ?? null;
}

/** Finds a pull request by `source`/`target`, optionally filtered by
 * `status`. Returns `null` when none matches. */
export function prWith(s: RepoState, source: string, target: string, status?: PrStatus): PullRequest | null {
  const match = hostingOf(s).prs.find((pr) => pr.source === source && pr.target === target && (status === undefined || pr.status === status));
  return match ?? null;
}

// --- Extensions added for the Phase 7 curriculum (tasks.md 7.1-7.12). Each
// one is a small, generically-reusable, pure selector in the same style as
// the 19 above — no engine mutation, no reading `t`. ---

/** True when `branch`'s tip (or HEAD when omitted) is a merge commit (>=2
 * parents) — distinguishes a real 3-way/--no-ff merge from a fast-forward,
 * which leaves no merge commit at all. */
export function isMergeCommit(s: RepoState, branch?: string): boolean {
  const h = tipOf(s, branch);
  if (!h) return false;
  return s.commits[h]!.parents.length >= 2;
}

/** `origin`'s hash for `name`, or `null` when origin doesn't have that
 * branch (mirrors `branchAt`, but reads `s.remote.branches` instead of
 * `s.branches`). */
export function remoteBranchAt(s: RepoState, name: string): Hash | null {
  return s.remote.branches[name] ?? null;
}

/** True once `origin`'s tip for `branch` is an ancestor of the LOCAL tip for
 * that same branch — i.e. the local branch is at least as up to date as
 * what was last pushed (the shape `git pull --rebase`/`git pull` leave
 * things in). False when either side is missing. */
export function remoteIsAncestorOfLocal(s: RepoState, branch: string): boolean {
  const remoteHash = s.remote.branches[branch];
  const localHash = s.branches[branch];
  if (!remoteHash || !localHash) return false;
  return isAnc(s, remoteHash, localHash);
}

/** True once the session's `reflog` shows a checkout that landed on
 * `name` at some point (`checkout: moving to <name>` or `checkout: moving
 * from X to <name>`) — lets a level require that the player actually
 * visited a branch, not just that they ended up somewhere consistent with
 * never having moved at all. */
export function visitedBranch(s: RepoState, name: string): boolean {
  return s.reflog.some((e) => e.msg.includes(`to ${name}`));
}

/** Number of `comment` timeline entries on the pull request matching
 * `source`/`target` (0 when there's no such PR yet). */
export function prCommentCount(s: RepoState, source: string, target: string): number {
  const pr = prWith(s, source, target);
  if (!pr) return 0;
  return pr.timeline.filter((t) => t.kind === 'comment').length;
}
