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

function seed(completed: Record<string, 1 | 2 | 3>) {
  localStorage.setItem(
    'gitpg:levels:v1',
    JSON.stringify({
      v: 1,
      completed: Object.fromEntries(Object.entries(completed).map(([id, stars]) => [id, { stars, bestCount: 1, at: 1 }])),
      inProgress: {},
    }),
  );
}

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
    // matching design.md UI's literal "total stars x/90". Redesign: the
    // hero renders the count as a big number + "/ 90", so the stat is
    // asserted through its accessible label rather than one text node.
    renderMap();
    expect(screen.getByLabelText('0 de 90 estrellas en total')).toBeInTheDocument();
    expect(screen.getByLabelText('0 de 30 niveles completados')).toBeInTheDocument();
  });

  it('keeps the "Mapa de niveles" h1 as the route focus target', () => {
    renderMap();
    expect(screen.getByRole('heading', { level: 1, name: 'Mapa de niveles' })).toHaveAttribute('data-route-focus');
  });

  it('a fresh player gets an "Empezar" CTA pointing at the very first level', () => {
    renderMap();
    expect(screen.getByRole('link', { name: /^Empezar/ })).toHaveAttribute('href', '#/niveles/basics-01-primer-commit');
  });

  it('with progress, the hero CTA is "Continuar" and points at the next unlocked level', () => {
    seed({ 'basics-01-primer-commit': 3, 'basics-02-status-y-stage': 2 });
    renderMap();
    expect(screen.getByRole('link', { name: /^Continuar/ })).toHaveAttribute('href', '#/niveles/basics-03-deshacer-stage');
    expect(screen.getByLabelText('5 de 90 estrellas en total')).toBeInTheDocument();
    expect(screen.getByLabelText('2 de 30 niveles completados')).toBeInTheDocument();
  });

  it('shows per-world progress and explains how a locked world unlocks', () => {
    seed({ 'basics-01-primer-commit': 3 });
    renderMap();
    expect(screen.getByLabelText('Básicos: 1 de 5 niveles completados')).toBeInTheDocument();
    expect(screen.getByText('Completa Básicos para desbloquear')).toBeInTheDocument();
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
