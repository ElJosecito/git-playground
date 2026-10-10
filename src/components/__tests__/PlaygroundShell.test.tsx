// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlaygroundShell } from '../PlaygroundShell';

// Integration smoke test for the final tasks.md 7.9 assembly: the real
// `useMobile`/`useTheme`/`usePersistence`/`useReducedMotion` hooks wired
// together (superseding the Phase 3-6 App.tsx bridge's local stand-ins),
// plus the `LiveRegion` (7.7/7.8). Component-level behavior (terminal
// clamping, graph choreography, panels) is already covered by each unit's
// own tests — this file only checks the assembly wires correctly end to
// end.
describe('PlaygroundShell', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    delete (window as { GitPlayground?: unknown }).GitPlayground;
    delete document.documentElement.dataset.theme;
  });

  it('boots with the welcome banner and dark theme by default', () => {
    render(<PlaygroundShell />);
    expect(screen.getByText(/Bienvenido\. Escribe cualquier comando de Git/)).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('running a command updates the terminal output', async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell />);
    const input = screen.getByLabelText('Comando');
    await user.type(input, 'git status{Enter}');
    expect(screen.getByText(/git status/)).toBeInTheDocument();
  });

  it('toggling the theme flips documentElement.dataset.theme and persists it', async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell />);
    const themeButton = screen.getByLabelText('Cambiar tema');
    await user.click(themeButton);
    expect(document.documentElement.dataset.theme).toBe('light');
    const saved = JSON.parse(localStorage.getItem('gitpg:v1')!) as { theme: string };
    expect(saved.theme).toBe('light');
  });

  // Oracle parity (design-handoff/Git Playground.dc.html, line 481): Ctrl+L
  // clears only the output lines, never the pending typed input.
  it('Ctrl+L clears the terminal output but leaves pending input untouched', async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell />);
    const input = screen.getByLabelText('Comando');
    await user.type(input, 'git lo');
    await user.keyboard('{Control>}l{/Control}');
    expect(input).toHaveValue('git lo');
    expect(screen.queryByText(/Bienvenido/)).not.toBeInTheDocument();
  });

  it('renders an aria-live="polite" region for accessibility announcements', () => {
    const { container } = render(<PlaygroundShell />);
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('installs window.GitPlayground with the documented debug shape', () => {
    render(<PlaygroundShell />);
    expect(window.GitPlayground).toBeDefined();
    expect(typeof window.GitPlayground!.estado).toBe('function');
    expect(typeof window.GitPlayground!.ejecutar).toBe('function');
    expect(typeof window.GitPlayground!.motor).toBe('function');
    expect(typeof window.GitPlayground!.cargar).toBe('function');
  });

  it('boots from a previously saved gitpg:v1 snapshot instead of ejemplo()', () => {
    localStorage.setItem(
      'gitpg:v1',
      JSON.stringify({ repo: { v: 1, inited: false, files: {}, commits: {}, order: [], branches: {}, colorOf: {}, nColors: 0, laneOf: {}, lanes: [], detLane: null, tags: {}, head: { type: 'branch', name: 'main' }, prev: null, stash: [], reflog: [], remote: { branches: {}, known: {} }, tracking: {}, upstream: {}, op: null, seq: 0, tm: 0, index: {} }, theme: 'light', hist: ['echo hola'] }),
    );
    render(<PlaygroundShell />);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByText(/Escribe git init en la terminal/)).toBeInTheDocument();
  });
});
