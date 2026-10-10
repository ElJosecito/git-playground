import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionBar } from '../ActionBar';

// 1:1 port of the DC template's top-right action bar (design-handoff/Git
// Playground.dc.html, lines 88-105): teammate trigger, theme toggle, and
// the 2-step "Reiniciar repositorio" confirm menu. Phase 6, tasks.md
// 6.5/6.6.
describe('ActionBar', () => {
  function props(overrides: Partial<Parameters<typeof ActionBar>[0]> = {}) {
    return {
      showMate: true,
      mateLabel: 'Simular cambio de un compañero en origin',
      onMate: vi.fn(),
      onToggleTheme: vi.fn(),
      resetOpen: false,
      onToggleReset: vi.fn(),
      onResetExample: vi.fn(),
      onResetEmpty: vi.fn(),
      ...overrides,
    };
  }

  it('renders the teammate button with its label/title when showMate is true', () => {
    render(<ActionBar {...props()} />);
    expect(screen.getByTitle('Añade un commit de otra persona en origin para practicar fetch y pull')).toBeInTheDocument();
    expect(screen.getByText('Simular cambio de un compañero en origin')).toBeInTheDocument();
  });

  it('omits the teammate button when showMate is false', () => {
    render(<ActionBar {...props({ showMate: false })} />);
    expect(screen.queryByTitle('Añade un commit de otra persona en origin para practicar fetch y pull')).not.toBeInTheDocument();
  });

  it('calls onMate/onToggleTheme/onToggleReset on their respective clicks', async () => {
    const p = props();
    render(<ActionBar {...p} />);
    const user = userEvent.setup();
    await user.click(screen.getByText('Simular cambio de un compañero en origin'));
    await user.click(screen.getByLabelText('Cambiar tema'));
    await user.click(screen.getByText('Reiniciar repositorio'));
    expect(p.onMate).toHaveBeenCalledTimes(1);
    expect(p.onToggleTheme).toHaveBeenCalledTimes(1);
    expect(p.onToggleReset).toHaveBeenCalledTimes(1);
  });

  it('hides the reset-confirm panel when resetOpen is false', () => {
    render(<ActionBar {...props({ resetOpen: false })} />);
    expect(screen.queryByText('¿Empezar de nuevo?')).not.toBeInTheDocument();
  });

  it('shows the reset-confirm panel with the exact oracle copy when resetOpen is true', async () => {
    const p = props({ resetOpen: true });
    render(<ActionBar {...p} />);
    expect(screen.getByText('¿Empezar de nuevo?')).toBeInTheDocument();
    expect(screen.getByText('Se perderá el estado actual del repositorio.')).toBeInTheDocument();
    expect(screen.getByText('Repositorio de ejemplo')).toBeInTheDocument();
    expect(screen.getByText('README.md y dos commits en main')).toBeInTheDocument();
    expect(screen.getByText('Carpeta vacía')).toBeInTheDocument();
    expect(screen.getByText('Sin git init: empiezas desde cero')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByText('Repositorio de ejemplo'));
    expect(p.onResetExample).toHaveBeenCalledTimes(1);
    await user.click(screen.getByText('Carpeta vacía'));
    expect(p.onResetEmpty).toHaveBeenCalledTimes(1);
    await user.click(screen.getByText('Cancelar'));
    expect(p.onToggleReset).toHaveBeenCalledTimes(1);
  });
});
