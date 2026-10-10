// Command-history persistence. Owns the `hist` slice of the oracle's
// `gitpg:v1` localStorage contract (design-handoff/Git Playground.dc.html's
// `save()`), so terminal history ↑/↓ survives a reload before Phase 7's
// `usePersistence` (tasks.md 7.3/7.4) takes over the full
// `{repo, theme, hist}` round trip. Both read and write are wrapped in
// try/catch, matching the oracle's defensive storage access (design D12).

export const HISTORY_STORAGE_KEY = 'gitpg:v1';
const MAX_HISTORY = 100;

export function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { hist?: unknown };
    if (!Array.isArray(parsed.hist)) return [];
    return parsed.hist.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
}

export function saveHistory(hist: string[]): void {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ ...parsed, hist: hist.slice(-MAX_HISTORY) }));
  } catch {
    // Mirrors the oracle's save(): storage failures are silently ignored.
  }
}
