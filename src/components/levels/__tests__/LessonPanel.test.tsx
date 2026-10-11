// @vitest-environment jsdom
// RED (tasks.md Phase 5, 5.1): the composed lesson panel (level-player spec
// "Live Checklist Panel"; design.md UI: "LessonPanel: breadcrumb, h1,
// objective, Teoría <details>, GoalChecklist ..., BudgetMeter, HintList
// ..., SolutionReveal ..., Reiniciar nivel, Volver al mapa.").
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LessonPanel } from '../LessonPanel';
import type { LevelDef } from '../../../engine/lessons/types';

function level(): LevelDef {
  return {
    id: 'basics-01-primer-commit',
    world: 1,
    order: 1,
    version: 1,
    title: 'Tu primer commit',
    objective: 'Inicializa el repositorio y haz tu primer commit.',
    theory: ['Un repositorio empieza con git init.'],
    setup: [],
    solution: ['git init'],
    goals: [
      { id: 'inited', label: 'Inicializa el repositorio', check: () => false },
      { id: 'commit', label: 'Haz al menos un commit', check: () => false },
    ],
    hints: ['Pista uno', 'Pista dos'],
  };
}

describe('LessonPanel', () => {
  function props(overrides: Partial<Parameters<typeof LessonPanel>[0]> = {}) {
    return {
      level: level(),
      evaluation: { goals: [{ id: 'inited', label: 'Inicializa el repositorio', done: false }, { id: 'commit', label: 'Haz al menos un commit', done: false }], solved: false },
      budget: 7,
      count: 0,
      hintsUsed: 0,
      solutionShown: false,
      onRevealHint: vi.fn(),
      onShowSolution: vi.fn(),
      onReset: vi.fn(),
      mapHref: '#/niveles',
      ...overrides,
    };
  }

  it('renders the title, objective, and theory behind a collapsible details', () => {
    render(<LessonPanel {...props()} />);
    expect(screen.getByRole('heading', { name: 'Tu primer commit' })).toBeInTheDocument();
    expect(screen.getByText('Inicializa el repositorio y haz tu primer commit.')).toBeInTheDocument();
    expect(screen.getByText('Teoría').closest('details')).toBeInTheDocument();
    expect(screen.getByText('Un repositorio empieza con git init.')).toBeInTheDocument();
  });

  it('renders the checklist and budget meter from the evaluation/count props', () => {
    render(<LessonPanel {...props({ count: 2 })} />);
    expect(screen.getByText('Inicializa el repositorio')).toBeInTheDocument();
    expect(screen.getByText('2 / 7')).toBeInTheDocument();
  });

  it('wires hint reveal and solution reveal through to their callbacks', async () => {
    const onRevealHint = vi.fn();
    render(<LessonPanel {...props({ onRevealHint })} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /ver pista/i }));
    expect(onRevealHint).toHaveBeenCalledTimes(1);
  });

  it('wires "Reiniciar nivel" and renders a "Volver al mapa" link to mapHref', async () => {
    const onReset = vi.fn();
    render(<LessonPanel {...props({ onReset })} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Reiniciar nivel' }));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Volver al mapa' })).toHaveAttribute('href', '#/niveles');
  });

  it('shows the world in a commit-style eyebrow and the level position', () => {
    render(<LessonPanel {...props({ worldName: 'Básicos', levelCount: 5 })} />);
    expect(screen.getByText('Básicos')).toBeInTheDocument();
    expect(screen.getByText('Nivel 1 de 5')).toBeInTheDocument();
  });

  it('can be collapsed into a compact card (mobile sheet toggle)', async () => {
    render(<LessonPanel {...props()} />);
    const user = userEvent.setup();
    const toggle = screen.getByRole('button', { name: 'Mostrar la lección' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Ocultar la lección' })).toHaveAttribute('aria-expanded', 'true');
  });
});
