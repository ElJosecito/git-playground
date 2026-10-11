// @vitest-environment jsdom
// RED (tasks.md Phase 5, 5.1): viewing the full solution, gated behind a
// confirm step (level-player spec "Viewing the solution counts as a hint
// used"; design.md UI: "SolutionReveal (confirm)").
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SolutionReveal } from '../SolutionReveal';

describe('SolutionReveal', () => {
  it('shows a confirm step before revealing, and does not call onShowSolution yet', async () => {
    const onShowSolution = vi.fn();
    render(<SolutionReveal solutionShown={false} solution={['git init']} onShowSolution={onShowSolution} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /ver solución/i }));
    expect(onShowSolution).not.toHaveBeenCalled();
    expect(screen.getByText(/seguro/i)).toBeInTheDocument();
  });

  it('calls onShowSolution only after the confirm step is confirmed', async () => {
    const onShowSolution = vi.fn();
    render(<SolutionReveal solutionShown={false} solution={['git init']} onShowSolution={onShowSolution} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /ver solución/i }));
    await user.click(screen.getByRole('button', { name: /confirmar|sí|ver de todas formas/i }));
    expect(onShowSolution).toHaveBeenCalledTimes(1);
  });

  it('renders the solution steps once solutionShown is true, with no extra confirm', () => {
    render(<SolutionReveal solutionShown={true} solution={['git init', 'git add .']} onShowSolution={vi.fn()} />);
    expect(screen.getByText('git init')).toBeInTheDocument();
    expect(screen.getByText('git add .')).toBeInTheDocument();
    expect(screen.queryByText(/seguro/i)).not.toBeInTheDocument();
  });

  it('describes a hosting-action step in readable Spanish', () => {
    render(
      <SolutionReveal
        solutionShown={true}
        solution={[{ pr: 'create', input: { source: 'feature', target: 'main', title: 'Mi PR', body: '' } }]}
        onShowSolution={vi.fn()}
      />,
    );
    expect(screen.getByText(/pull request/i)).toBeInTheDocument();
  });
});
