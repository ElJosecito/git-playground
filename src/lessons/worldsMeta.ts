// Catalog-independent world/level metadata for the landing page's
// `WorldsPreview` (design.md UI: "WorldsPreview from worldsMeta.ts (no
// catalog import)." / landing-page spec "Code-Split Isolation": the landing
// page's module graph must not pull in the engine or the level engine).
// This is a small, hand-authored mirror of the real catalog's ids/titles —
// `src/lessons/__tests__/worldsMeta.test.ts` is the one place allowed to
// cross-check it against `src/lessons/catalog` (a test file is never
// bundled into the landing chunk), so it can never silently drift.
import { WORLD_NAMES } from './worldNames';

export interface WorldLevelMeta {
  id: string;
  title: string;
}

export interface WorldMeta {
  world: number;
  name: string;
  levels: WorldLevelMeta[];
}

export const WORLDS_META: WorldMeta[] = [
  {
    world: 1,
    name: WORLD_NAMES[1]!,
    levels: [
      { id: 'basics-01-primer-commit', title: 'Tu primer commit' },
      { id: 'basics-02-status-y-stage', title: 'Status y stage' },
      { id: 'basics-03-deshacer-stage', title: 'Deshacer el stage' },
      { id: 'basics-04-mover-y-borrar', title: 'Renombrar y limpiar' },
      { id: 'basics-05-corregir-mensaje', title: 'Corregir el último commit' },
    ],
  },
  {
    world: 2,
    name: WORLD_NAMES[2]!,
    levels: [
      { id: 'branching-01-crear-rama', title: 'Crea una rama' },
      { id: 'branching-02-cambiar-ramas', title: 'Cambiar entre ramas' },
      { id: 'branching-03-commits-en-rama', title: 'Commits en una rama' },
      { id: 'branching-04-eliminar-rama', title: 'Borrar una rama fusionada' },
      { id: 'branching-05-traer-un-commit', title: 'Traer un commit con cherry-pick' },
    ],
  },
  {
    world: 3,
    name: WORLD_NAMES[3]!,
    levels: [
      { id: 'merge-01-fast-forward', title: 'Fusión fast-forward' },
      { id: 'merge-02-tres-vias', title: 'Fusión de tres vías' },
      { id: 'merge-03-resolver-conflicto', title: 'Resolver un conflicto' },
      { id: 'merge-04-abortar-merge', title: 'Abortar una fusión' },
      { id: 'merge-05-no-ff', title: 'Forzar un commit de merge' },
    ],
  },
  {
    world: 4,
    name: WORLD_NAMES[4]!,
    levels: [
      { id: 'undo-01-reset-soft', title: 'Deshacer sin perder el stage' },
      { id: 'undo-02-reset-mixed', title: 'Sacar del stage con reset' },
      { id: 'undo-03-reset-hard', title: 'Descartar un commit malo' },
      { id: 'undo-04-guardar-con-stash', title: 'Recuperar cambios guardados' },
      { id: 'undo-05-revertir-commit', title: 'Revertir un commit público' },
    ],
  },
  {
    world: 5,
    name: WORLD_NAMES[5]!,
    levels: [
      { id: 'remote-01-primer-push', title: 'Tu primer push' },
      { id: 'remote-02-fetch-y-pull', title: 'Ponerte al día' },
      { id: 'remote-03-rebase-sobre-main', title: 'Rebase lineal' },
      { id: 'remote-04-pull-rebase', title: 'Pull con rebase' },
      { id: 'remote-05-etiquetar-version', title: 'Etiquetar una versión' },
    ],
  },
  {
    world: 6,
    name: WORLD_NAMES[6]!,
    levels: [
      { id: 'pr-01-abrir-pr', title: 'Abre tu primer PR' },
      { id: 'pr-02-comentar-pr', title: 'Deja feedback' },
      { id: 'pr-03-actualizar-rama', title: 'Actualizar la rama de un PR' },
      { id: 'pr-04-fusionar-pr', title: 'Fusiona el PR' },
      { id: 'pr-05-cerrar-y-reabrir-pr', title: 'Ciclo de vida de un PR' },
    ],
  },
];
