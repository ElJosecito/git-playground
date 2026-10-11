// @vitest-environment jsdom
// Progressive-enhancement reveal hook behind the landing page's on-scroll
// animations (landing-page spec "Scroll-Driven History Narrative" /
// "Reduced Motion Respect"): content stays fully visible ("static") unless
// JS confirms IntersectionObserver support AND motion is allowed; only then
// is it armed ("hidden") and later revealed ("shown").
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { useReveal } from '../useReveal';
import type { UseRevealOptions } from '../useReveal';

type IOCallback = (entries: Pick<IntersectionObserverEntry, 'isIntersecting' | 'target'>[]) => void;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IOCallback;
  options: IntersectionObserverInit | undefined;
  observed: Element[] = [];
  disconnected = false;
  constructor(callback: IOCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }
  observe(el: Element): void {
    this.observed.push(el);
  }
  unobserve(): void {}
  disconnect(): void {
    this.disconnected = true;
  }
  fire(isIntersecting: boolean): void {
    this.callback(this.observed.map((target) => ({ isIntersecting, target })));
  }
}

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

function Probe(props: UseRevealOptions) {
  const { ref, state, revealProps } = useReveal<HTMLDivElement>(props);
  return createElement('div', { ref, 'data-testid': 'probe', 'data-state': state, ...revealProps }, 'contenido');
}

describe('useReveal', () => {
  const originalMatchMedia = window.matchMedia;
  const originalIO = (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;

  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    mockMatchMedia(false);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver = originalIO;
  });

  it('stays "static" (no data-reveal attribute, fully visible) when IntersectionObserver is unavailable', () => {
    delete (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;
    render(createElement(Probe));
    const el = screen.getByTestId('probe');
    expect(el).toHaveAttribute('data-state', 'static');
    expect(el).not.toHaveAttribute('data-reveal');
  });

  it('stays "static" under prefers-reduced-motion even when IntersectionObserver exists', () => {
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver;
    mockMatchMedia(true);
    render(createElement(Probe));
    const el = screen.getByTestId('probe');
    expect(el).toHaveAttribute('data-state', 'static');
    expect(el).not.toHaveAttribute('data-reveal');
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it('arms to "hidden" once IntersectionObserver support is confirmed, then reveals to "shown" on intersection', () => {
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver;
    render(createElement(Probe));
    const el = screen.getByTestId('probe');
    expect(el).toHaveAttribute('data-reveal', 'hidden');

    const io = MockIntersectionObserver.instances[0]!;
    expect(io.observed).toContain(el);

    act(() => io.fire(true));
    expect(el).toHaveAttribute('data-reveal', 'shown');
    expect(el).toHaveAttribute('data-state', 'shown');
  });

  it('reveals once by default: stops observing after the first intersection and never re-hides', () => {
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver;
    render(createElement(Probe));
    const io = MockIntersectionObserver.instances[0]!;
    act(() => io.fire(true));
    expect(io.disconnected).toBe(true);
    act(() => io.fire(false));
    expect(screen.getByTestId('probe')).toHaveAttribute('data-reveal', 'shown');
  });

  it('with once: false, toggles back to "hidden" when the element leaves the viewport', () => {
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver;
    render(createElement(Probe, { once: false }));
    const io = MockIntersectionObserver.instances[0]!;
    act(() => io.fire(true));
    expect(screen.getByTestId('probe')).toHaveAttribute('data-reveal', 'shown');
    act(() => io.fire(false));
    expect(screen.getByTestId('probe')).toHaveAttribute('data-reveal', 'hidden');
  });

  it('forwards rootMargin/threshold to the observer', () => {
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver;
    render(createElement(Probe, { rootMargin: '0px 0px -40% 0px', threshold: 0 }));
    const io = MockIntersectionObserver.instances[0]!;
    expect(io.options).toMatchObject({ rootMargin: '0px 0px -40% 0px', threshold: 0 });
  });

  it('disconnects the observer on unmount', () => {
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver;
    const { unmount } = render(createElement(Probe));
    const io = MockIntersectionObserver.instances[0]!;
    unmount();
    expect(io.disconnected).toBe(true);
  });
});
