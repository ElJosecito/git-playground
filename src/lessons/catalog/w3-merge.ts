// World 3 — Merge y conflictos (level-curriculum spec "World 3 — Merge y
// conflictos"). tasks.md Phase 7, 7.3.
import { isMerged, isMergeCommit, hasConflict, opInProgress } from '../../engine/lessons/predicates';
import type { LevelDef } from '../../engine/lessons/types';

const BASE_SETUP = ['git init', 'touch base.txt', 'echo "base" > base.txt', 'git add base.txt', 'git commit -m "Base"'];

export const merge01FastForward: LevelDef = {
  id: 'merge-01-fast-forward',
  world: 3,
  order: 1,
  version: 1,
  title: 'Fusión fast-forward',
  objective: 'Fusiona feature en main.',
  theory: [
    'Cuando main no avanzó desde que creaste feature, fusionarla es un "fast-forward": Git simplemente mueve el puntero de main, sin crear un commit nuevo.',
    'Es la fusión más simple posible, porque no hay nada que combinar.',
  ],
  setup: [...BASE_SETUP, 'git switch -c feature', 'touch b.txt', 'echo "feature" > b.txt', 'git add b.txt', 'git commit -m "Feature work"'],
  solution: ['git switch main', 'git merge feature'],
  goals: [{ id: 'merged', label: 'Fusiona feature en main', check: (s) => isMerged(s, 'main', 'feature') }],
  hints: ['Vuelve primero a main: `git switch main`.', 'Fusiona con `git merge feature`.'],
};

export const merge02TresVias: LevelDef = {
  id: 'merge-02-tres-vias',
  world: 3,
  order: 2,
  version: 1,
  title: 'Fusión de tres vías',
  objective: 'Fusiona feature en main creando un commit de merge.',
  theory: [
    'Cuando main y feature avanzaron por caminos distintos, Git no puede simplemente mover un puntero: crea un commit de "merge" con dos padres, uno por cada rama.',
    'Ese commit de merge es lo que marca el punto donde ambas historias se juntan.',
  ],
  setup: [
    ...BASE_SETUP,
    'git switch -c feature',
    'touch feat.txt',
    'echo "feature" > feat.txt',
    'git add feat.txt',
    'git commit -m "Feature work"',
    'git switch main',
    'touch main2.txt',
    'echo "main change" > main2.txt',
    'git add main2.txt',
    'git commit -m "Main work"',
    'git switch feature',
  ],
  solution: ['git switch main', 'git merge feature -m "Merge feature"'],
  goals: [
    { id: 'merged', label: 'Fusiona feature en main', check: (s) => isMerged(s, 'main', 'feature') },
    { id: 'merge-commit', label: 'El resultado es un commit de merge (dos padres)', check: (s) => isMergeCommit(s, 'main') },
  ],
  hints: ['Vuelve a main: `git switch main`.', 'Como las ramas divergieron, el merge creará un commit nuevo: `git merge feature -m "Merge feature"`.'],
};

export const merge03ResolverConflicto: LevelDef = {
  id: 'merge-03-resolver-conflicto',
  world: 3,
  order: 3,
  version: 1,
  title: 'Resolver un conflicto',
  objective: 'Fusiona feature, resuelve el conflicto y confirma el resultado.',
  theory: [
    'Un conflicto aparece cuando ambas ramas cambiaron el mismo archivo de forma distinta: Git no puede decidir solo cuál versión usar.',
    'Debes editar el archivo para dejarlo como quieres, marcarlo con `git add` y confirmar con `git commit` para terminar la fusión.',
  ],
  setup: [
    'git init',
    'touch conflicto.txt',
    'echo "linea original" > conflicto.txt',
    'git add conflicto.txt',
    'git commit -m "Base"',
    'git switch -c feature',
    'echo "cambio de feature" > conflicto.txt',
    'git add conflicto.txt',
    'git commit -m "Cambio en feature"',
    'git switch main',
    'echo "cambio de main" > conflicto.txt',
    'git add conflicto.txt',
    'git commit -m "Cambio en main"',
  ],
  solution: ['git merge feature', 'echo "cambio resuelto" > conflicto.txt', 'git add conflicto.txt', 'git commit --no-edit'],
  goals: [
    { id: 'no-conflict', label: 'Resuelve el conflicto', check: (s) => !hasConflict(s) },
    { id: 'merged', label: 'Completa la fusión', check: (s) => isMerged(s, 'main', 'feature') },
  ],
  hints: ['Empieza la fusión: `git merge feature` (marcará conflicto en conflicto.txt).', 'Edita el archivo para dejar el contenido final, por ejemplo con `echo "cambio resuelto" > conflicto.txt`.', 'Márcalo resuelto y confirma: `git add conflicto.txt` y `git commit --no-edit`.'],
};

export const merge04AbortarMerge: LevelDef = {
  id: 'merge-04-abortar-merge',
  world: 3,
  order: 4,
  version: 1,
  title: 'Abortar una fusión',
  objective: 'Cancela una fusión conflictiva que quedó a medias.',
  theory: ['Si un merge con conflictos te agarra desprevenido, `git merge --abort` cancela todo y te deja exactamente como estabas antes de intentarlo.', 'Es la salida de emergencia: no se pierde nada ni queda nada a medio resolver.'],
  setup: [
    'git init',
    'touch conflicto.txt',
    'echo "linea original" > conflicto.txt',
    'git add conflicto.txt',
    'git commit -m "Base"',
    'git switch -c feature',
    'echo "cambio de feature" > conflicto.txt',
    'git add conflicto.txt',
    'git commit -m "Cambio en feature"',
    'git switch main',
    'echo "cambio de main" > conflicto.txt',
    'git add conflicto.txt',
    'git commit -m "Cambio en main"',
    'git merge feature',
  ],
  solution: ['git merge --abort'],
  goals: [
    { id: 'no-op', label: 'No queda ninguna fusión en curso', check: (s) => !opInProgress(s) },
    { id: 'not-merged', label: 'feature no quedó fusionada', check: (s) => !isMerged(s, 'main', 'feature') },
  ],
  hints: ['Ya hay un merge con conflicto en curso.', 'Cancélalo con `git merge --abort`.'],
};

export const merge05NoFf: LevelDef = {
  id: 'merge-05-no-ff',
  world: 3,
  order: 5,
  version: 1,
  title: 'Forzar un commit de merge',
  objective: 'Fusiona feature con --no-ff aunque un fast-forward sería posible.',
  theory: ['`--no-ff` obliga a Git a crear un commit de merge incluso cuando un fast-forward alcanzaría.', 'Algunos equipos lo prefieren porque deja un punto visible en la historia de cuándo se integró cada rama.'],
  setup: [...BASE_SETUP, 'git switch -c feature', 'touch b.txt', 'echo "feature" > b.txt', 'git add b.txt', 'git commit -m "Feature work"'],
  solution: ['git switch main', 'git merge feature --no-ff -m "Merge (no-ff)"'],
  goals: [
    { id: 'merged', label: 'Fusiona feature en main', check: (s) => isMerged(s, 'main', 'feature') },
    { id: 'merge-commit', label: 'El resultado es un commit de merge, no un fast-forward', check: (s) => isMergeCommit(s, 'main') },
  ],
  hints: ['Vuelve a main: `git switch main`.', 'Fusiona forzando un commit de merge: `git merge feature --no-ff -m "Merge (no-ff)"`.'],
};

export const w3Levels: LevelDef[] = [merge01FastForward, merge02TresVias, merge03ResolverConflicto, merge04AbortarMerge, merge05NoFf];
