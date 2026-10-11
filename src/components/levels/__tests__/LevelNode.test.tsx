// @vitest-environment jsdom
// RED (tasks.md Phase 6, 6.1): one level's node in the map (design.md UI:
// "locked levels: aria-disabled + lock; stars with aria-label; 'en curso'
// badge").
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LevelNode } from '../LevelNode';

describe('LevelNode', () => {
  it('renders an unlocked level as a link to its route', () => {
    render(<LevelNode id="basics-01-primer-commit" title="Tu primer commit" unlocked={true} stars={null} inProgress={false} />);
    expect(screen.getByRole('link', { name: /Tu primer commit/ })).toHaveAttribute('href', '#/niveles/basics-01-primer-commit');
  });

  it('renders a locked level as aria-disabled, not a link', () => {
    render(<LevelNode id="basics-02-status-y-stage" title="Status y stage" unlocked={false} stars={null} inProgress={false} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Status y stage').closest('[aria-disabled]')).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows the earned stars with an accessible label', () => {
    render(<LevelNode id="basics-01-primer-commit" title="Tu primer commit" unlocked={true} stars={3} inProgress={false} />);
    expect(screen.getByLabelText('3 estrellas')).toBeInTheDocument();
  });

  it('shows an "en curso" badge for an in-progress, not-yet-completed level', () => {
    render(<LevelNode id="basics-01-primer-commit" title="Tu primer commit" unlocked={true} stars={null} inProgress={true} />);
    expect(screen.getByText('en curso')).toBeInTheDocument();
  });

  it('marks the "next" level so the map can highlight it', () => {
    render(<LevelNode id="basics-01-primer-commit" title="Tu primer commit" unlocked={true} stars={null} inProgress={false} isNext />);
    expect(screen.getByRole('link', { name: /Tu primer commit/ })).toHaveAttribute('aria-current', 'step');
  });
});
