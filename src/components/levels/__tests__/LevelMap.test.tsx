// @vitest-environment jsdom
// RED (tasks.md Phase 6, 6.1): the level map (design.md UI: "LevelMap:
// header: Inicio, total stars x/90, Reiniciar progreso (confirm); 6
// WorldLanes...").
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LevelMap } from '../LevelMap';
import { ProgressProvider } from '../../../lessons/progress/ProgressContext';
import { unlockMetaOf } from '../../../lessons/catalog';

function renderMap() {
  return render(
    <ProgressProvider levels={unlockMetaOf()}>
      <LevelMap />
    </ProgressProvider>,
  );
}

describe('LevelMap', () => {
  beforeEach(() => localStorage.clear());

  it('renders an "Inicio" link to the landing page', () => {
    renderMap();
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '#/');
  });

  it('shows total stars earned over the catalog\'s maximum possible', () => {
    // Phase 7: the full 30-level curriculum now exists (30 * 3 stars = 90),
    // matching design.md UI's literal "total stars x/90" — previously this
    // was `0 / 6` while only World 1's first 2 seed levels existed.
    renderMap();
    expect(screen.getByText('0 / 90')).toBeInTheDocument();
  });

  it('renders the Básicos world lane with its levels', () => {
    renderMap();
    expect(screen.getByRole('heading', { name: 'Básicos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tu primer commit/ })).toBeInTheDocument();
  });

  it('"Reiniciar progreso" asks for confirmation before clearing', async () => {
    renderMap();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Reiniciar progreso' }));
    expect(screen.getByText(/seguro/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirmar|sí/i }));
    expect(localStorage.getItem('gitpg:levels:v1')).toBeNull();
  });
});
