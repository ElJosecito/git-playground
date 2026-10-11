// @vitest-environment jsdom
// RED (tasks.md Phase 5, 5.1): the locked-level guard view (app-routing
// spec "Locked Level Guard": "A `#/niveles/:id` for a level whose world is
// not yet unlocked MUST render a 'Nivel bloqueado' view instead of the
// level, with a link back to the level map.").
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LockedLevel } from '../LockedLevel';

describe('LockedLevel', () => {
  it('renders the "Nivel bloqueado" heading and a link back to the map', () => {
    render(<LockedLevel />);
    expect(screen.getByRole('heading', { name: /nivel bloqueado/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /mapa/i })).toHaveAttribute('href', '#/niveles');
  });

  it('names the locked level and how to unlock it when given', () => {
    render(<LockedLevel title="Crea una rama" hint="Completa Básicos para desbloquear" />);
    expect(screen.getByText('Crea una rama')).toBeInTheDocument();
    expect(screen.getByText('Completa Básicos para desbloquear')).toBeInTheDocument();
  });
});
