// GREEN (tasks.md Phase 5, 5.2): a level's starting `RepoState`, produced by
// replaying `setup` through the real engine from `vacio()` (level-engine
// spec "Deterministic Setup Replay": never hand-build a `RepoState`).
// Memoized by `id:version` (design.md Key Decisions: "Setup: replay from
// vacio(). Hashes are deterministic via seq. Commit t is Date.now(), so
// predicates must never read t. seedOf is memoized per level.") so remounting
// the same level content (e.g. `LevelShell`'s own remount-on-reset key) never
// re-replays the setup script.
import { GitEngine } from '../engine';
import { applySteps } from '../engine/lessons/steps';
import type { LevelDef } from '../engine/lessons/types';
import type { RepoState } from '../engine/types';

const cache = new Map<string, RepoState>();

export function seedOf(level: Pick<LevelDef, 'id' | 'version' | 'setup'>): RepoState {
  const key = `${level.id}:${level.version}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const seed = applySteps(GitEngine.vacio(), level.setup);
  cache.set(key, seed);
  return seed;
}
