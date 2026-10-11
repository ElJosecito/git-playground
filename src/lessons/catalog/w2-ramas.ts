// World 2 — Ramas (level-curriculum spec "World 2 — Ramas (branch, switch,
// checkout, cherry-pick)"). tasks.md Phase 7, 7.2.
import { currentBranch, branchExists, commitCount, visitedBranch, isMerged } from '../../engine/lessons/predicates';
import { treeOf } from '../../engine/refs';
import type { LevelDef } from '../../engine/lessons/types';

export const branching01CrearRama: LevelDef = {
  id: 'branching-01-crear-rama',
  world: 2,
  order: 1,
  version: 1,
  title: 'Crea una rama',
  objective: 'Crea la rama feature y cámbiate a ella.',
  theory: [
    'Una rama es solo un puntero a un commit. `git switch -c <nombre>` crea la rama y te mueve a ella en un solo paso.',
    'Trabajar en una rama nueva te deja experimentar sin tocar main.',
  ],
  setup: ['git init', 'touch a.txt', 'echo "contenido" > a.txt', 'git add a.txt', 'git commit -m "Primer commit"'],
  solution: ['git switch -c feature'],
  goals: [{ id: 'on-feature', label: 'Crea y cámbiate a la rama feature', check: (s) => currentBranch(s) === 'feature' && branchExists(s, 'feature') }],
  hints: ['Usa `git switch` con la opción `-c` para crear y cambiar en un solo comando.', 'Ejemplo: `git switch -c feature`.'],
};

export const branching02CambiarRamas: LevelDef = {
  id: 'branching-02-cambiar-ramas',
  world: 2,
  order: 2,
  version: 1,
  title: 'Cambiar entre ramas',
  objective: 'Visita la rama feature2 y luego vuelve a main.',
  theory: ['`git switch <rama>` cambia tu carpeta de trabajo al contenido de esa rama.', 'Puedes moverte entre ramas libremente mientras no tengas cambios sin confirmar que se pisarían.'],
  setup: ['git init', 'touch a.txt', 'echo "contenido" > a.txt', 'git add a.txt', 'git commit -m "Primer commit"', 'git branch feature2'],
  solution: ['git switch feature2', 'git switch main'],
  goals: [{ id: 'back-on-main', label: 'Visita feature2 y vuelve a main', check: (s) => currentBranch(s) === 'main' && visitedBranch(s, 'feature2') }],
  hints: ['Primero cámbiate a feature2 con `git switch feature2`.', 'Luego vuelve con `git switch main`.'],
};

export const branching03CommitsEnRama: LevelDef = {
  id: 'branching-03-commits-en-rama',
  world: 2,
  order: 3,
  version: 1,
  title: 'Commits en una rama',
  objective: 'Haz un commit en bugfix sin tocar main.',
  theory: ['Los commits que haces en una rama solo avanzan el puntero de esa rama; las demás ramas no se enteran.', 'Por eso main se queda exactamente igual mientras trabajas en bugfix.'],
  setup: ['git init', 'touch a.txt', 'echo "contenido" > a.txt', 'git add a.txt', 'git commit -m "Primer commit"', 'git switch -c bugfix'],
  solution: ['touch fix.txt', 'echo "fix" > fix.txt', 'git add fix.txt', 'git commit -m "Corrige bug"'],
  goals: [
    { id: 'on-bugfix', label: 'Trabaja sobre la rama bugfix', check: (s) => currentBranch(s) === 'bugfix' },
    { id: 'bugfix-ahead', label: 'Haz un commit nuevo en bugfix', check: (s) => commitCount(s, 'bugfix') === commitCount(s, 'main') + 1 },
    { id: 'main-untouched', label: 'main sigue con un solo commit', check: (s) => commitCount(s, 'main') === 1 },
  ],
  hints: ['Crea el archivo: `touch fix.txt` y `echo "fix" > fix.txt`.', 'Agrégalo y confírmalo: `git add fix.txt` y `git commit -m "Corrige bug"`.'],
};

export const branching04EliminarRama: LevelDef = {
  id: 'branching-04-eliminar-rama',
  world: 2,
  order: 4,
  version: 1,
  title: 'Borrar una rama fusionada',
  objective: 'Borra la rama temporal, que ya fue fusionada en main.',
  theory: ['`git branch -d <rama>` solo borra una rama si ya está completamente fusionada en otra parte — así nunca pierdes commits por accidente.', 'Para forzar el borrado de una rama no fusionada se usa `-D`.'],
  setup: [
    'git init',
    'touch a.txt',
    'echo "contenido" > a.txt',
    'git add a.txt',
    'git commit -m "Primer commit"',
    'git switch -c temporal',
    'touch t.txt',
    'echo "trabajo" > t.txt',
    'git add t.txt',
    'git commit -m "Trabajo en temporal"',
    'git switch main',
    'git merge temporal',
  ],
  solution: ['git branch -d temporal'],
  goals: [{ id: 'deleted', label: 'Borra la rama temporal', check: (s) => !branchExists(s, 'temporal') }],
  hints: ['La rama ya está fusionada: puedes borrarla sin forzar.', 'Usa `git branch -d temporal`.'],
};

export const branching05TraerUnCommit: LevelDef = {
  id: 'branching-05-traer-un-commit',
  world: 2,
  order: 5,
  version: 1,
  title: 'Traer un commit con cherry-pick',
  objective: 'Lleva el commit de hotfix a main sin fusionar toda la rama.',
  theory: [
    '`git cherry-pick <rama-o-hash>` copia un commit concreto y lo aplica sobre tu rama actual, sin traer el resto de la historia de esa rama.',
    'Nunca uses hashes "a mano": en el simulador puedes referenciar el commit por el nombre de la rama que lo tiene como punta.',
  ],
  setup: [
    'git init',
    'touch base.txt',
    'echo "base" > base.txt',
    'git add base.txt',
    'git commit -m "Base"',
    'git switch -c hotfix',
    'touch fix.txt',
    'echo "parche" > fix.txt',
    'git add fix.txt',
    'git commit -m "Hotfix urgente"',
  ],
  solution: ['git switch main', 'git cherry-pick hotfix'],
  goals: [
    { id: 'picked', label: 'Trae el contenido de fix.txt a main', check: (s) => treeOf(s, s.branches.main ?? null)['fix.txt'] === 'parche' },
    { id: 'count', label: 'main avanza exactamente un commit', check: (s) => commitCount(s, 'main') === 2 },
    { id: 'not-merged', label: 'No fusiones toda la rama hotfix', check: (s) => !isMerged(s, 'main', 'hotfix') },
  ],
  hints: ['Primero vuelve a main: `git switch main`.', 'Luego trae solo ese commit: `git cherry-pick hotfix` (usa el nombre de la rama, no un hash).'],
};

export const w2Levels: LevelDef[] = [branching01CrearRama, branching02CambiarRamas, branching03CommitsEnRama, branching04EliminarRama, branching05TraerUnCommit];
