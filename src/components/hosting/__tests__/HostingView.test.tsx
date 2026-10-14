// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HostingView } from '../HostingView';
import type { PullRequest } from '../../../engine/hosting/types';
import type { CreatePrOutcome } from '../../../app/useGitPlayground';

// New behavior (spec "hosting-web-view" domain, "View Toggle" requirement).
// Fake browser chrome (URL bar reflecting the route) wrapping the list/new
// panes — this phase doesn't build PR detail yet (tasks.md Phase 4).
function makePr(overrides: Partial<PullRequest> = {}): PullRequest {
  return { id: 1, title: 'Mi PR', body: '', source: 'feature', target: 'main', status: 'open', timeline: [], ...overrides };
}

function baseProps() {
  return {
    onClose: vi.fn(),
    onGoToList: vi.fn(),
    onGoToNew: vi.fn(),
    onGoToPr: vi.fn(),
    onSetTab: vi.fn(),
    onCreate: vi.fn(),
    onCommentPr: vi.fn(),
    onClosePr: vi.fn(),
    onReopenPr: vi.fn(),
    onMergePr: vi.fn(),
  };
}

describe('HostingView', () => {
  it('shows the list URL and the PR list when on the list route', () => {
    render(<HostingView route={{ kind: 'list' }} prs={[makePr()]} originBranches={['main']} prView={null} {...baseProps()} />);
    expect(screen.getByText('github.com/tu/proyecto/pulls')).toBeInTheDocument();
    expect(screen.getByText('Mi PR')).toBeInTheDocument();
  });

  it('shows the /new URL and the creation form when on the new route', () => {
    render(<HostingView route={{ kind: 'new' }} prs={[]} originBranches={['main']} prView={null} {...baseProps()} />);
    expect(screen.getByText('github.com/tu/proyecto/pulls/new')).toBeInTheDocument();
    expect(screen.getByText('Nuevo pull request')).toBeInTheDocument();
    expect(screen.getByLabelText('Comparar')).toBeInTheDocument();
  });

  it('navigates from the list to the new-PR form via "Nuevo pull request"', async () => {
    const onGoToNew = vi.fn();
    const user = userEvent.setup();
    render(<HostingView route={{ kind: 'list' }} prs={[]} originBranches={['main']} prView={null} {...baseProps()} onGoToNew={onGoToNew} />);
    await user.click(screen.getByText('Nuevo pull request'));
    expect(onGoToNew).toHaveBeenCalledTimes(1);
  });

  it('calls onClose (returns to the graph) when the close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<HostingView route={{ kind: 'list' }} prs={[]} originBranches={['main']} prView={null} {...baseProps()} onClose={onClose} />);
    await user.click(screen.getByLabelText('Volver al repositorio'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // UX fix: creating a PR must land the user on ITS detail (not back on the
  // list), so it reads as "open, not yet merged" instead of "accepted
  // immediately".
  it('wires onCreate through to the creation form and navigates to the new PR\'s detail (not the list) on success', async () => {
    const onCreate = vi.fn((): CreatePrOutcome => ({ ok: true, id: 9 }));
    const onGoToPr = vi.fn();
    const user = userEvent.setup();
    render(
      <HostingView route={{ kind: 'new' }} prs={[]} originBranches={['main', 'feature']} prView={null} {...baseProps()} onCreate={onCreate} onGoToPr={onGoToPr} />,
    );
    await user.type(screen.getByLabelText('Título'), 'Mi cambio');
    await user.click(screen.getByText('Crear pull request'));
    expect(onCreate).toHaveBeenCalledWith({ source: 'feature', target: 'main', title: 'Mi cambio', body: '' });
    expect(onGoToPr).toHaveBeenCalledWith(9);
  });

  // New behavior (Phase 4): the list's rows are clickable, navigating to the
  // PR detail route via `onGoToPr`.
  it('wires row clicks in the list through to onGoToPr', async () => {
    const onGoToPr = vi.fn();
    const user = userEvent.setup();
    render(<HostingView route={{ kind: 'list' }} prs={[makePr({ id: 3 })]} originBranches={['main']} prView={null} {...baseProps()} onGoToPr={onGoToPr} />);
    await user.click(screen.getByText('Mi PR'));
    expect(onGoToPr).toHaveBeenCalledWith(3);
  });

  // New behavior (Phase 4, design "View state": "An unknown PR id falls
  // back to the list"): the `pr` route with no matching `prView` renders the
  // list instead of a blank pane.
  it('renders the detail when on a `pr` route with a matching prView', () => {
    const view = {
      pr: makePr({ id: 5, title: 'Mi PR detalle' }),
      commits: [],
      files: [],
      diff: [],
      mergeability: { state: 'clean' as const, conflicts: [], ahead: 1, behind: 0, outdated: false, canRebase: true },
    };
    render(<HostingView route={{ kind: 'pr', id: 5, tab: 'conversation' }} prs={[]} originBranches={['main']} prView={view} {...baseProps()} />);
    expect(screen.getByText('Mi PR detalle')).toBeInTheDocument();
  });

  it('resets merge-box state when switching directly between two PRs on the `pr` route', async () => {
    const user = userEvent.setup();
    const mk = (id: number) => ({
      pr: makePr({ id, title: `PR ${id}` }),
      commits: [],
      files: [],
      diff: [],
      mergeability: { state: 'clean' as const, conflicts: [], ahead: 1, behind: 0, outdated: false, canRebase: true },
    });
    const { rerender } = render(
      <HostingView route={{ kind: 'pr', id: 1, tab: 'conversation' }} prs={[]} originBranches={['main']} prView={mk(1)} {...baseProps()} />,
    );
    await user.selectOptions(screen.getByLabelText('Estrategia de fusión'), 'squash');
    await user.click(screen.getByText('Eliminar rama'));
    rerender(
      <HostingView route={{ kind: 'pr', id: 2, tab: 'conversation' }} prs={[]} originBranches={['main']} prView={mk(2)} {...baseProps()} />,
    );
    expect(screen.getByLabelText('Estrategia de fusión')).toHaveValue('merge');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    // A11y: the remount-per-PR (`key={prView.pr.id}`) also moves focus to
    // the newly-shown PR's title, so switching PRs is announced too.
    expect(screen.getByText('PR 2')).toHaveFocus();
  });

  it('falls back to the list when on a `pr` route with no matching prView (unknown id)', () => {
    render(<HostingView route={{ kind: 'pr', id: 999, tab: 'conversation' }} prs={[makePr()]} originBranches={['main']} prView={null} {...baseProps()} />);
    expect(screen.getByText('Mi PR')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});
