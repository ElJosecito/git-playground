// Theme-only read/modify/write of the sandbox's `gitpg:v1` record (app-shell
// spec delta: "Theme-only update preserves repo and hist" — only the
// `theme` field changes in storage; `repo`/`hist` stay byte-identical and
// the record's key order is unchanged). This lets the app-level
// `ThemeProvider` toggle the theme from ANY route (landing, a level) without
// depending on `usePersistence`'s full `{repo, theme, hist}` round trip,
// which only exists once the sandbox (`useGitPlayground`) has mounted.
export const THEME_STORAGE_KEY = 'gitpg:v1';

export type Theme = 'dark' | 'light';

interface RawRecord {
  [key: string]: unknown;
  theme?: unknown;
}

function readRaw(): RawRecord | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as RawRecord) : null;
  } catch {
    return null;
  }
}

export function readTheme(): Theme {
  const record = readRaw();
  return record?.theme === 'light' ? 'light' : 'dark';
}

/** Read-modify-write of ONLY the `theme` field. When no valid record exists
 * yet, writes `{theme}` alone (design.md: "missing key -> {theme}") rather
 * than inventing a `repo`/`hist` shape that isn't this module's to own. */
export function writeTheme(theme: Theme): void {
  try {
    const existing = readRaw();
    const next = existing ? { ...existing, theme } : { theme };
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Mirrors usePersistence's save(): storage failures are silently ignored.
  }
}
