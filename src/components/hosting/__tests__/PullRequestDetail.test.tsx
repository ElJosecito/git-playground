// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PullRequestDetail } from '../PullRequestDetail';
import type { PrView } from '../../../engine/hosting/view';
import type { PullRequest } from '../../../engine/hosting/types';
import type { HostingOutcome } from '../../../app/useGitPlayground';

// New behavior (spec "hosting-web-view" domain, "Pull Request Detail Tabs"
// requirement: "Three tabs ... reflecting live engine data" / "Switch
// between tabs" / "Post a comment (attributed to 'Tú')").
function makePr(overrides: Partial<PullRequest> = {}): PullRequest {
  return { id: 1, title: 'Mi PR', body: '', source: 'feature', target: 'main', status: 'open', timeline: [{ kind: 'opened', at: 1 }], ...overrides };
}

function makeView(overrides: Partial<PrView> = {}): PrView {
  return {
    pr: makePr(),
    commits: [],
    files: [],
    diff: [],
    mergeability: { state: 'clean', conflicts: [], ahead: 1, behind: 0, outdated: false, canRebase: true },
    ...overrides,
  };
}

describe('PullRequestDetail', () => {
  // A11y fix (fresh-context review): navigating here from PR creation (or
  // between PRs, since `HostingView` remounts this component per PR id via
  // `key={prView.pr.id}`) must move focus somewhere meaningful — otherwise
  // a screen-reader user has no cue that the view actually changed.
  it('moves focus to the PR title heading on mount', () => {
    render(
      <PullRequestDetail
        view={makeView({ pr: makePr({ title: 'Arregla el bug' }) })}
        tab="conversation"
        onSetTab={vi.fn()}
        onComment={vi.fn()}
        onClose={vi.fn()}
        onReopen={vi.fn()}
        onMerge={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    const heading = screen.getByText('Arregla el bug');
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('shows the title, status badge, and source→target branch chips', () => {
    render(
      <PullRequestDetail
        view={makeView({ pr: makePr({ title: 'Arregla el bug' }) })}
        tab="conversation"
        onSetTab={vi.fn()}
        onComment={vi.fn()}
        onClose={vi.fn()}
        onReopen={vi.fn()}
        onMerge={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText('Arregla el bug')).toBeInTheDocument();
    expect(screen.getByText('Abierto')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('feature')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  // UX fix: creating a PR must not read as "accepted immediately" — an
  // open PR's detail shows a callout near the merge box making clear it's
  // still open and naming the merge target.
  it('shows an "open, not yet merged" callout near the merge box for an open PR', () => {
    render(
      <PullRequestDetail view={makeView({ pr: makePr({ target: 'main' }) })} tab="conversation" onSetTab={vi.fn()} onComment={vi.fn()} onClose={vi.fn()} onReopen={vi.fn()} onMerge={vi.fn()} onBack={vi.fn()} />,
    );
    expect(screen.getByText(/está abierto/)).toBeInTheDocument();
    expect(screen.getByText(/origin\/main/)).toBeInTheDocument();
  });

  it('does NOT show the "open" callout for a merged PR', () => {
    render(
      <PullRequestDetail
        view={makeView({ pr: makePr({ status: 'merged', target: 'main' }), mergeability: null })}
        tab="conversation"
        onSetTab={vi.fn()}
        onComment={vi.fn()}
        onClose={vi.fn()}
        onReopen={vi.fn()}
        onMerge={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.queryByText(/está abierto/)).not.toBeInTheDocument();
  });

  // UX fix: a merged PR (manual merge, or auto-detected "external" merge)
  // only ever updates origin — the local target branch hasn't moved. This
  // callout explains the `git switch`/`git pull` needed to bring it over.
  it('shows the local-sync guidance callout for a manually-merged PR', () => {
    render(
      <PullRequestDetail
        view={makeView({ pr: makePr({ status: 'merged', target: 'main', timeline: [{ kind: 'merged', strategy: 'merge', hash: 'h1', at: 1 }] }), mergeability: null })}
        tab="conversation"
        onSetTab={vi.fn()}
        onComment={vi.fn()}
        onClose={vi.fn()}
        onReopen={vi.fn()}
        onMerge={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText(/origin\/main/)).toBeInTheDocument();
    expect(screen.getByText(/git switch main/)).toBeInTheDocument();
    expect(screen.getByText(/git pull/)).toBeInTheDocument();
  });

  it('shows the local-sync guidance callout for an externally-merged PR too', () => {
    render(
      <PullRequestDetail
        view={makeView({ pr: makePr({ status: 'merged', target: 'main', timeline: [{ kind: 'merged', strategy: 'external', hash: 'h1', at: 1 }] }), mergeability: null })}
        tab="conversation"
        onSetTab={vi.fn()}
        onComment={vi.fn()}
        onClose={vi.fn()}
        onReopen={vi.fn()}
        onMerge={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText(/git switch main/)).toBeInTheDocument();
  });

  it('shows commits only when the (externally-controlled) tab prop is "commits"', () => {
    const view = makeView({
      commits: [{ hash: 'abc1234', n: 1, msg: 'add feature', parents: [], tree: {}, author: 'Tú <tu@ejemplo.com>', t: 0, lane: 0, x: 0, local: true }],
    });
    const { rerender } = render(
      <PullRequestDetail view={view} tab="conversation" onSetTab={vi.fn()} onComment={vi.fn()} onClose={vi.fn()} onReopen={vi.fn()} onMerge={vi.fn()} onBack={vi.fn()} />,
    );
    expect(screen.queryByText('add feature')).not.toBeInTheDocument();

    rerender(<PullRequestDetail view={view} tab="commits" onSetTab={vi.fn()} onComment={vi.fn()} onClose={vi.fn()} onReopen={vi.fn()} onMerge={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('add feature')).toBeInTheDocument();
  });

  it('calls onSetTab with the clicked tab key', async () => {
    const onSetTab = vi.fn();
    const user = userEvent.setup();
    render(
      <PullRequestDetail view={makeView()} tab="conversation" onSetTab={onSetTab} onComment={vi.fn()} onClose={vi.fn()} onReopen={vi.fn()} onMerge={vi.fn()} onBack={vi.fn()} />,
    );
    await user.click(screen.getByRole('tab', { name: 'Cambios' }));
    expect(onSetTab).toHaveBeenCalledWith('changes');
  });

  it('posts a comment attributed to "Tú" via onComment, clearing the textarea on success', async () => {
    const onComment = vi.fn((): HostingOutcome => ({ ok: true }));
    const user = userEvent.setup();
    render(
      <PullRequestDetail view={makeView()} tab="conversation" onSetTab={vi.fn()} onComment={onComment} onClose={vi.fn()} onReopen={vi.fn()} onMerge={vi.fn()} onBack={vi.fn()} />,
    );
    await user.type(screen.getByLabelText('Comentario'), 'Esto se ve bien');
    await user.click(screen.getByText('Comentar'));
    expect(onComment).toHaveBeenCalledWith(1, 'Esto se ve bien');
    expect(screen.getByLabelText('Comentario')).toHaveValue('');
  });

  it('shows "Tú" as the author of existing comments in the conversation timeline', () => {
    render(
      <PullRequestDetail
        view={makeView({ pr: makePr({ timeline: [{ kind: 'opened', at: 1 }, { kind: 'comment', author: 'Tú', body: 'Un comentario', at: 2 }] }) })}
        tab="conversation"
        onSetTab={vi.fn()}
        onComment={vi.fn()}
        onClose={vi.fn()}
        onReopen={vi.fn()}
        onMerge={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText('Tú')).toBeInTheDocument();
    expect(screen.getByText('Un comentario')).toBeInTheDocument();
  });

  it('calls onClose with the PR id when "Cerrar pull request" is clicked (open PR only)', async () => {
    const onClose = vi.fn((): HostingOutcome => ({ ok: true }));
    const user = userEvent.setup();
    render(
      <PullRequestDetail view={makeView()} tab="conversation" onSetTab={vi.fn()} onComment={vi.fn()} onClose={onClose} onReopen={vi.fn()} onMerge={vi.fn()} onBack={vi.fn()} />,
    );
    await user.click(screen.getByText('Cerrar pull request'));
    expect(onClose).toHaveBeenCalledWith(1);
  });

  it('shows "Reabrir pull request" for a manually-closed PR, but hides it when auto-closed by source deletion', () => {
    const { rerender } = render(
      <PullRequestDetail
        view={makeView({ pr: makePr({ status: 'closed', closeReason: 'manual' }), mergeability: null })}
        tab="conversation"
        onSetTab={vi.fn()}
        onComment={vi.fn()}
        onClose={vi.fn()}
        onReopen={vi.fn()}
        onMerge={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText('Reabrir pull request')).toBeInTheDocument();

    rerender(
      <PullRequestDetail
        view={makeView({ pr: makePr({ status: 'closed', closeReason: 'source-deleted' }), mergeability: null })}
        tab="conversation"
        onSetTab={vi.fn()}
        onComment={vi.fn()}
        onClose={vi.fn()}
        onReopen={vi.fn()}
        onMerge={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.queryByText('Reabrir pull request')).not.toBeInTheDocument();
  });

  it('calls onBack when "Volver a la lista" is clicked', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(
      <PullRequestDetail view={makeView()} tab="conversation" onSetTab={vi.fn()} onComment={vi.fn()} onClose={vi.fn()} onReopen={vi.fn()} onMerge={vi.fn()} onBack={onBack} />,
    );
    await user.click(screen.getByText('← Volver a la lista'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders the merge box for an open, clean PR, and hides it for a merged PR', () => {
    const { rerender } = render(
      <PullRequestDetail view={makeView()} tab="conversation" onSetTab={vi.fn()} onComment={vi.fn()} onClose={vi.fn()} onReopen={vi.fn()} onMerge={vi.fn()} onBack={vi.fn()} />,
    );
    expect(screen.getByText('Fusionar pull request')).toBeInTheDocument();

    rerender(
      <PullRequestDetail
        view={makeView({ pr: makePr({ status: 'merged' }), mergeability: null })}
        tab="conversation"
        onSetTab={vi.fn()}
        onComment={vi.fn()}
        onClose={vi.fn()}
        onReopen={vi.fn()}
        onMerge={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.queryByText('Fusionar pull request')).not.toBeInTheDocument();
  });

  it('shows file markers and diff lines on the Cambios tab', () => {
    render(
      <PullRequestDetail
        view={makeView({ files: [{ f: 'f.txt', t: '~' }], diff: ['\x01bold\x02diff --git a/f.txt b/f.txt\x03'] })}
        tab="changes"
        onSetTab={vi.fn()}
        onComment={vi.fn()}
        onClose={vi.fn()}
        onReopen={vi.fn()}
        onMerge={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText('f.txt')).toBeInTheDocument();
    expect(screen.getByText('diff --git a/f.txt b/f.txt')).toBeInTheDocument();
  });
});
