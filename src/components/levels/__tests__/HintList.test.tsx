// @vitest-environment jsdom
// RED (tasks.md Phase 5, 5.1): progressive hint reveal (level-player spec
// "Progressive Hints and Solution Reveal": "Hints MUST reveal one at a
// time on explicit request, in order"). design.md UI: "HintList (1-star
// warning)".
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HintList } from '../HintList';

describe('HintList', () => {
  const hints = ['Primera pista', 'Segunda pista', 'Tercera pista'];

  it('shows only the revealed hints, in order, leaving the rest hidden', () => {
    render(<HintList hints={hints} hintsUsed={1} onRevealHint={vi.fn()} />);
    expect(screen.getByText('Primera pista')).toBeInTheDocument();
    expect(screen.queryByText('Segunda pista')).not.toBeInTheDocument();
    expect(screen.queryByText('Tercera pista')).not.toBeInTheDocument();
  });

  it('warns that revealing a hint caps the attempt at 1 star', () => {
    render(<HintList hints={hints} hintsUsed={0} onRevealHint={vi.fn()} />);
    expect(screen.getByText(/1 estrella/)).toBeInTheDocument();
  });

  it('requesting the next hint calls onRevealHint', async () => {
    const onRevealHint = vi.fn();
    render(<HintList hints={hints} hintsUsed={0} onRevealHint={onRevealHint} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /pista/i }));
    expect(onRevealHint).toHaveBeenCalledTimes(1);
  });

  it('disables the reveal button once every hint has been shown', () => {
    render(<HintList hints={hints} hintsUsed={3} onRevealHint={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /pista/i })).not.toBeInTheDocument();
  });

  it('labels each revealed hint as a numbered card', () => {
    render(<HintList hints={hints} hintsUsed={2} onRevealHint={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Ver siguiente pista' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Pista 2 de 3')).toBeInTheDocument();
  });
});
