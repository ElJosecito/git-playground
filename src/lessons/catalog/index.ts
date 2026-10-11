// Full 30-level, 6-world curriculum (level-curriculum spec; tasks.md Phase
// 7, 7.13). World 1's first two levels were pulled forward in Batch 3;
// Phase 7 completes World 1 and appends Worlds 2-6.
import { w1Levels } from './w1-basicos';
import { w2Levels } from './w2-ramas';
import { w3Levels } from './w3-merge';
import { w4Levels } from './w4-deshacer';
import { w5Levels } from './w5-remoto';
import { w6Levels } from './w6-colaboracion';
import type { LevelDef } from '../../engine/lessons/types';
import type { LevelUnlockMeta } from '../progress/unlocks';

export const levels: LevelDef[] = [...w1Levels, ...w2Levels, ...w3Levels, ...w4Levels, ...w5Levels, ...w6Levels];

export function getLevel(id: string): LevelDef | undefined {
  return levels.find((l) => l.id === id);
}

export function allLevelsSorted(): LevelDef[] {
  return [...levels].sort((a, b) => a.world - b.world || a.order - b.order);
}

/** `ProgressProvider`/`computeUnlocks`'s input shape, derived from whatever
 * levels currently exist in the catalog (design.md: "computeUnlocks is
 * pure... Phase 6's LevelMap/ProgressProvider will pass worldsMeta-derived
 * metadata shaped like this."). */
export function unlockMetaOf(): LevelUnlockMeta[] {
  return levels.map((l) => ({ id: l.id, world: l.world, order: l.order }));
}

/** The next level in catalog order after `level`, or `null` when `level`
 * is the last one currently seeded (level-player spec "Success Screen":
 * "'Siguiente nivel' MUST be absent or disabled when there is no next
 * level"). */
export function nextLevelOf(level: Pick<LevelDef, 'id'>): LevelDef | null {
  const sorted = allLevelsSorted();
  const idx = sorted.findIndex((l) => l.id === level.id);
  if (idx < 0 || idx === sorted.length - 1) return null;
  return sorted[idx + 1]!;
}
