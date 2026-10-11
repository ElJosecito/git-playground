// @vitest-environment jsdom
// RED (tasks.md Phase 6, 6.1): one world's lane (design.md UI: "6
// WorldLanes as git lanes in branch colors, levels as an <ol> of
// LevelNodes").
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorldLane } from '../WorldLane';

describe('WorldLane', () => {
  it('renders the world name heading and an ordered list of its levels', () => {
    render(
      <WorldLane
        world={1}
        name="Básicos"
        levels={[
          { id: 'basics-01-primer-commit', title: 'Tu primer commit', unlocked: true, stars: null, inProgress: false },
          { id: 'basics-02-status-y-stage', title: 'Status y stage', unlocked: false, stars: null, inProgress: false },
        ]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Básicos' })).toBeInTheDocument();
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(screen.getByRole('link', { name: /Tu primer commit/ })).toBeInTheDocument();
    expect(screen.getByText('Status y stage')).toBeInTheDocument();
  });

  it('summarises the world progress (levels completed and stars)', () => {
    render(
      <WorldLane
        world={1}
        name="Básicos"
        levels={[
          { id: 'a', title: 'Uno', unlocked: true, stars: 2, inProgress: false },
          { id: 'b', title: 'Dos', unlocked: true, stars: null, inProgress: true },
        ]}
      />,
    );
    expect(screen.getByLabelText('Básicos: 1 de 2 niveles completados')).toBeInTheDocument();
    expect(screen.getByLabelText('2 de 6 estrellas en este mundo')).toBeInTheDocument();
  });

  it('shows the unlock hint for a locked world', () => {
    render(
      <WorldLane
        world={2}
        name="Ramas"
        lockedHint="Completa Básicos para desbloquear"
        levels={[{ id: 'a', title: 'Uno', unlocked: false, stars: null, inProgress: false }]}
      />,
    );
    expect(screen.getByText('Completa Básicos para desbloquear')).toBeInTheDocument();
  });
});
