// Per-route chrome (design.md Key Decisions): sets `document.title`, scrolls
// to top on push navigation, restores the saved `scrollY` on pop navigation,
// and focuses `[data-route-focus]` on any non-initial navigation. Runs in a
// `useLayoutEffect` keyed on `routeKey` so it re-fires once per actual route
// change (after the lazy route content has committed), not on every
// unrelated re-render.
//
// The in-memory scroll-position Map design.md describes is owned by the
// CALLER (the router switch in `App.tsx`, which already tracks `navKind`
// per navigation) and handed down as the `scrollY` prop for pop
// navigations — keeping this component itself a pure, easily testable leaf
// rather than a second place that tracks navigation history.
import { useLayoutEffect } from 'react';
import type { ReactNode } from 'react';

export type NavKind = 'push' | 'pop' | 'replace';

export interface RouteFrameProps {
  title: string;
  /** Identifies the current route (changes exactly when the visible route
   * changes) — the effect's dependency key. */
  routeKey: string;
  navKind: NavKind;
  /** True only for the very first route rendered on boot — no scroll/focus
   * management should run then (matches landing on a fresh page load with
   * the browser's own natural scroll position/focus). */
  isInitial: boolean;
  /** Saved scrollY to restore on a `pop` navigation back to a previously
   * visited route. Ignored for `push`/`replace`. */
  scrollY?: number;
  children: ReactNode;
}

export function RouteFrame({ title, routeKey, navKind, isInitial, scrollY, children }: RouteFrameProps) {
  useLayoutEffect(() => {
    document.title = title;
    if (isInitial) return;

    if (navKind === 'pop') {
      window.scrollTo(0, scrollY ?? 0);
    } else {
      window.scrollTo(0, 0);
    }

    const focusTarget = document.querySelector<HTMLElement>('[data-route-focus]');
    focusTarget?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  return <>{children}</>;
}
