// World 4 — Deshacer cambios (level-curriculum spec "World 4 — Deshacer
// cambios"). tasks.md Phase 7, 7.4.
import { commitCount, headMessage, fileStaged, fileContent, stashCount } from '../../engine/lessons/predicates';
import type { LevelDef } from '../../engine/lessons/types';

export const undo01ResetSoft: LevelDef = {
  id: 'undo-01-reset-soft',
  world: 4,
  order: 1,
  version: 1,
  title: 'Deshacer sin perder el stage',
  objective: 'Deshaz el último commit dejando sus cambios listos en el stage.',
  theory: [
    '`git reset --soft <ref>` mueve HEAD (y la rama) a otro commit, pero no toca el stage ni la carpeta de trabajo.',
    'El resultado: el commit "desaparece" de la historia, pero sus cambios siguen preparados para volver a confirmarse.',
  ],
  setup: ['git init', 'touch a.txt', 'echo "version buena" > a.txt', 'git add a.txt', 'git commit -m "Commit bueno"', 'echo "error" > a.txt', 'git add a.txt', 'git commit -m "Commit con error"'],
  solution: ['git reset --soft HEAD~1'],
  goals: [
    { id: 'undone', label: 'Deshaz el último commit', check: (s) => commitCount(s) === 1 },
    { id: 'staged', label: 'Los cambios quedan en el stage', check: (s) => fileStaged(s, 'a.txt') },
  ],
  hints: ['Usa `git reset` apuntando al commit anterior.', 'Con `--soft` el stage no se toca: `git reset --soft HEAD~1`.'],
};

export const undo02ResetMixed: LevelDef = {
  id: 'undo-02-reset-mixed',
  world: 4,
  order: 2,
  version: 1,
  title: 'Sacar del stage con reset',
  objective: 'Saca a.txt del stage sin perder la edición en tu carpeta.',
  theory: ['`git reset <archivo>` saca ese archivo del stage (modo "mixed" por defecto), pero no toca tu carpeta de trabajo.', 'Es similar a `git restore --staged`, con una sintaxis más corta.'],
  setup: ['git init', 'touch a.txt', 'echo "original" > a.txt', 'git add a.txt', 'git commit -m "Commit inicial"', 'echo "editado" > a.txt', 'git add a.txt'],
  solution: ['git reset a.txt'],
  goals: [
    { id: 'unstaged', label: 'Sácalo del stage', check: (s) => !fileStaged(s, 'a.txt') },
    { id: 'edit-kept', label: 'Conserva la edición en tu carpeta', check: (s) => fileContent(s, 'a.txt') === 'editado' },
  ],
  hints: ['`git reset a.txt` saca el archivo del stage sin descartar tu edición.'],
};

export const undo03ResetHard: LevelDef = {
  id: 'undo-03-reset-hard',
  world: 4,
  order: 3,
  version: 1,
  title: 'Descartar un commit malo',
  objective: 'Elimina por completo el último commit y sus cambios.',
  theory: ['`git reset --hard <ref>` mueve HEAD y además reescribe el stage y la carpeta de trabajo para que coincidan exactamente con ese commit.', 'Es destructivo: cualquier cambio posterior se pierde, así que úsalo solo cuando estés seguro.'],
  setup: [
    'git init',
    'touch a.txt',
    'echo "v1" > a.txt',
    'git add a.txt',
    'git commit -m "Commit bueno 1"',
    'echo "v2" > a.txt',
    'git add a.txt',
    'git commit -m "Commit bueno 2"',
    'echo "v3 mala" > a.txt',
    'git add a.txt',
    'git commit -m "Commit malo"',
  ],
  solution: ['git reset --hard HEAD~1'],
  goals: [{ id: 'reverted', label: 'Vuelve exactamente al commit anterior', check: (s) => commitCount(s) === 2 && headMessage(s) === 'Commit bueno 2' }],
  hints: ['El commit anterior tenía buen contenido.', 'Usa `git reset --hard HEAD~1` para descartar todo lo de después.'],
};

export const undo04GuardarConStash: LevelDef = {
  id: 'undo-04-guardar-con-stash',
  world: 4,
  order: 4,
  version: 1,
  title: 'Recuperar cambios guardados',
  objective: 'Recupera los cambios que guardaste con stash.',
  theory: ['`git stash` guarda tus cambios sin confirmar en un cajón aparte y deja tu carpeta limpia.', '`git stash pop` los trae de vuelta y los quita del cajón.'],
  setup: ['git init', 'touch a.txt', 'echo "base" > a.txt', 'git add a.txt', 'git commit -m "Commit inicial"', 'echo "cambio sucio" > a.txt', 'git stash'],
  solution: ['git stash pop'],
  goals: [
    { id: 'popped', label: 'Vacía el stash', check: (s) => stashCount(s) === 0 },
    { id: 'restored', label: 'Recupera el cambio sin confirmar', check: (s) => fileContent(s, 'a.txt') === 'cambio sucio' },
  ],
  hints: ['Tus cambios están guardados en el stash.', 'Tráelos de vuelta con `git stash pop`.'],
};

export const undo05RevertirCommit: LevelDef = {
  id: 'undo-05-revertir-commit',
  world: 4,
  order: 5,
  version: 1,
  title: 'Revertir un commit público',
  objective: 'Deshaz el efecto de un commit riesgoso sin reescribir la historia.',
  theory: ['`git revert <ref>` crea un commit NUEVO que aplica el cambio contrario, en vez de borrar el commit original.', 'Es la forma segura de deshacer algo que ya compartiste con otras personas: nadie pierde commits.'],
  setup: [
    'git init',
    'touch a.txt',
    'echo "v1" > a.txt',
    'git add a.txt',
    'git commit -m "Commit 1"',
    'echo "v2 cambio arriesgado" > a.txt',
    'git add a.txt',
    'git commit -m "Commit 2 riesgoso"',
    'touch b.txt',
    'echo "algo mas" > b.txt',
    'git add b.txt',
    'git commit -m "Commit 3"',
  ],
  solution: ['git revert HEAD~1'],
  goals: [
    { id: 'new-commit', label: 'Crea un commit nuevo que revierte el cambio', check: (s) => commitCount(s) === 4 },
    { id: 'content-restored', label: 'a.txt vuelve a su contenido original', check: (s) => fileContent(s, 'a.txt') === 'v1' },
  ],
  hints: ['El commit riesgoso es el segundo: cuéntalo desde HEAD con `~`.', 'Usa `git revert HEAD~1` (no reescribe nada, solo agrega un commit nuevo).'],
};

export const w4Levels: LevelDef[] = [undo01ResetSoft, undo02ResetMixed, undo03ResetHard, undo04GuardarConStash, undo05RevertirCommit];
