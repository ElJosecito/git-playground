// @vitest-environment jsdom
// landing-page spec "Core Sections": Features renders as the second
// section, with concrete, non-generic claims (not a style test).
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Features } from '../Features';

describe('Features', () => {
  it('renders exactly 3 feature items', () => {
    render(<Features />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('has a heading naming the section (even if visually hidden)', () => {
    render(<Features />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });
});
