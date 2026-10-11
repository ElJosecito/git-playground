// World 1 — Básicos (level-curriculum spec "World 1 — Básicos (commits,
// staging, history)"). basics-01/02 were pulled forward in Batch 3; Phase 7
// (tasks.md 7.1) adds basics-03..05 here.
import { commitCount, fileTracked, fileStaged, fileContent, headMessage } from '../../engine/lessons/predicates';
import type { LevelDef } from '../../engine/lessons/types';

export const basics01PrimerCommit: LevelDef = {
  id: 'basics-01-primer-commit',
  world: 1,
  order: 1,
  version: 1,
  title: 'Tu primer commit',
  objective: 'Inicializa el repositorio y haz tu primer commit.',
  theory: [
    'Un repositorio Git empieza con `git init`: a partir de ahí, Git vigila los cambios en la carpeta.',
    'Un commit es una foto del estado de tus archivos en un momento dado. `git add` prepara los cambios y `git commit` los guarda en la historia.',
  ],
  setup: [],
  solution: ['git init', 'touch README.md', 'echo "Mi proyecto" > README.md', 'git add README.md', 'git commit -m "Primer commit"'],
  goals: [
    { id: 'inited', label: 'Inicializa el repositorio', check: (s) => s.inited },
    { id: 'commit', label: 'Haz al menos un commit', check: (s) => commitCount(s) >= 1 },
  ],
  hints: [
    'Primero inicializa el repositorio con `git init`.',
    'Crea el archivo con `touch README.md` y escribe contenido con `echo "Mi proyecto" > README.md`.',
    'Agrega el archivo al stage con `git add README.md` y confirma con `git commit -m "Primer commit"`.',
  ],
};

export const basics02StatusYStage: LevelDef = {
  id: 'basics-02-status-y-stage',
  world: 1,
  order: 2,
  version: 1,
  title: 'Status y stage',
  objective: 'Agrega a.txt al stage y confírmalo con un commit.',
  theory: [
    '`git status` te muestra qué archivos están en el stage y cuáles no.',
    '`git add` mueve cambios al área de stage; un commit solo guarda lo que está en el stage en ese momento.',
  ],
  setup: ['git init', 'touch a.txt', 'echo "contenido" > a.txt'],
  solution: ['git add a.txt', 'git commit -m "Agrega a.txt"'],
  goals: [
    { id: 'tracked', label: 'Agrega a.txt al stage y confírmalo', check: (s) => fileTracked(s, 'a.txt') },
    { id: 'commit', label: 'Crea un commit con el cambio', check: (s) => commitCount(s) >= 1 },
  ],
  hints: ['Agrega a.txt al stage con `git add a.txt`.', 'Confirma el cambio con `git commit -m "Agrega a.txt"`.'],
};

export const basics03DeshacerStage: LevelDef = {
  id: 'basics-03-deshacer-stage',
  world: 1,
  order: 3,
  version: 1,
  title: 'Deshacer el stage',
  objective: 'Saca secreto.txt del área de stage sin perder el archivo.',
  theory: [
    'Agregar un archivo al stage con `git add` no es definitivo: `git restore --staged <archivo>` lo saca del stage otra vez.',
    'El archivo sigue existiendo en tu carpeta de trabajo; solo deja de estar "preparado" para el próximo commit.',
  ],
  setup: ['git init', 'touch secreto.txt', 'echo "clave=1234" > secreto.txt', 'git add secreto.txt'],
  solution: ['git restore --staged secreto.txt'],
  goals: [
    { id: 'unstaged', label: 'Sácalo del área de stage', check: (s) => !fileStaged(s, 'secreto.txt') },
    { id: 'kept', label: 'Conserva el archivo', check: (s) => fileContent(s, 'secreto.txt') !== undefined },
  ],
  hints: [
    'El archivo ya está en el stage: usa `git restore` con la opción `--staged`.',
    'Ejemplo: `git restore --staged secreto.txt`.',
  ],
};

export const basics04MoverYBorrar: LevelDef = {
  id: 'basics-04-mover-y-borrar',
  world: 1,
  order: 4,
  version: 1,
  title: 'Renombrar y limpiar',
  objective: 'Renombra viejo.txt a nuevo.txt y elimina obsoleto.txt.',
  theory: [
    '`git mv <origen> <destino>` renombra un archivo rastreado y deja el cambio listo para el commit.',
    '`git rm <archivo>` elimina un archivo rastreado tanto de tu carpeta como del próximo commit.',
  ],
  setup: [
    'git init',
    'touch viejo.txt',
    'echo "contenido" > viejo.txt',
    'touch obsoleto.txt',
    'echo "basura" > obsoleto.txt',
    'git add viejo.txt obsoleto.txt',
    'git commit -m "Setup"',
  ],
  solution: ['git mv viejo.txt nuevo.txt', 'git rm obsoleto.txt', 'git commit -m "Limpieza"'],
  goals: [
    { id: 'renamed', label: 'Renombra viejo.txt a nuevo.txt', check: (s) => fileTracked(s, 'nuevo.txt') && !fileTracked(s, 'viejo.txt') },
    { id: 'removed', label: 'Elimina obsoleto.txt', check: (s) => !fileTracked(s, 'obsoleto.txt') },
  ],
  hints: [
    'Renombra con `git mv viejo.txt nuevo.txt`.',
    'Borra el archivo que ya no sirve con `git rm obsoleto.txt`.',
    'No olvides confirmar los cambios con `git commit -m "Limpieza"`.',
  ],
};

export const basics05CorregirMensaje: LevelDef = {
  id: 'basics-05-corregir-mensaje',
  world: 1,
  order: 5,
  version: 1,
  title: 'Corregir el último commit',
  objective: 'Corrige el mensaje del último commit sin crear uno nuevo.',
  theory: [
    '`git commit --amend` reemplaza el último commit por uno nuevo con el mismo contenido (o el que indiques).',
    'Con `-m "nuevo mensaje"` solo cambias el texto, sin tocar los archivos confirmados.',
  ],
  setup: ['git init', 'touch a.txt', 'echo "contenido" > a.txt', 'git add a.txt', 'git commit -m "mensaje equivocado"'],
  solution: ['git commit --amend -m "Commit corregido"'],
  goals: [{ id: 'amended', label: 'Corrige el mensaje a "Commit corregido"', check: (s) => commitCount(s) === 1 && headMessage(s) === 'Commit corregido' }],
  hints: ['Usa `git commit --amend` para reemplazar el último commit.', 'Pásale el nuevo mensaje: `git commit --amend -m "Commit corregido"`.'],
};

export const w1Levels: LevelDef[] = [basics01PrimerCommit, basics02StatusYStage, basics03DeshacerStage, basics04MoverYBorrar, basics05CorregirMensaje];
