// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useAppTheme } from '../ThemeProvider';
import { THEME_STORAGE_KEY } from '../themeStorage';

// app-shell spec delta: theme MUST be app-wide across routes and persist
// across navigation/reload (design.md: "an app-level ThemeProvider ... When
// no provider exists, PlaygroundShell self-wraps in one, so standalone
// tests still pass.").
function Consumer() {
  const { theme, toggle } = useAppTheme();
  return (
    <button type="button" onClick={toggle}>
      theme:{theme}
    </button>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    delete document.documentElement.dataset.theme;
  });

  it('boots with "dark" and sets documentElement.dataset.theme on mount', () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    expect(screen.getByText('theme:dark')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('boots from a previously persisted theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ theme: 'light' }));
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    expect(screen.getByText('theme:light')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('toggle() flips the theme, updates the DOM, and persists via RMW', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    await user.click(screen.getByText('theme:dark'));
    expect(screen.getByText('theme:light')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY)!)).toEqual({ theme: 'light' });
  });

  it('nesting a second ThemeProvider inside an existing one is a transparent no-op (one shared state)', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeProvider>
          <Consumer />
        </ThemeProvider>
      </ThemeProvider>,
    );
    await user.click(screen.getByText('theme:dark'));
    expect(screen.getByText('theme:light')).toBeInTheDocument();
    // Only one RMW write happened (the outer provider's), not two conflicting ones.
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY)!)).toEqual({ theme: 'light' });
  });

  it('useAppTheme() outside any ThemeProvider throws', () => {
    expect(() => renderHook(() => useAppTheme())).toThrow(/ThemeProvider/);
  });
});
