// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { readTheme, writeTheme, THEME_STORAGE_KEY } from '../themeStorage';

// app-shell spec delta "Theme-only update preserves repo and hist": a
// theme-only write must rewrite ONLY the `theme` field of `gitpg:v1`,
// leaving `repo`/`hist` byte-identical and the key order unchanged. design.md
// Key Decisions: "ThemeProvider reads the theme field and writes it by RMW
// (missing key -> {theme})."
describe('themeStorage', () => {
  beforeEach(() => localStorage.clear());

  it('THEME_STORAGE_KEY matches the sandbox persistence key (gitpg:v1)', () => {
    expect(THEME_STORAGE_KEY).toBe('gitpg:v1');
  });

  it('readTheme() defaults to "dark" when nothing is stored', () => {
    expect(readTheme()).toBe('dark');
  });

  it('readTheme() returns the stored theme field', () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ repo: { v: 1 }, theme: 'light', hist: [] }));
    expect(readTheme()).toBe('light');
  });

  it('readTheme() falls back to "dark" on corrupt JSON', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'not json');
    expect(readTheme()).toBe('dark');
  });

  it('writeTheme() writes only {theme} when no record exists yet', () => {
    writeTheme('light');
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY)!)).toEqual({ theme: 'light' });
  });

  it('writeTheme() preserves repo/hist byte-identical, rewriting only theme', () => {
    const repo = { v: 1, foo: 'bar' };
    const hist = ['git status', 'git log'];
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ repo, theme: 'dark', hist }));
    writeTheme('light');
    const saved = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY)!);
    expect(saved).toEqual({ repo, theme: 'light', hist });
  });

  it('writeTheme() preserves key order {repo, theme, hist}', () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ repo: { v: 1 }, theme: 'dark', hist: ['x'] }));
    writeTheme('light');
    const raw = localStorage.getItem(THEME_STORAGE_KEY)!;
    expect(Object.keys(JSON.parse(raw))).toEqual(['repo', 'theme', 'hist']);
  });

  it('writeTheme() recovers from corrupt JSON by writing {theme} only', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'not json');
    writeTheme('dark');
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY)!)).toEqual({ theme: 'dark' });
  });
});
