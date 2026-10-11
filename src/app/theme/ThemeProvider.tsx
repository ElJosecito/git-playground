// App-level theme context (design.md: "Theme: an app-level ThemeProvider. It
// writes gitpg:v1 by read-modify-write of the theme field only."). Theme is
// GLOBAL across every route (app-shell spec delta: "a change made on any
// route ... must apply immediately to every other route and persist across
// navigation and reload") — this single provider is meant to sit above the
// router's route switch in `App.tsx`.
//
// `PlaygroundShell` (and later `LevelShell`) may still render their OWN
// `<ThemeProvider>` defensively (standalone unit tests render them with no
// app-level ancestor) — a `ThemeProvider` nested inside an existing one
// detects the ancestor via context and renders as a transparent passthrough
// instead of creating a second, conflicting theme state / duplicate RMW
// writes (design.md Key Decisions: "When no provider exists, PlaygroundShell
// self-wraps in one, so standalone tests still pass.").
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { readTheme, writeTheme } from './themeStorage';
import type { Theme } from './themeStorage';

export interface ThemeContextValue {
  theme: Theme;
  toggle(): void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function ThemeProviderRoot({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => readTheme());

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      writeTheme(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({ theme, toggle }), [theme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const parent = useContext(ThemeContext);
  if (parent) return <>{children}</>;
  return <ThemeProviderRoot>{children}</ThemeProviderRoot>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within a ThemeProvider');
  return ctx;
}
