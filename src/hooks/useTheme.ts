// Theme toggle (tasks.md 7.1/7.2). 1:1 port of the DC template's
// `toggleTheme` (design-handoff/Git Playground.dc.html):
// `toggleTheme:()=>{const th=s.theme==='dark'?'light':'dark';
//   document.documentElement.dataset.theme=th;this.setState({theme:th},()=>this.save());}`
// and the boot-time `document.documentElement.dataset.theme=theme;`.
//
// Per design.md's hook table ("Sets documentElement.dataset.theme on mount
// (layout effect) and on toggle"), the DOM write is centralized in a
// `useLayoutEffect` keyed on `theme` rather than duplicated inline in both
// the boot path and `toggle()` — same visible result (no flash before
// paint), one place to read.
import { useCallback, useLayoutEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

export interface UseThemeResult {
  theme: Theme;
  toggle(): void;
}

export function useTheme(initial: Theme, onChange?: (theme: Theme) => void): UseThemeResult {
  const [theme, setTheme] = useState<Theme>(initial);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    onChange?.(next);
  }, [theme, onChange]);

  return { theme, toggle };
}
