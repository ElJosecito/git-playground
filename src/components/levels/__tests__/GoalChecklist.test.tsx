// @vitest-environment jsdom
// RED (tasks.md Phase 5, 5.1): the live checklist panel (level-engine spec
// "Checklist re-evaluates after a command": "the checklist item flips to
// done on the next render"). design.md UI: "GoalChecklist (data-done pop,
// live announce, can regress)".
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GoalChecklist } from '../GoalChecklist';

describe('GoalChecklist', () => {
  it('renders each goal label with its done state as a data attribute', () => {
    render(
      <GoalChecklist
        goals={[
          { id: 'a', label: 'Inicializa el repositorio', done: true },
          { id: 'b', label: 'Haz un commit', done: false },
        ]}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAttribute('data-done', 'true');
    expect(items[1]).toHaveAttribute('data-done', 'false');
    expect(screen.getByText('Inicializa el repositorio')).toBeInTheDocument();
    expect(screen.getByText('Haz un commit')).toBeInTheDocument();
  });

  it('exposes the list as an aria-live region so completions are announced', () => {
    const { container } = render(<GoalChecklist goals={[{ id: 'a', label: 'Meta', done: false }]} />);
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('can regress — a done goal flipping back to not-done updates data-done', () => {
    const { rerender } = render(<GoalChecklist goals={[{ id: 'a', label: 'Meta', done: true }]} />);
    expect(screen.getByRole('listitem')).toHaveAttribute('data-done', 'true');
    rerender(<GoalChecklist goals={[{ id: 'a', label: 'Meta', done: false }]} />);
    expect(screen.getByRole('listitem')).toHaveAttribute('data-done', 'false');
  });
});
