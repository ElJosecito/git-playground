import { describe, it, expect } from 'vitest';
import {
  canReopen,
  mergeBlockedExplanation,
  mergeOutdatedWarning,
  noOriginBranchesHint,
  prListItems,
  rebaseDisabledHint,
  statusBadge,
  strategyLabel,
  timelineText,
  urlBarText,
} from '../hostingSelectors';
import type { Mergeability, PullRequest } from '../../engine/hosting/types';

// New behavior (hosting-web-view domain, spec "View Toggle"/"Pull Request
// List" requirements): pure display selectors for the simulated GitHub-style
// web view — URL bar text per route, per-status badges, and the PR list's
// view model. No oracle equivalent to port from.
describe('urlBarText', () => {
  it('renders the bare pulls URL for the list route', () => {
    expect(urlBarText({ kind: 'list' })).toBe('github.com/tu/proyecto/pulls');
  });

  it('renders the /new suffix for the new-PR route', () => {
    expect(urlBarText({ kind: 'new' })).toBe('github.com/tu/proyecto/pulls/new');
  });

  it('renders the PR id with no suffix for the conversation tab', () => {
    expect(urlBarText({ kind: 'pr', id: 7, tab: 'conversation' })).toBe('github.com/tu/proyecto/pulls/7');
  });

  it('renders the /commits suffix for the commits tab', () => {
    expect(urlBarText({ kind: 'pr', id: 7, tab: 'commits' })).toBe('github.com/tu/proyecto/pulls/7/commits');
  });

  it('renders the /files suffix for the changes tab', () => {
    expect(urlBarText({ kind: 'pr', id: 3, tab: 'changes' })).toBe('github.com/tu/proyecto/pulls/3/files');
  });
});

describe('statusBadge', () => {
  it('returns distinct Spanish text for open/closed/merged', () => {
    expect(statusBadge('open').text).toBe('Abierto');
    expect(statusBadge('closed').text).toBe('Cerrado');
    expect(statusBadge('merged').text).toBe('Fusionado');
  });

  it('gives each status a different color token', () => {
    const colors = new Set([statusBadge('open').color, statusBadge('closed').color, statusBadge('merged').color]);
    expect(colors.size).toBe(3);
  });
});

function makePr(overrides: Partial<PullRequest> = {}): PullRequest {
  return { id: 1, title: 'Mi PR', body: '', source: 'feature', target: 'main', status: 'open', timeline: [], ...overrides };
}

describe('prListItems', () => {
  it('maps each PR to a subtitle with its id and branches, and sorts newest id first', () => {
    const prs = [makePr({ id: 1, title: 'Primero' }), makePr({ id: 2, title: 'Segundo', source: 'fix', target: 'main' })];
    const items = prListItems(prs);
    expect(items.map((i) => i.id)).toEqual([2, 1]);
    expect(items[0]!.subtitle).toBe('#2 · fix → main');
    expect(items[0]!.title).toBe('Segundo');
  });

  it('returns an empty array for an empty PR list (no mutation of the real logic path)', () => {
    expect(prListItems([])).toEqual([]);
  });

  it('attaches the matching status badge to each item', () => {
    const items = prListItems([makePr({ id: 5, status: 'merged' })]);
    expect(items[0]!.badge).toEqual(statusBadge('merged'));
  });
});

describe('noOriginBranchesHint', () => {
  it('returns the push-hint guidance text in Spanish', () => {
    expect(noOriginBranchesHint()).toContain('git push -u origin');
  });
});

// New behavior (Phase 4, spec "Merge Box" requirement): pure copy selectors
// for PR-detail's merge box and conversation timeline, kept here (not
// hardcoded in components) so the Spanish wording stays consistent and unit
// testable without rendering React.
describe('strategyLabel', () => {
  it('returns the 3 strategy labels used by the merge-box selector', () => {
    expect(strategyLabel('merge')).toBe('Crear merge commit');
    expect(strategyLabel('squash')).toBe('Squash and merge');
    expect(strategyLabel('rebase')).toBe('Rebase and merge');
  });
});

describe('timelineText', () => {
  function makePr(overrides: Partial<PullRequest> = {}): PullRequest {
    return { id: 1, title: 'Mi PR', body: '', source: 'feature', target: 'main', status: 'open', timeline: [], ...overrides };
  }

  it('describes opened/reopened items', () => {
    expect(timelineText({ kind: 'opened', at: 1 }, makePr())).toContain('Abrió');
    expect(timelineText({ kind: 'reopened', at: 1 }, makePr())).toContain('Reabrió');
  });

  it('describes a manual close', () => {
    expect(timelineText({ kind: 'closed', reason: 'manual', at: 1 }, makePr())).toBe('Cerró este pull request.');
  });

  it('names the deleted source branch for an auto-close', () => {
    const text = timelineText({ kind: 'closed', reason: 'source-deleted', at: 1 }, makePr({ source: 'feature' }));
    expect(text).toContain('feature');
    expect(text).toContain('ya no existe en origin');
  });

  it('names the deleted target branch for a target-deleted auto-close', () => {
    const text = timelineText({ kind: 'closed', reason: 'target-deleted', at: 1 }, makePr({ target: 'main' }));
    expect(text).toContain('main');
  });

  it('describes an external (already-merged) transition', () => {
    const text = timelineText({ kind: 'merged', strategy: 'external', hash: null, at: 1 }, makePr({ target: 'main' }));
    expect(text).toContain('origin/main');
  });

  it('names the merge strategy for a user-triggered merge', () => {
    const text = timelineText({ kind: 'merged', strategy: 'squash', hash: 'h1', at: 1 }, makePr());
    expect(text).toContain(strategyLabel('squash'));
  });

  it('names the deleted branch for a branch-deleted item', () => {
    expect(timelineText({ kind: 'branch-deleted', branch: 'feature', at: 1 }, makePr())).toContain('feature');
  });
});

describe('mergeBlockedExplanation', () => {
  it('lists conflicting files with local-fix instructions', () => {
    const m: Mergeability = { state: 'conflicts', conflicts: ['a.txt', 'b.txt'], ahead: 1, behind: 0, outdated: false, canRebase: false };
    const text = mergeBlockedExplanation(m);
    expect(text).toContain('a.txt');
    expect(text).toContain('b.txt');
    expect(text).toContain('Resuélvelos localmente');
  });

  it('explains a missing branch without listing conflict files', () => {
    const m: Mergeability = { state: 'missing-branch', conflicts: [], ahead: 0, behind: 0, outdated: false, canRebase: false };
    expect(mergeBlockedExplanation(m)).toContain('falta la rama');
  });
});

describe('mergeOutdatedWarning', () => {
  it('names the target branch and offers a non-blocking fix', () => {
    const text = mergeOutdatedWarning('main');
    expect(text).toContain('main');
    expect(text.toLowerCase()).toContain('puedes fusionar igual');
  });
});

describe('rebaseDisabledHint', () => {
  it('explains the rebase-only conflict with a local fix', () => {
    expect(rebaseDisabledHint()).toContain('rebas');
  });
});

describe('canReopen', () => {
  function makePr(overrides: Partial<PullRequest> = {}): PullRequest {
    return { id: 1, title: 'Mi PR', body: '', source: 'feature', target: 'main', status: 'closed', timeline: [], ...overrides };
  }

  it('allows reopening a manually closed PR', () => {
    expect(canReopen(makePr({ closeReason: 'manual' }))).toBe(true);
  });

  it('blocks reopening a PR auto-closed because its source branch was deleted', () => {
    expect(canReopen(makePr({ closeReason: 'source-deleted' }))).toBe(false);
  });

  it('returns false for an open or merged PR (reopen only applies to closed PRs)', () => {
    expect(canReopen(makePr({ status: 'open', closeReason: undefined }))).toBe(false);
    expect(canReopen(makePr({ status: 'merged', closeReason: undefined }))).toBe(false);
  });
});
