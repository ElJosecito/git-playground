// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadHistory, saveHistory, HISTORY_STORAGE_KEY } from '../history';

// Ported from the oracle's `hist` array persistence inside `save()`
// (design-handoff/Git Playground.dc.html: `localStorage.setItem(KEY,
// JSON.stringify({repo, theme, hist: this.hist.slice(-100)}))`). This module
// owns only the `hist` slice of that contract for Phase 3; Phase 7's
// `usePersistence` (task 7.3/7.4) takes over the full `{repo, theme, hist}`
// round trip and should read/write through the same key without clobbering
// this module's writes.
describe('loadHistory', () => {
  beforeEach(() => localStorage.clear());

  it('returns an empty array when nothing is stored', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('returns the stored hist array', () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ hist: ['git status', 'git log'] }));
    expect(loadHistory()).toEqual(['git status', 'git log']);
  });

  it('falls back to an empty array for corrupt JSON', () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, '{not json');
    expect(loadHistory()).toEqual([]);
  });

  it('falls back to an empty array when hist is missing or not an array', () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ repo: {} }));
    expect(loadHistory()).toEqual([]);
  });

  it('filters out non-string entries defensively', () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ hist: ['ok', 42, null] }));
    expect(loadHistory()).toEqual(['ok']);
  });
});

describe('saveHistory', () => {
  beforeEach(() => localStorage.clear());

  it('writes the hist array under the shared storage key', () => {
    saveHistory(['git status']);
    expect(JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY)!)).toEqual({ hist: ['git status'] });
  });

  it('caps the saved history to the last 100 entries', () => {
    const hist = Array.from({ length: 120 }, (_, i) => `cmd ${i}`);
    saveHistory(hist);
    const saved = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY)!) as { hist: string[] };
    expect(saved.hist).toHaveLength(100);
    expect(saved.hist[0]).toBe('cmd 20');
    expect(saved.hist.at(-1)).toBe('cmd 119');
  });

  it('preserves other keys already present under the shared storage slot', () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ theme: 'light', repo: { v: 1 } }));
    saveHistory(['git status']);
    const saved = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY)!);
    expect(saved).toEqual({ theme: 'light', repo: { v: 1 }, hist: ['git status'] });
  });

  it('does not throw when localStorage.setItem fails', () => {
    const original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => {
      throw new Error('quota exceeded');
    };
    expect(() => saveHistory(['x'])).not.toThrow();
    localStorage.setItem = original;
  });
});
