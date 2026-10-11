// RED (tasks.md Phase 7, 7.13): `src/lessons/worldsMeta.ts` is design.md's
// named file for the landing page's catalog-free `WorldsPreview` ("worldsMeta
// matches the catalog" — design.md Testing). It must NOT import the engine
// or the real catalog at runtime (landing-page spec "Code-Split Isolation"):
// this test is the one place allowed to cross-check it against the catalog,
// since a test file is never bundled into the landing chunk.
import { describe, it, expect } from 'vitest';
import { WORLDS_META } from '../worldsMeta';
import { WORLD_NAMES } from '../worldNames';
import { allLevelsSorted } from '../catalog';

describe('worldsMeta', () => {
  it('lists exactly the 6 worlds, in order, with the same display names as worldNames.ts', () => {
    expect(WORLDS_META.map((w) => w.world)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const w of WORLDS_META) expect(w.name).toBe(WORLD_NAMES[w.world]);
  });

  it('every world has exactly 5 levels, for 30 total', () => {
    expect(WORLDS_META.every((w) => w.levels.length === 5)).toBe(true);
    expect(WORLDS_META.reduce((n, w) => n + w.levels.length, 0)).toBe(30);
  });

  it('its flattened (world, order) id sequence matches the real catalog exactly', () => {
    const fromMeta = WORLDS_META.flatMap((w) => w.levels.map((l) => l.id));
    const fromCatalog = allLevelsSorted().map((l) => l.id);
    expect(fromMeta).toEqual(fromCatalog);
  });

  it('every level title matches the catalog\'s title for that id', () => {
    const byId = new Map(allLevelsSorted().map((l) => [l.id, l.title]));
    for (const w of WORLDS_META) {
      for (const l of w.levels) {
        expect(l.title).toBe(byId.get(l.id));
      }
    }
  });
});
