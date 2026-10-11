// World 6 — Pull requests y colaboración (level-curriculum spec "World 6 —
// Pull requests y colaboración"). tasks.md Phase 7, 7.6. Goals here read
// `s.hosting` (via `prWith`/`prCommentCount`), not a typed git command — per
// the spec's own "World 6 goal validated via hosting state, not a typed
// command" scenario.
import { prWith, prCommentCount, isPushed, commitCount } from '../../engine/lessons/predicates';
import type { LevelDef } from '../../engine/lessons/types';

const SETUP_WITH_OPEN_FEATURE = [
  'git init',
  'touch a.txt',
  'echo "base" > a.txt',
  'git add a.txt',
  'git commit -m "Base"',
  'git push -u origin main',
  'git switch -c feature',
  'touch feat.txt',
  'echo "feature work" > feat.txt',
  'git add feat.txt',
  'git commit -m "Feature work"',
  'git push -u origin feature',
];

export const pr01AbrirPr: LevelDef = {
  id: 'pr-01-abrir-pr',
  world: 6,
  order: 1,
  version: 1,
  title: 'Abre tu primer PR',
  objective: 'Abre un pull request de feature hacia main.',
  theory: ['Un pull request pide revisar e integrar los commits de una rama (ya subida a origin) en otra.', 'Debes pushear la rama primero: un PR siempre apunta a ramas que ya existen en origin.'],
  setup: SETUP_WITH_OPEN_FEATURE,
  solution: [{ pr: 'create', input: { source: 'feature', target: 'main', title: 'Mi primer PR', body: '' } }],
  goals: [{ id: 'opened', label: 'Abre el PR de feature hacia main', check: (s) => prWith(s, 'feature', 'main', 'open') !== null }],
  hints: ['feature ya está pusheada: ahora abre el PR desde la vista de hosting.', 'Origen: feature. Destino: main.'],
  hosting: true,
};

export const pr02ComentarPr: LevelDef = {
  id: 'pr-02-comentar-pr',
  world: 6,
  order: 2,
  version: 1,
  title: 'Deja feedback',
  objective: 'Comenta en el PR ya abierto.',
  theory: ['Los comentarios en un PR permiten discutir el código antes de fusionarlo.', 'Cualquiera con acceso al PR puede añadir comentarios en su línea de tiempo.'],
  setup: [...SETUP_WITH_OPEN_FEATURE, { pr: 'create', input: { source: 'feature', target: 'main', title: 'Mi PR', body: '' } }],
  solution: [{ pr: 'comment', id: 1, body: 'Se ve bien' }],
  goals: [{ id: 'commented', label: 'Deja al menos un comentario', check: (s) => prCommentCount(s, 'feature', 'main') >= 1 }],
  hints: ['Abre el PR y escribe un comentario desde la vista de hosting.'],
  hosting: true,
};

export const pr03ActualizarRama: LevelDef = {
  id: 'pr-03-actualizar-rama',
  world: 6,
  order: 3,
  version: 1,
  title: 'Actualizar la rama de un PR',
  objective: 'Agrega un commit a feature y súbelo para actualizar el PR.',
  theory: ['Un PR siempre muestra el estado actual de su rama de origen: si sigues pusheando commits a feature, el PR se actualiza solo.', 'No hace falta cerrarlo y volver a abrirlo.'],
  setup: [...SETUP_WITH_OPEN_FEATURE, { pr: 'create', input: { source: 'feature', target: 'main', title: 'Mi PR', body: '' } }],
  solution: ['touch extra.txt', 'echo "mas cambios" > extra.txt', 'git add extra.txt', 'git commit -m "Más cambios"', 'git push'],
  goals: [
    { id: 'more-commits', label: 'Agrega un commit nuevo a feature', check: (s) => commitCount(s, 'feature') === commitCount(s, 'main') + 2 },
    { id: 'pushed', label: 'Sube el cambio a origin', check: (s) => isPushed(s, 'feature') },
    { id: 'still-open', label: 'El PR sigue abierto', check: (s) => prWith(s, 'feature', 'main', 'open') !== null },
  ],
  hints: ['Crea el archivo y confírmalo: `touch extra.txt`, `echo "mas cambios" > extra.txt`, `git add extra.txt`, `git commit -m "Más cambios"`.', 'No olvides subirlo: `git push`.'],
  // The level's goal is tied to an existing PR (prWith/isPushed), so the
  // player needs the hosting view open to see the PR it's about — even
  // though the reference solution itself is plain git commands with no
  // hosting-typed step.
  hosting: true,
};

export const pr04FusionarPr: LevelDef = {
  id: 'pr-04-fusionar-pr',
  world: 6,
  order: 4,
  version: 1,
  title: 'Fusiona el PR',
  objective: 'Fusiona el PR con la estrategia "Squash".',
  theory: ['"Squash" combina todos los commits de la rama de origen en uno solo sobre la rama destino.', 'Es una forma común de mantener la historia de main limpia, con un commit por PR.'],
  setup: [...SETUP_WITH_OPEN_FEATURE, { pr: 'create', input: { source: 'feature', target: 'main', title: 'Mi PR', body: '' } }],
  solution: [{ pr: 'merge', id: 1, strategy: 'squash', deleteBranch: true }],
  goals: [{ id: 'merged', label: 'Fusiona el PR con squash', check: (s) => prWith(s, 'feature', 'main', 'merged') !== null }],
  hints: ['Abre el PR y elige fusionar.', 'Selecciona la estrategia "Squash".'],
  hosting: true,
};

export const pr05CerrarYReabrirPr: LevelDef = {
  id: 'pr-05-cerrar-y-reabrir-pr',
  world: 6,
  order: 5,
  version: 1,
  title: 'Ciclo de vida de un PR',
  objective: 'Cierra el PR y vuelve a abrirlo.',
  theory: ['Un PR se puede cerrar sin fusionar (por ejemplo, si cambias de idea) y reabrir más tarde si vuelve a ser relevante.', 'Cerrarlo no borra nada: la rama y sus commits siguen intactos.'],
  setup: [...SETUP_WITH_OPEN_FEATURE, { pr: 'create', input: { source: 'feature', target: 'main', title: 'Otra rama', body: '' } }],
  solution: [{ pr: 'close', id: 1 }, { pr: 'reopen', id: 1 }],
  goals: [
    { id: 'reopened', label: 'Cierra el PR y vuelve a abrirlo', check: (s) => prWith(s, 'feature', 'main', 'open')?.timeline.some((t) => t.kind === 'reopened') ?? false },
  ],
  hints: ['Primero cierra el PR desde la vista de hosting.', 'Luego vuelve a abrirlo (reopen).'],
  hosting: true,
};

export const w6Levels: LevelDef[] = [pr01AbrirPr, pr02ComentarPr, pr03ActualizarRama, pr04FusionarPr, pr05CerrarYReabrirPr];
