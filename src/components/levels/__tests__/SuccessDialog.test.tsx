// @vitest-environment jsdom
// RED (tasks.md Phase 5, 5.1): the success screen (level-player spec
// "Success Screen"; design.md UI: "SuccessDialog: modal with focus trap;
// staggered stars; Siguiente nivel / mundo; Repetir; Mapa.").
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SuccessDialog } from '../SuccessDialog';

describe('SuccessDialog', () => {
  it('renders as a modal dialog and announces the stars earned', () => {
    render(<SuccessDialog stars={2} onNext={vi.fn()} nextDisabled={false} onRepeat={vi.fn()} onBackToMap={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('2 de 3 estrellas')).toBeInTheDocument();
  });

  it('moves focus into the dialog on mount (focus trap entry point)', () => {
    render(<SuccessDialog stars={3} onNext={vi.fn()} nextDisabled={false} onRepeat={vi.fn()} onBackToMap={vi.fn()} />);
    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('shows "Siguiente nivel" enabled when there is an unlocked next level', async () => {
    const onNext = vi.fn();
    render(<SuccessDialog stars={3} onNext={onNext} nextDisabled={false} onRepeat={vi.fn()} onBackToMap={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Siguiente nivel' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('hides "Siguiente nivel" when there is no next level or it is locked', () => {
    render(<SuccessDialog stars={3} onNext={vi.fn()} nextDisabled={true} onRepeat={vi.fn()} onBackToMap={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Siguiente nivel' })).not.toBeInTheDocument();
  });

  it('calls onRepeat and onBackToMap from their respective actions', async () => {
    const onRepeat = vi.fn();
    const onBackToMap = vi.fn();
    render(<SuccessDialog stars={1} onNext={vi.fn()} nextDisabled={true} onRepeat={onRepeat} onBackToMap={onBackToMap} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Repetir' }));
    expect(onRepeat).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Volver al mapa' }));
    expect(onBackToMap).toHaveBeenCalledTimes(1);
  });

  it('pressing Escape calls onClose', async () => {
    const onClose = vi.fn();
    render(<SuccessDialog stars={3} onNext={vi.fn()} nextDisabled={false} onRepeat={vi.fn()} onBackToMap={vi.fn()} onClose={onClose} />);
    const user = userEvent.setup();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('restores focus to the previously focused element once the dialog closes', async () => {
    function Wrapper() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button data-testid="outside" onClick={() => setOpen(true)}>
            Outside
          </button>
          {open && (
            <SuccessDialog stars={3} onNext={vi.fn()} nextDisabled={false} onRepeat={vi.fn()} onBackToMap={vi.fn()} onClose={() => setOpen(false)} />
          )}
        </>
      );
    }
    render(<Wrapper />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('outside'));
    expect(screen.getByRole('dialog')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.getByTestId('outside')).toHaveFocus();
  });

  it('shows the run stats: commands used against the budget and hints used', () => {
    render(
      <SuccessDialog stars={2} count={9} budget={7} hintsUsed={0} onNext={vi.fn()} nextDisabled={false} onRepeat={vi.fn()} onBackToMap={vi.fn()} />,
    );
    expect(screen.getByLabelText('Comandos: 9 de 7')).toBeInTheDocument();
    expect(screen.getByLabelText('Pistas usadas: 0')).toBeInTheDocument();
  });

  it('counts a shown solution in the hints stat', () => {
    render(
      <SuccessDialog stars={1} count={3} budget={7} hintsUsed={1} solutionShown onNext={vi.fn()} nextDisabled={false} onRepeat={vi.fn()} onBackToMap={vi.fn()} />,
    );
    expect(screen.getByLabelText('Pistas usadas: 1 + solución')).toBeInTheDocument();
  });

  it('names the completed level when given its title', () => {
    render(<SuccessDialog stars={3} levelTitle="Tu primer commit" onNext={vi.fn()} nextDisabled={false} onRepeat={vi.fn()} onBackToMap={vi.fn()} />);
    expect(screen.getByText('Tu primer commit')).toBeInTheDocument();
  });
});
