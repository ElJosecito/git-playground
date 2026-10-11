// @vitest-environment jsdom
// landing-page spec "Core Sections": How it works renders as the third
// section, as an ordered list of steps.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HowItWorks } from '../HowItWorks';

describe('HowItWorks', () => {
  it('renders exactly 3 ordered steps', () => {
    render(<HowItWorks />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('has a visible "Cómo funciona" heading', () => {
    render(<HowItWorks />);
    expect(screen.getByRole('heading', { level: 2, name: 'Cómo funciona' })).toBeInTheDocument();
  });
});
