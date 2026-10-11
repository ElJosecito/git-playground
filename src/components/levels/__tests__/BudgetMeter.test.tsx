// @vitest-environment jsdom
// RED (tasks.md Phase 5, 5.1): the live command-budget counter
// (level-player spec "Command Budget Counter": "The player MUST display a
// live count against the level's budget").
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BudgetMeter } from '../BudgetMeter';

describe('BudgetMeter', () => {
  it('shows the current count against the budget', () => {
    render(<BudgetMeter count={3} budget={7} />);
    expect(screen.getByText('3 / 7')).toBeInTheDocument();
  });

  it('is announced live as count changes', () => {
    const { container, rerender } = render(<BudgetMeter count={0} budget={5} />);
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    rerender(<BudgetMeter count={1} budget={5} />);
    expect(screen.getByText('1 / 5')).toBeInTheDocument();
  });

  it('flags an over-budget count visually via a data attribute', () => {
    render(<BudgetMeter count={8} budget={7} />);
    expect(screen.getByText('8 / 7')).toHaveAttribute('data-over-budget', 'true');
  });

  it('projects 3 stars while within budget and no hint was used', () => {
    render(<BudgetMeter count={2} budget={7} hintsUsed={false} />);
    expect(screen.getByLabelText('Proyección: 3 estrellas')).toBeInTheDocument();
  });

  it('projects 2 stars once over budget', () => {
    render(<BudgetMeter count={8} budget={7} hintsUsed={false} />);
    expect(screen.getByLabelText('Proyección: 2 estrellas')).toBeInTheDocument();
  });

  it('projects 1 star once a hint (or the solution) was used, regardless of budget', () => {
    render(<BudgetMeter count={1} budget={7} hintsUsed={true} />);
    expect(screen.getByLabelText('Proyección: 1 estrella')).toBeInTheDocument();
  });

  it('exposes the usage as a meter', () => {
    render(<BudgetMeter count={3} budget={7} />);
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuenow', '3');
    expect(meter).toHaveAttribute('aria-valuemax', '7');
  });
});
