// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LandingRoute } from '../LandingRoute';
import * as routes from '../../app/router/routes';

// landing-page spec "Core Sections": CTAs "Empezar niveles" -> #/niveles,
// "Modo libre" -> #/playground. design.md: CTAs are preloaded on hover/
// focus via routes.ts's preload functions.
describe('LandingRoute', () => {
  it('renders an "Empezar niveles" CTA linking to #/niveles', () => {
    render(<LandingRoute />);
    expect(screen.getByRole('link', { name: 'Empezar niveles' })).toHaveAttribute('href', '#/niveles');
  });

  it('renders a "Modo libre" CTA linking to #/playground', () => {
    render(<LandingRoute />);
    expect(screen.getByRole('link', { name: 'Modo libre' })).toHaveAttribute('href', '#/playground');
  });

  it('has a focusable, route-focus-tagged h1', () => {
    render(<LandingRoute />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveAttribute('data-route-focus');
    expect(h1).toHaveAttribute('tabindex', '-1');
  });

  it('preloads the level-map chunk on hovering "Empezar niveles"', async () => {
    const spy = vi.spyOn(routes, 'preloadLevelMap');
    render(<LandingRoute />);
    await userEvent.hover(screen.getByRole('link', { name: 'Empezar niveles' }));
    expect(spy).toHaveBeenCalled();
  });

  it('preloads the playground chunk on focusing "Modo libre"', async () => {
    const spy = vi.spyOn(routes, 'preloadPlayground');
    render(<LandingRoute />);
    screen.getByRole('link', { name: 'Modo libre' }).focus();
    expect(spy).toHaveBeenCalled();
  });
});
