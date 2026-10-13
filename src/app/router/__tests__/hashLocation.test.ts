// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { parseRoute, buildHash, navigate, getHash, subscribeHash, getLastNavKind } from '../hashLocation';

// app-routing spec: "Hash Route Table" (exactly 4 routes: #/, #/playground,
// #/niveles, #/niveles/:id), "Unknown Route Fallback" (replace with #/),
// "Unknown Level Fallback" is semantic (catalog-based, handled by LevelRoute
// later) — this module only owns SYNTACTIC parsing + navigation, per
// design.md's "Router: hand-rolled. Pure parseRoute and navigate(to,
// {replace})."
describe('parseRoute', () => {
  it('parses an empty hash as the landing route', () => {
    expect(parseRoute('')).toEqual({ name: 'landing' });
  });

  it('parses "#/" as the landing route', () => {
    expect(parseRoute('#/')).toEqual({ name: 'landing' });
  });

  it('parses "#/playground" as the playground route', () => {
    expect(parseRoute('#/playground')).toEqual({ name: 'playground' });
  });

  it('parses "#/niveles" as the levelMap route', () => {
    expect(parseRoute('#/niveles')).toEqual({ name: 'levelMap' });
  });

  it('parses "#/niveles/basics-01-primer-commit" as a level route with that id', () => {
    expect(parseRoute('#/niveles/basics-01-primer-commit')).toEqual({ name: 'level', id: 'basics-01-primer-commit' });
  });

  it('parses "#/cheatsheet" as the cheatsheet route', () => {
    expect(parseRoute('#/cheatsheet')).toEqual({ name: 'cheatsheet' });
  });

  it('parses "#/roadmap" as the roadmap route', () => {
    expect(parseRoute('#/roadmap')).toEqual({ name: 'roadmap' });
    expect(parseRoute('#/roadmap/x')).toEqual({ name: 'unknown', fallback: 'landing' });
  });

  it('parses "#/cheatsheet" with extra segments as unknown, falling back to landing', () => {
    expect(parseRoute('#/cheatsheet/x')).toEqual({ name: 'unknown', fallback: 'landing' });
  });

  it('parses an unrecognized top-level hash as unknown, falling back to landing', () => {
    expect(parseRoute('#/no-existe')).toEqual({ name: 'unknown', fallback: 'landing' });
  });

  it('parses a malformed level id (empty) as unknown, falling back to the level map', () => {
    expect(parseRoute('#/niveles/')).toEqual({ name: 'unknown', fallback: 'levelMap' });
  });

  it('parses a level route with extra path segments as unknown, falling back to the level map', () => {
    expect(parseRoute('#/niveles/abc/def')).toEqual({ name: 'unknown', fallback: 'levelMap' });
  });
});

describe('buildHash', () => {
  it('builds "#/cheatsheet" for the cheatsheet route', () => {
    expect(buildHash({ name: 'cheatsheet' })).toBe('#/cheatsheet');
  });

  it('builds "#/roadmap" for the roadmap route', () => {
    expect(buildHash({ name: 'roadmap' })).toBe('#/roadmap');
  });

  it('round-trips every concrete route through parseRoute', () => {
    const routes = [{ name: 'landing' as const }, { name: 'playground' as const }, { name: 'levelMap' as const }, { name: 'level' as const, id: 'x1' }, { name: 'cheatsheet' as const }, { name: 'roadmap' as const }];
    for (const route of routes) {
      expect(parseRoute(buildHash(route))).toEqual(route);
    }
  });
});

describe('navigate + getHash', () => {
  beforeEach(() => {
    window.location.hash = '';
  });
  afterEach(() => {
    window.location.hash = '';
  });

  it('navigate() with no options pushes a new hash via location.hash', () => {
    navigate({ name: 'playground' });
    expect(getHash()).toBe('#/playground');
  });

  it('navigate({replace:true}) updates the hash without growing browser history (fires a synthetic hashchange)', () => {
    let fired = 0;
    const unsubscribe = subscribeHash(() => {
      fired += 1;
    });
    navigate({ name: 'levelMap' }, { replace: true });
    expect(getHash()).toBe('#/niveles');
    expect(fired).toBe(1);
    unsubscribe();
  });
});

describe('getLastNavKind', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('is "push" after a plain navigate()', () => {
    navigate({ name: 'playground' });
    expect(getLastNavKind()).toBe('push');
  });

  it('is "replace" after navigate({replace:true})', () => {
    navigate({ name: 'levelMap' }, { replace: true });
    expect(getLastNavKind()).toBe('replace');
  });

  it('is "pop" after a native popstate (browser back/forward)', () => {
    navigate({ name: 'playground' });
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(getLastNavKind()).toBe('pop');
  });
});

describe('subscribeHash', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('calls the listener on a native hashchange', async () => {
    let calls = 0;
    const unsubscribe = subscribeHash(() => {
      calls += 1;
    });
    window.location.hash = '#/niveles';
    await vi.waitFor(() => expect(calls).toBeGreaterThanOrEqual(1));
    unsubscribe();
  });

  it('stops calling the listener after unsubscribe', async () => {
    let calls = 0;
    const unsubscribe = subscribeHash(() => {
      calls += 1;
    });
    unsubscribe();
    window.location.hash = '#/playground';
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(calls).toBe(0);
  });
});
