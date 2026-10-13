// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LandingRoute } from '../LandingRoute';
import * as routes from '../../app/router/routes';
import { WORLDS_META } from '../../lessons/worldsMeta';

const LANDING_H1 = 'Aprende Git sin miedo a romper nada.';

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  observed: Element[] = [];
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
  observe(el: Element): void {
    this.observed.push(el);
  }
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

// landing-page spec "Core Sections": CTAs "Empezar niveles" -> #/niveles,
// "Modo libre" -> #/playground. design.md: CTAs are preloaded on hover/
// focus via routes.ts's preload functions.
describe('LandingRoute', () => {
  const originalMatchMedia = window.matchMedia;
  const originalIO = (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver = originalIO;
    MockIntersectionObserver.instances = [];
  });

  it('renders an "Empezar niveles" CTA linking to #/niveles', () => {
    render(<LandingRoute />);
    expect(screen.getByRole('link', { name: 'Empezar niveles' })).toHaveAttribute('href', '#/niveles');
  });

  it('renders a "Modo libre" CTA linking to #/playground', () => {
    render(<LandingRoute />);
    expect(screen.getByRole('link', { name: 'Modo libre' })).toHaveAttribute('href', '#/playground');
  });

  it('has exactly one h1: focusable, route-focus-tagged, with the landing headline', () => {
    render(<LandingRoute />);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveAccessibleName(LANDING_H1);
    expect(h1s[0]).toHaveAttribute('data-route-focus');
    expect(h1s[0]).toHaveAttribute('tabindex', '-1');
  });

  it('renders every section, in order, as an h2 inside a labelled region', () => {
    render(<LandingRoute />);
    const h2s = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(h2s).toEqual([
      'Por qué aprender aquí',
      'Cómo funciona',
      '6 mundos, 30 niveles',
      'Tu primer commit te está esperando.',
    ]);
    for (const name of ['Por qué aprender aquí', 'Cómo funciona', '6 mundos, 30 niveles']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
  });

  it('offers hero entry points to both routes that also preload their chunks', async () => {
    const levelSpy = vi.spyOn(routes, 'preloadLevelMap');
    const playSpy = vi.spyOn(routes, 'preloadPlayground');
    render(<LandingRoute />);
    const hero = screen.getByRole('region', { name: LANDING_H1 });
    const start = within(hero).getByRole('link', { name: 'Empezar ahora' });
    const free = within(hero).getByRole('link', { name: 'Probar el modo libre' });
    expect(start).toHaveAttribute('href', '#/niveles');
    expect(free).toHaveAttribute('href', '#/playground');
    await userEvent.hover(start);
    free.focus();
    expect(levelSpy).toHaveBeenCalled();
    expect(playSpy).toHaveBeenCalled();
  });

  it('links to the cheatsheet from the main nav and preloads its chunk', async () => {
    const spy = vi.spyOn(routes, 'preloadCheatsheet');
    render(<LandingRoute />);
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    const link = within(nav).getByRole('link', { name: 'Cheatsheet' });
    expect(link).toHaveAttribute('href', '#/cheatsheet');
    await userEvent.hover(link);
    expect(spy).toHaveBeenCalled();
  });

  it('links to the roadmap ("Lo que viene") from the main nav and preloads its chunk', async () => {
    const spy = vi.spyOn(routes, 'preloadRoadmap');
    render(<LandingRoute />);
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    const link = within(nav).getByRole('link', { name: 'Lo que viene' });
    expect(link).toHaveAttribute('href', '#/roadmap');
    await userEvent.hover(link);
    expect(spy).toHaveBeenCalled();
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

  it('never masks or hides content: the decorative backdrop and history rail are separate aria-hidden layers', () => {
    const { container } = render(<LandingRoute />);
    const main = container.querySelector('main')!;
    expect(main.querySelector('[data-landing-backdrop]')).toHaveAttribute('aria-hidden', 'true');
    expect(main.querySelector('[data-history-rail]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('under prefers-reduced-motion, renders all content visible: no reveal states, no scroll scrubbing', () => {
    mockMatchMedia(true);
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver;
    const { container } = render(<LandingRoute />);
    expect(container.querySelectorAll('[data-reveal]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-scroll-live]')).toHaveLength(0);
    expect(MockIntersectionObserver.instances).toHaveLength(0);
    for (const world of WORLDS_META) {
      expect(screen.getByText(world.name)).toBeVisible();
    }
  });

  it('without IntersectionObserver support, leaves every section un-armed (fully visible)', () => {
    mockMatchMedia(false);
    delete (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;
    const { container } = render(<LandingRoute />);
    expect(container.querySelectorAll('[data-reveal]')).toHaveLength(0);
  });

  it('with motion allowed and IntersectionObserver available, arms sections for reveal and shows them on intersection', () => {
    mockMatchMedia(false);
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver;
    const { container } = render(<LandingRoute />);
    const armed = container.querySelectorAll('[data-reveal="hidden"]');
    expect(armed.length).toBeGreaterThan(0);
    act(() => {
      for (const io of MockIntersectionObserver.instances) {
        io.callback(
          io.observed.map((target) => ({ isIntersecting: true, target }) as unknown as IntersectionObserverEntry),
          io as unknown as IntersectionObserver,
        );
      }
    });
    expect(container.querySelectorAll('[data-reveal="hidden"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-reveal="shown"]').length).toBe(armed.length);
  });
});
