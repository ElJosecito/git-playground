// World 5 — Remoto (level-curriculum spec "World 5 — Remoto (push, fetch,
// pull, rebase, tag)"). tasks.md Phase 7, 7.5.
import { isPushed, upstreamOf, branchAt, remoteBranchAt, isMerged, isLinear, remoteIsAncestorOfLocal, tagAt } from '../../engine/lessons/predicates';
import type { LevelDef } from '../../engine/lessons/types';

export const remote01PrimerPush: LevelDef = {
  id: 'remote-01-primer-push',
  world: 5,
  order: 1,
  version: 1,
  title: 'Tu primer push',
  objective: 'Sube main a origin y fija el upstream.',
  theory: ['`git push -u origin <rama>` sube tus commits al remoto y además "enlaza" tu rama local con la de origin.', 'Una vez enlazada, un simple `git push` (sin argumentos) sabe a dónde ir.'],
  setup: ['git init', 'touch a.txt', 'echo "contenido" > a.txt', 'git add a.txt', 'git commit -m "Primer commit"'],
  solution: ['git push -u origin main'],
  goals: [
    { id: 'pushed', label: 'Sube main a origin', check: (s) => isPushed(s, 'main') },
    { id: 'upstream', label: 'Fija el upstream', check: (s) => upstreamOf(s, 'main') === 'main' },
  ],
  hints: ['Usa `git push` con `-u` para fijar el upstream en el mismo paso.', 'Ejemplo: `git push -u origin main`.'],
};

export const remote02FetchYPull: LevelDef = {
  id: 'remote-02-fetch-y-pull',
  world: 5,
  order: 2,
  version: 1,
  title: 'Ponerte al día',
  objective: 'Tu rama local quedó atrás de origin: actualízala.',
  theory: ['`git fetch` descarga lo nuevo de origin sin tocar tus ramas locales.', '`git pull` hace lo mismo y además fusiona esos cambios en tu rama actual.'],
  setup: [
    'git init',
    'touch a.txt',
    'echo "v1" > a.txt',
    'git add a.txt',
    'git commit -m "Commit 1"',
    'git push -u origin main',
    'echo "v2" > a.txt',
    'git add a.txt',
    'git commit -m "Commit 2"',
    'git push',
    'git reset --hard HEAD~1',
  ],
  solution: ['git fetch', 'git pull'],
  goals: [{ id: 'up-to-date', label: 'Tu main local queda igual que origin/main', check: (s) => branchAt(s, 'main') === remoteBranchAt(s, 'main') }],
  hints: ['Primero mira qué hay de nuevo: `git fetch`.', 'Luego tráelo a tu rama: `git pull`.'],
};

export const remote03RebaseSobreMain: LevelDef = {
  id: 'remote-03-rebase-sobre-main',
  world: 5,
  order: 3,
  version: 1,
  title: 'Rebase lineal',
  objective: 'Haz rebase de feature sobre main para una historia lineal.',
  theory: ['`git rebase <rama>` reaplica los commits de tu rama actual encima de la punta de otra rama, como si los hubieras escrito ahí desde el principio.', 'El resultado es una historia sin commits de merge: totalmente lineal.'],
  setup: [
    'git init',
    'touch base.txt',
    'echo "base" > base.txt',
    'git add base.txt',
    'git commit -m "Base"',
    'git switch -c feature',
    'touch feat.txt',
    'echo "feature" > feat.txt',
    'git add feat.txt',
    'git commit -m "Feature work"',
    'git switch main',
    'touch main2.txt',
    'echo "main work" > main2.txt',
    'git add main2.txt',
    'git commit -m "Main work"',
    'git switch feature',
  ],
  solution: ['git switch feature', 'git rebase main'],
  goals: [
    { id: 'rebased', label: 'feature queda sobre la punta de main', check: (s) => isMerged(s, 'feature', 'main') },
    { id: 'linear', label: 'La historia queda lineal, sin commits de merge', check: (s) => isLinear(s, 'feature') },
  ],
  hints: ['Asegúrate de estar en feature: `git switch feature`.', 'Reaplica tus commits sobre main: `git rebase main`.'],
};

export const remote04PullRebase: LevelDef = {
  id: 'remote-04-pull-rebase',
  world: 5,
  order: 4,
  version: 1,
  title: 'Pull con rebase',
  objective: 'Un commit local diverge del origin: tráelo con rebase, no con merge.',
  theory: ['`git pull --rebase` descarga los cambios de origin y reaplica tus commits locales encima, en vez de crear un commit de merge.', 'Mantiene la historia lineal incluso cuando trabajas en equipo.'],
  setup: [
    'git init',
    'touch a.txt',
    'echo "A" > a.txt',
    'git add a.txt',
    'git commit -m "Commit A"',
    'git push -u origin main',
    'echo "B" > a.txt',
    'git add a.txt',
    'git commit -m "Commit B"',
    'git push',
    'git reset --hard HEAD~1',
    'echo "C" > a.txt',
    'git add a.txt',
    'git commit -m "Commit C local"',
  ],
  solution: ['git pull --rebase'],
  goals: [
    { id: 'rebased', label: 'Tu commit local queda sobre lo último de origin', check: (s) => remoteIsAncestorOfLocal(s, 'main') },
    { id: 'linear', label: 'No se crea un commit de merge', check: (s) => isLinear(s, 'main') },
  ],
  hints: ['Tu rama diverge de origin.', 'Usa `git pull --rebase` en vez de un pull normal.'],
};

export const remote05EtiquetarVersion: LevelDef = {
  id: 'remote-05-etiquetar-version',
  world: 5,
  order: 5,
  version: 1,
  title: 'Etiquetar una versión',
  objective: 'Crea el tag v1.0 en el último commit.',
  theory: ['Un tag es un puntero fijo a un commit concreto, pensado para marcar versiones (`v1.0`, `v2.0`...).', 'A diferencia de una rama, un tag normalmente no se mueve una vez creado.'],
  setup: ['git init', 'touch a.txt', 'echo "v1" > a.txt', 'git add a.txt', 'git commit -m "Primer commit"'],
  solution: ['git tag v1.0'],
  goals: [{ id: 'tagged', label: 'Crea el tag v1.0', check: (s) => tagAt(s, 'v1.0') !== null }],
  hints: ['Usa `git tag <nombre>` sobre el commit actual.', 'Ejemplo: `git tag v1.0`.'],
};

export const w5Levels: LevelDef[] = [remote01PrimerPush, remote02FetchYPull, remote03RebaseSobreMain, remote04PullRebase, remote05EtiquetarVersion];
