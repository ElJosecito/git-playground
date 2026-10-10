import { describe, it, expect } from 'vitest';
import { vacio } from '../../state';
import { defaultHosting, hostingOf, ensureHosting } from '../state';

describe('hosting/state (hostingOf/defaultHosting/ensureHosting)', () => {
  it('defaultHosting returns an empty container with nextId starting at 1', () => {
    expect(defaultHosting()).toEqual({ prs: [], nextId: 1, clock: 0 });
  });

  it('hostingOf returns a fresh default when s.hosting is absent, without creating the key on s', () => {
    const s = vacio();
    expect(hostingOf(s)).toEqual({ prs: [], nextId: 1, clock: 0 });
    expect(s.hosting).toBeUndefined();
  });

  it('hostingOf returns the existing container by reference when present and well formed', () => {
    const s = vacio();
    s.hosting = { prs: [], nextId: 3, clock: 2 };
    expect(hostingOf(s)).toBe(s.hosting);
  });

  it('hostingOf falls back to a fresh default for a malformed/corrupt hosting value (old-save regression)', () => {
    const s = vacio();
    // @ts-expect-error intentionally corrupt shape, as an old/foreign save might produce
    s.hosting = { prs: 'not-an-array' };
    expect(hostingOf(s)).toEqual({ prs: [], nextId: 1, clock: 0 });
  });

  it('ensureHosting lazily creates the container on s and returns the same reference on repeated calls', () => {
    const s = vacio();
    expect(s.hosting).toBeUndefined();
    const h1 = ensureHosting(s);
    expect(s.hosting).toBe(h1);
    expect(h1).toEqual({ prs: [], nextId: 1, clock: 0 });
    const h2 = ensureHosting(s);
    expect(h2).toBe(h1);
  });

  it('ensureHosting replaces a malformed existing value with a fresh default', () => {
    const s = vacio();
    // @ts-expect-error intentionally corrupt shape
    s.hosting = { prs: 'nope' };
    const h = ensureHosting(s);
    expect(h).toEqual({ prs: [], nextId: 1, clock: 0 });
    expect(s.hosting).toBe(h);
  });
});
