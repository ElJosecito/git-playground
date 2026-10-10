// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PullRequestList } from '../PullRequestList';
import type { PullRequest } from '../../../engine/hosting/types';

// New behavior (spec "hosting-web-view" domain, "Pull Request List"
// requirement: "Shows PRs with status, title, source→target, and 'Nuevo
// pull request' action" / "List shows PRs by status — each PR's
// status/title/branches visible").
function makePr(overrides: Partial<PullRequest> = {}): PullRequest {
  return { id: 1, title: 'Mi PR', body: '', source: 'feature', target: 'main', status: 'open', timeline: [], ...overrides };
}

describe('PullRequestList', () => {
  it('renders each PR\'s title, status badge, and source→target branches', () => {
    render(
      <PullRequestList
        prs={[makePr({ id: 1, title: 'Arregla el bug', status: 'open', source: 'fix', target: 'main' })]}
        onNew={vi.fn()}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText('Arregla el bug')).toBeInTheDocument();
    expect(screen.getByText('Abierto')).toBeInTheDocument();
    expect(screen.getByText('#1 · fix → main')).toBeInTheDocument();
  });

  it('renders multiple PRs with their own distinct status badges', () => {
    render(
      <PullRequestList
        prs={[makePr({ id: 1, status: 'open', title: 'Abierto PR' }), makePr({ id: 2, status: 'merged', title: 'Fusionado PR' })]}
        onNew={vi.fn()}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText('Abierto PR')).toBeInTheDocument();
    expect(screen.getByText('Fusionado PR')).toBeInTheDocument();
    expect(screen.getByText('Abierto')).toBeInTheDocument();
    expect(screen.getByText('Fusionado')).toBeInTheDocument();
  });

  it('shows an empty-state message when there are no pull requests yet', () => {
    render(<PullRequestList prs={[]} onNew={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByText('Todavía no hay pull requests.')).toBeInTheDocument();
  });

  it('calls onNew when "Nuevo pull request" is clicked', async () => {
    const onNew = vi.fn();
    const user = userEvent.setup();
    render(<PullRequestList prs={[]} onNew={onNew} onOpen={vi.fn()} />);
    await user.click(screen.getByText('Nuevo pull request'));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it('calls onOpen with the PR id when a row is clicked', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<PullRequestList prs={[makePr({ id: 7, title: 'Arregla el bug' })]} onNew={vi.fn()} onOpen={onOpen} />);
    await user.click(screen.getByText('Arregla el bug'));
    expect(onOpen).toHaveBeenCalledWith(7);
  });
});
