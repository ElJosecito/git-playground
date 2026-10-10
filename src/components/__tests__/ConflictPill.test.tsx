import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConflictPill } from '../ConflictPill';

// 1:1 port of the DC template's collapsed conflict-resolver pill
// (design-handoff/Git Playground.dc.html, line 166). Phase 6, tasks.md
// 6.5/6.6.
describe('ConflictPill', () => {
  it('renders the oracle Spanish label', () => {
    render(<ConflictPill onShow={() => {}} />);
    expect(screen.getByText('Conflicto · abrir resolvedor')).toBeInTheDocument();
  });

  it('calls onShow when clicked', async () => {
    const onShow = vi.fn();
    render(<ConflictPill onShow={onShow} />);
    await userEvent.setup().click(screen.getByText('Conflicto · abrir resolvedor'));
    expect(onShow).toHaveBeenCalledTimes(1);
  });
});
