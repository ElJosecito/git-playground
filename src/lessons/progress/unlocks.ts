// Linear world-unlock rule (level-progress spec "Linear World Unlock" /
// design.md: "computeUnlocks is pure: linear within a world; the next
// world opens when the previous one is complete."). Takes a generic
// `LevelUnlockMeta[]` rather than importing the real curriculum catalog
// (Phase 7, not built yet) — Phase 6's `LevelMap`/`ProgressProvider` will
// pass `worldsMeta`-derived metadata shaped like this.
export interface LevelUnlockMeta {
  id: string;
  world: number;
  order: number;
}

export interface UnlockCompletion {
  stars: number;
}

/** Levels unlock in `order` within a world, one at a time, as each prior
 * level earns >=1 star; the first level of the next world only joins the
 * unlocked set once EVERY level in the current world has >=1 star. A
 * world with no completions beyond its own first level stops the whole
 * chain — nothing in a later world is ever unlocked. */
export function computeUnlocks(levels: readonly LevelUnlockMeta[], completed: Record<string, UnlockCompletion>): Set<string> {
  const byWorld = new Map<number, LevelUnlockMeta[]>();
  for (const level of levels) {
    const list = byWorld.get(level.world) ?? [];
    list.push(level);
    byWorld.set(level.world, list);
  }
  const worldNumbers = [...byWorld.keys()].sort((a, b) => a - b);

  const unlocked = new Set<string>();
  let worldOpen = true;
  for (const world of worldNumbers) {
    if (!worldOpen) break;
    const inOrder = [...byWorld.get(world)!].sort((a, b) => a.order - b.order);
    let prevDone = true;
    for (const level of inOrder) {
      if (prevDone) unlocked.add(level.id);
      prevDone = (completed[level.id]?.stars ?? 0) >= 1;
    }
    worldOpen = inOrder.every((level) => (completed[level.id]?.stars ?? 0) >= 1);
  }
  return unlocked;
}
