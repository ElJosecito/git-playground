// Pure display selectors for the simulated GitHub-style hosting web view
// (design.md "File Changes" table: `src/ui/hostingSelectors.ts` — "URL bar
// text, badges, guidance commands"). New behavior, no oracle equivalent —
// see spec's `hosting-web-view` domain for the source of truth. The route
// shape is owned here (not in `useHostingView`, which only holds the
// mutable state) so both the app-level hook and the presentational
// components depend on the same, lower-level `ui/` module (matching the
// existing `app -> ui` dependency direction, e.g. `useGitPlayground`
// importing `ui/markup`).
import type { Mergeability, MergeStrategy, PrStatus, PullRequest, TimelineItem } from '../engine/hosting/types';

export type HostingTab = 'conversation' | 'commits' | 'changes';

export type HostingRoute = { kind: 'list' } | { kind: 'new' } | { kind: 'pr'; id: number; tab: HostingTab };

const BASE_URL = 'github.com/tu/proyecto/pulls';

/** The fake browser chrome's URL bar text for the current route, mirroring
 * design's quoted pattern `github.com/tu/proyecto/pulls[/N[/commits|/files]]`. */
export function urlBarText(route: HostingRoute): string {
  switch (route.kind) {
    case 'list':
      return BASE_URL;
    case 'new':
      return `${BASE_URL}/new`;
    case 'pr': {
      const suffix = route.tab === 'commits' ? '/commits' : route.tab === 'changes' ? '/files' : '';
      return `${BASE_URL}/${route.id}${suffix}`;
    }
  }
}

export interface StatusBadge {
  text: string;
  color: string;
  bg: string;
}

const STATUS_BADGE: Record<PrStatus, StatusBadge> = {
  open: { text: 'Abierto', color: 'var(--success)', bg: 'rgba(74,222,128,0.14)' },
  closed: { text: 'Cerrado', color: 'var(--danger)', bg: 'rgba(248,113,113,0.14)' },
  merged: { text: 'Fusionado', color: 'var(--t-cyan)', bg: 'rgba(103,232,249,0.14)' },
};

export function statusBadge(status: PrStatus): StatusBadge {
  return STATUS_BADGE[status];
}

export interface PrListItem {
  id: number;
  title: string;
  subtitle: string;
  badge: StatusBadge;
}

/** Newest PR first (descending id), same ordering GitHub's own PR list uses. */
export function prListItems(prs: PullRequest[]): PrListItem[] {
  return [...prs]
    .sort((a, b) => b.id - a.id)
    .map((pr) => ({
      id: pr.id,
      title: pr.title,
      subtitle: `#${pr.id} · ${pr.source} → ${pr.target}`,
      badge: statusBadge(pr.status),
    }));
}

/** Guidance shown in the creation form when origin has no branches at all to
 * compare — same push-hint wording the engine's own `createPr` rejection
 * uses (design's "Create rules"). */
export function noOriginBranchesHint(): string {
  return 'Todavía no hay ramas en origin. Sube una con git push -u origin <rama>.';
}

// --- PR detail / merge-box copy (Phase 4) ---------------------------------
// Pure Spanish copy for `PullRequestDetail`/`MergeBox`/`ConversationTab`
// (design "File Changes": these components read live engine data via
// `prView`/`mergeability`, but the WORDING lives here, same convention as
// the rest of this module, so it stays unit-testable without rendering
// React and consistent across components).

const STRATEGY_LABEL: Record<MergeStrategy, string> = {
  merge: 'Crear merge commit',
  squash: 'Squash and merge',
  rebase: 'Rebase and merge',
};

/** The 3 merge-box option labels (design "Merge Box": "strategy selector"). */
export function strategyLabel(strategy: MergeStrategy): string {
  return STRATEGY_LABEL[strategy];
}

/** One line of Spanish prose per timeline item, for `ConversationTab`.
 * `comment` items carry their own body/author and are rendered separately
 * by the caller (not through this selector). */
export function timelineText(item: TimelineItem, pr: PullRequest): string {
  switch (item.kind) {
    case 'opened':
      return 'Abrió este pull request.';
    case 'reopened':
      return 'Reabrió este pull request.';
    case 'comment':
      return item.body;
    case 'closed':
      if (item.reason === 'manual') return 'Cerró este pull request.';
      return `El pull request se cerró: la rama ${item.reason === 'source-deleted' ? pr.source : pr.target} ya no existe en origin.`;
    case 'merged':
      if (item.strategy === 'external') {
        return `Ya está fusionado: los cambios llegaron a origin/${pr.target} por otro camino.`;
      }
      return `Se fusionó con la estrategia "${strategyLabel(item.strategy)}".`;
    case 'branch-deleted':
      return `Se eliminó la rama ${item.branch}.`;
  }
}

/** Blocking explanation for the merge box when `mergeability.state` is
 * `conflicts` or `missing-branch` (spec "Merge Box": "disabled/hidden
 * entirely"), with local-fix instructions matching `mergePullRequest`'s own
 * rejection wording (design's "Server Merge Mechanics" / `hosting/merge.ts`). */
export function mergeBlockedExplanation(mergeability: Mergeability): string {
  if (mergeability.state === 'conflicts') {
    return `No se puede fusionar: hay conflictos en ${mergeability.conflicts.join(', ')}. Resuélvelos localmente, haz push y vuelve a intentarlo.`;
  }
  return 'No se puede fusionar: falta la rama de origen o de destino en origin.';
}

/** Non-blocking warning shown above a usable merge box when `outdated` is
 * true (spec "Outdated PR still shows a usable merge box"). */
export function mergeOutdatedWarning(target: string): string {
  return `${target} avanzó desde que se creó este pull request. Puedes fusionar igual, o actualizar tu rama local (merge o rebase) y volver a hacer push.`;
}

/** Explanation shown next to the merge box's "Rebase and merge" option when
 * `canRebase` is false while the base merge is otherwise `clean` (spec
 * "Rebase option disabled on rebase-only conflict"). */
export function rebaseDisabledHint(): string {
  return 'No se puede rebasar: algunos commits generarían conflicto al reaplicarse. Actualiza tu rama localmente (merge o rebase) y vuelve a hacer push.';
}

/** Gates the "Reabrir pull request" button: a PR auto-closed because its
 * source branch was deleted must not reopen until that branch exists again
 * (spec "Reopen blocked after source deletion" / design's "Close and
 * Reopen" decision — `reopenPullRequest` enforces the same rule engine-side;
 * this mirrors it so the button doesn't invite a guaranteed-to-fail click). */
export function canReopen(pr: PullRequest): boolean {
  return pr.status === 'closed' && pr.closeReason !== 'source-deleted';
}
