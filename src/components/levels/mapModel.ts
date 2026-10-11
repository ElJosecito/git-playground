// Pure view-model for the redesigned level map (hero stats, per-world
// progress, the "Continuar" target and locked-world hints). It only READS
// the progress store + the already-computed unlock set — star scoring and
// unlock rules stay owned by `src/lessons/progress/*`.
import type { Stars } from '../../lessons/progress/schema';

export interface MapLevelInput {
  id: string;
  title: string;
  world: number;
  order: number;
}

export interface MapProgressInput {
  completed: Record<string, { stars: Stars }>;
  inProgress: Record<string, unknown>;
  unlocked: ReadonlySet<string>;
}

export interface MapLevel {
  id: string;
  title: string;
  order: number;
  unlocked: boolean;
  stars: Stars | null;
  inProgress: boolean;
  isNext: boolean;
}

export interface MapWorld {
  world: number;
  name: string;
  levels: MapLevel[];
  completed: number;
  total: number;
  stars: number;
  maxStars: number;
  unlocked: boolean;
  done: boolean;
  /** This world holds the "next" level (the Continuar target). */
  current: boolean;
  lockedHint: string | null;
}

export interface MapNext {
  id: string;
  title: string;
  world: number;
  order: number;
  /** Some progress already exists ("Continuar") vs a fresh start ("Empezar"). */
  resume: boolean;
}

export interface MapSummary {
  worlds: MapWorld[];
  completedLevels: number;
  totalLevels: number;
  earnedStars: number;
  maxStars: number;
  next: MapNext | null;
}

export const MAX_STARS_PER_LEVEL = 3;

function sortLevels<T extends MapLevelInput>(levels: readonly T[]): T[] {
  return [...levels].sort((a, b) => a.world - b.world || a.order - b.order);
}

function pickNext(sorted: readonly MapLevelInput[], progress: MapProgressInput): MapLevelInput | null {
  const open = sorted.filter((l) => progress.unlocked.has(l.id) && !progress.completed[l.id]);
  return open.find((l) => l.id in progress.inProgress) ?? open[0] ?? null;
}

export function buildMapSummary(
  levels: readonly MapLevelInput[],
  progress: MapProgressInput,
  worldName: (world: number) => string,
): MapSummary {
  const sorted = sortLevels(levels);
  const nextLevel = pickNext(sorted, progress);

  const worldNumbers = [...new Set(sorted.map((l) => l.world))];
  let earnedStars = 0;
  let completedLevels = 0;

  const worlds = worldNumbers.map((world, idx): MapWorld => {
    const mapLevels = sorted
      .filter((l) => l.world === world)
      .map((l): MapLevel => {
        const stars = progress.completed[l.id]?.stars ?? null;
        return {
          id: l.id,
          title: l.title,
          order: l.order,
          unlocked: progress.unlocked.has(l.id),
          stars,
          inProgress: stars === null && l.id in progress.inProgress,
          isNext: nextLevel?.id === l.id,
        };
      });
    const completed = mapLevels.filter((l) => l.stars !== null).length;
    const stars = mapLevels.reduce((sum, l) => sum + (l.stars ?? 0), 0);
    earnedStars += stars;
    completedLevels += completed;
    const unlocked = mapLevels.some((l) => l.unlocked);
    const prevWorld = idx > 0 ? worldNumbers[idx - 1]! : null;
    return {
      world,
      name: worldName(world),
      levels: mapLevels,
      completed,
      total: mapLevels.length,
      stars,
      maxStars: mapLevels.length * MAX_STARS_PER_LEVEL,
      unlocked,
      done: completed === mapLevels.length,
      current: nextLevel?.world === world,
      lockedHint: !unlocked && prevWorld !== null ? `Completa ${worldName(prevWorld)} para desbloquear` : null,
    };
  });

  const resume = completedLevels > 0 || (nextLevel !== null && nextLevel.id in progress.inProgress);

  return {
    worlds,
    completedLevels,
    totalLevels: sorted.length,
    earnedStars,
    maxStars: sorted.length * MAX_STARS_PER_LEVEL,
    next: nextLevel ? { id: nextLevel.id, title: nextLevel.title, world: nextLevel.world, order: nextLevel.order, resume } : null,
  };
}

/** How to unlock a locked `level`: its previous level when its world is
 * already open, otherwise the previous world. */
export function lockedHintFor(
  level: MapLevelInput,
  levels: readonly MapLevelInput[],
  unlocked: ReadonlySet<string>,
  worldName: (world: number) => string,
): string {
  const sorted = sortLevels(levels);
  const sameWorld = sorted.filter((l) => l.world === level.world);
  const worldOpen = sameWorld.some((l) => unlocked.has(l.id));
  if (worldOpen) {
    const idx = sameWorld.findIndex((l) => l.id === level.id);
    const prev = idx > 0 ? sameWorld[idx - 1] : undefined;
    if (prev) return `Completa «${prev.title}» para desbloquear`;
  }
  const worlds = [...new Set(sorted.map((l) => l.world))];
  const prevWorld = worlds[worlds.indexOf(level.world) - 1];
  return prevWorld !== undefined ? `Completa ${worldName(prevWorld)} para desbloquear` : 'Completa los niveles anteriores para desbloquear';
}

/** A stable, decorative 7-char "commit hash" for a level id (FNV-1a). */
export function shortHash(id: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0').slice(0, 7);
}

/** Short Spanish blurbs for each world card (UI copy, not catalog content). */
export const WORLD_BLURBS: Record<number, string> = {
  1: 'init, add y commit: tus primeros pasos con un repositorio.',
  2: 'Crea ramas, salta entre ellas y trae commits sueltos.',
  3: 'Une historias y resuelve conflictos sin miedo.',
  4: 'reset, stash y revert para volver atrás con seguridad.',
  5: 'push, fetch, pull y rebase contra un remoto.',
  6: 'Abre, revisa y fusiona pull requests en equipo.',
};
