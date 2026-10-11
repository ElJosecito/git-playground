// RED (tasks.md Phase 6, 6.1): the 6 world display names, hand-authored
// from the level-curriculum spec's own world headings (deviation: a full
// `worldsMeta.ts` per design.md's file layout is Phase 7's job — it needs
// every level id, which don't all exist yet; this tiny, catalog-independent
// map only covers what `LevelMap`'s `WorldLane` needs to render a heading
// per world this batch).
import { describe, it, expect } from 'vitest';
import { WORLD_NAMES } from '../worldNames';

describe('WORLD_NAMES', () => {
  it('names all 6 worlds from the level-curriculum spec', () => {
    expect(WORLD_NAMES).toEqual({
      1: 'Básicos',
      2: 'Ramas',
      3: 'Merge y conflictos',
      4: 'Deshacer cambios',
      5: 'Remoto',
      6: 'Pull requests y colaboración',
    });
  });
});
