// Facade aggregating every hosting session function/selector, mirroring the
// `commands/index.ts` pattern. `engine/index.ts` imports from here (not from
// the individual hosting modules) to expose the simulated-hosting API on
// `GitEngineApi`.
export { createPullRequest } from './create';
export { commentPullRequest, closePullRequest, reopenPullRequest } from './lifecycle';
export { mergePullRequest } from './merge';
export { listPullRequests, prView } from './view';
export type { PrView } from './view';
export type { CloseReason, Comment, HostingState, MergeStrategy, Mergeability, PrStatus, PullRequest, TimelineItem } from './types';
