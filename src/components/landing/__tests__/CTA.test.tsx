// @vitest-environment jsdom
// landing-page spec "Core Sections": "a dual CTA ('Empezar niveles' ->
// #/niveles, 'Modo libre' -> #/playground)", preloaded on hover/focus.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CTA } from '../CTA';
import * as routes from '../../../app/router/routes';

describe('CTA', () => {
  it('renders an "Empezar niveles" link to #/niveles', () => {
    render(<CTA />);
    expect(screen.getByRole('link', { name: 'Empezar niveles' })).toHaveAttribute('href', '#/niveles');
  });

  it('renders a "Modo libre" link to #/playground', () => {
    render(<CTA />);
    expect(screen.getByRole('link', { name: 'Modo libre' })).toHaveAttribute('href', '#/playground');
  });

  it('preloads the level-map chunk on hovering "Empezar niveles"', async () => {
    const spy = vi.spyOn(routes, 'preloadLevelMap');
    render(<CTA />);
    await userEvent.hover(screen.getByRole('link', { name: 'Empezar niveles' }));
    expect(spy).toHaveBeenCalled();
  });

  it('preloads the playground chunk on focusing "Modo libre"', () => {
    const spy = vi.spyOn(routes, 'preloadPlayground');
    render(<CTA />);
    screen.getByRole('link', { name: 'Modo libre' }).focus();
    expect(spy).toHaveBeenCalled();
  });
});
