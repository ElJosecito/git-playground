// @vitest-environment jsdom
// Hero's h1 carries the landing headline (also asserted by
// `src/__tests__/App.test.tsx` to identify the landing route) plus
// `data-route-focus` for RouteFrame's focus management. The lazy
// `HeroDemo` eventually mounts behind Suspense.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Hero } from '../Hero';

describe('Hero', () => {
  it('renders the landing headline as an h1 with data-route-focus', () => {
    render(<Hero />);
    const h1 = screen.getByRole('heading', { level: 1, name: 'Aprende Git sin miedo a romper nada.' });
    expect(h1).toHaveAttribute('data-route-focus');
    expect(h1).toHaveAttribute('tabindex', '-1');
  });

  it('eventually mounts the lazy HeroDemo behind Suspense', async () => {
    render(<Hero />);
    expect(await screen.findByRole('button', { name: 'Pausar' })).toBeInTheDocument();
  });
});
