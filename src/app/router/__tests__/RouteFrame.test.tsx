// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouteFrame } from '../RouteFrame';

// design.md: "RouteFrame (keyed) runs in useLayoutEffect after the lazy
// content commits: sets document.title; push navigation: scrolls to top;
// pop navigation: restores scrollY from an in-memory Map (history.
// scrollRestoration=manual); non-initial navigation: focuses
// [data-route-focus] (h1, tabIndex=-1)."
describe('RouteFrame', () => {
  afterEach(() => {
    document.title = '';
  });

  it('sets document.title on mount', () => {
    render(
      <RouteFrame title="Git Playground" routeKey="landing" navKind="push" isInitial>
        <h1 data-route-focus tabIndex={-1}>
          Landing
        </h1>
      </RouteFrame>,
    );
    expect(document.title).toBe('Git Playground');
  });

  it('scrolls to top on a push navigation that is not the initial mount', () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
    render(
      <RouteFrame title="Playground" routeKey="playground" navKind="push" isInitial={false}>
        <h1 data-route-focus tabIndex={-1}>
          Playground
        </h1>
      </RouteFrame>,
    );
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('does not scroll or steal focus on the initial mount', () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
    render(
      <RouteFrame title="Landing" routeKey="landing" navKind="push" isInitial>
        <h1 data-route-focus tabIndex={-1}>
          Landing
        </h1>
      </RouteFrame>,
    );
    expect(scrollTo).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(screen.getByText('Landing'));
  });

  it('focuses the [data-route-focus] element on a non-initial navigation', () => {
    render(
      <RouteFrame title="Niveles" routeKey="levelMap" navKind="push" isInitial={false}>
        <h1 data-route-focus tabIndex={-1}>
          Mapa de niveles
        </h1>
      </RouteFrame>,
    );
    expect(document.activeElement).toBe(screen.getByText('Mapa de niveles'));
  });

  it('restores the saved scrollY for a pop navigation back to a previously visited route', () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
    const { rerender } = render(
      <RouteFrame title="A" routeKey="routeA" navKind="push" isInitial={false} scrollY={123}>
        <h1 data-route-focus tabIndex={-1}>
          A
        </h1>
      </RouteFrame>,
    );
    rerender(
      <RouteFrame title="B" routeKey="routeB" navKind="pop" isInitial={false} scrollY={456}>
        <h1 data-route-focus tabIndex={-1}>
          B
        </h1>
      </RouteFrame>,
    );
    expect(scrollTo).toHaveBeenCalledWith(0, 456);
  });
});
