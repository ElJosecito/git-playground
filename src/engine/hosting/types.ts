// Pull-request domain types for the simulated hosting layer. This is new
// behavior (no oracle to port from) — see design.md "Interfaces /
// Contracts" for the source of truth. Kept in its own module per design's
// file layout; `engine/types.ts` imports the pieces it needs onto
// `RepoState`/`GitEvent` (design D-"Field shape": optional, lazily created).
import type { Hash } from '../types';

export type PrStatus = 'open' | 'closed' | 'merged';
export type MergeStrategy = 'merge' | 'squash' | 'rebase';
export type CloseReason = 'manual' | 'source-deleted' | 'target-deleted';

export interface Comment {
  author: 'Tú';
  body: string;
  at: number;
}

export type TimelineItem =
  | { kind: 'opened' | 'reopened'; at: number }
  | ({ kind: 'comment' } & Comment)
  | { kind: 'closed'; reason: CloseReason; at: number }
  | { kind: 'merged'; strategy: MergeStrategy | 'external'; hash: Hash | null; at: number }
  | { kind: 'branch-deleted'; branch: string; at: number };

export interface PullRequest {
  id: number;
  title: string;
  body: string;
  source: string;
  target: string;
  status: PrStatus;
  closeReason?: CloseReason;
  mergedHash?: Hash | null;
  timeline: TimelineItem[];
}

/** `RepoState.hosting` — optional, absent until the first PR write (see `hosting/state.ts`). */
export interface HostingState {
  prs: PullRequest[];
  nextId: number;
  clock: number;
}

/** Derived, never persisted — see `hosting/mergeability.ts`. */
export interface Mergeability {
  state: 'clean' | 'conflicts' | 'missing-branch';
  conflicts: string[];
  ahead: number;
  behind: number;
  outdated: boolean;
  canRebase: boolean;
}
