// @vitest-environment jsdom
// Closes the Phase 1/2 planning gap flagged in apply-progress (deviation
// #3): `PlaygroundShell` must consume the app-level `ThemeProvider`
// context — not an independent local theme state — so a theme change made
// elsewhere in the app (landing, a level, or another sandbox instance
// sharing the same provider) is reflected here without a manual re-toggle
// (app-shell spec delta "Theme set on one route applies to another").
//
// `PlaygroundShell.test.tsx` (unedited, approval-tested) already covers the
// OPPOSITE case: rendered with no ancestor provider at all, where
// `ThemeProvider` self-wraps in its own root (design.md: "When no provider
// exists, PlaygroundShell self-wraps in one, so standalone tests still
// pass."). This file covers the case where an ancestor DOES exist.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlaygroundShell } from '../PlaygroundShell';
import { ThemeProvider, useAppTheme } from '../../app/theme/ThemeProvider';

function OutsideToggle() {
  const { toggle } = useAppTheme();
  return <button onClick={toggle}>Toggle afuera</button>;
}

describe('PlaygroundShell theme wiring (ancestor ThemeProvider)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    delete (window as { GitPlayground?: unknown }).GitPlayground;
    delete document.documentElement.dataset.theme;
  });

  it('shares the ancestor ThemeProvider context instead of its own independent theme state', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <OutsideToggle />
        <PlaygroundShell />
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe('dark');

    // A toggle made OUTSIDE PlaygroundShell (e.g. from another route
    // sharing this same provider) must apply to it immediately.
    await user.click(screen.getByText('Toggle afuera'));
    expect(document.documentElement.dataset.theme).toBe('light');

    // PlaygroundShell's OWN toggle button must act on that SAME shared
    // state (light -> dark), not a stale local 'dark' it never saw change.
    await user.click(screen.getByLabelText('Cambiar tema'));
    expect(document.documentElement.dataset.theme).toBe('dark');

    const saved = JSON.parse(localStorage.getItem('gitpg:v1')!) as { theme: string };
    expect(saved.theme).toBe('dark');
  });
});
