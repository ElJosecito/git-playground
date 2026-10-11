// @vitest-environment jsdom
// Hero's h1 carries the literal "Git Playground" text (load-bearing: see
// the comment in Hero.tsx — `src/__tests__/App.test.tsx`, a baseline test
// not owned by this batch, asserts the landing route's h1 by that exact
// name) plus `data-route-focus` for RouteFrame's focus management. The
// lazy `HeroDemo` eventually mounts behind Suspense.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Hero } from '../Hero';

describe('Hero', () => {
  it('renders an h1 with the literal text "Git Playground" and data-route-focus', () => {
    render(<Hero />);
    const h1 = screen.getByRole('heading', { level: 1, name: 'Git Playground' });
    expect(h1).toHaveAttribute('data-route-focus');
    expect(h1).toHaveAttribute('tabindex', '-1');
  });

  it('eventually mounts the lazy HeroDemo behind Suspense', async () => {
    render(<Hero />);
    expect(await screen.findByRole('button', { name: 'Pausar' })).toBeInTheDocument();
  });
});
