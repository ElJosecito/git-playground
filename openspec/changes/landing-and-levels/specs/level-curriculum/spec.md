# level-curriculum Specification

## Purpose

The concrete content contract: 6 worlds, 30 levels, each scoped strictly to
commands the engine actually supports (`src/engine/commands/index.ts`'s
`GIT` table, the shell file commands, and the hosting facade). This spec
pins id, Spanish title/objective, a setup sketch, checklist goals (as
predicate descriptions), a reference-solution sketch, and the command
budget for every level, plus the solvability test contract. Per-level
command budget = reference solution's counted length (non-read-only
commands/PR actions) + 2 slack, unless noted.

## Requirements

### Requirement: Supported-Command Scope

Every level's `setupScript`/`solutionScript` MUST reference only: `init,
status, add, restore, rm, mv, commit(-m/-a/-am/--amend/--no-edit), clean`;
`branch(-d/-D/-m/-M), switch(-c), checkout(-b/--), tag(-d)`; `log(--oneline/
--graph/--all), show, diff(--staged), reflog`; `merge(--no-ff/--abort/
--continue), rebase(--abort/--continue, never -i), cherry-pick, revert`;
`reset(--soft/--mixed/--hard), stash(push/pop/apply/drop/list/-u)`;
`remote(-v), push(-u/-f), fetch, pull(--rebase)`; shell `touch, echo, edit,
rm, mv`; and hosting actions `createPullRequest, commentPullRequest,
closePullRequest, reopenPullRequest, mergePullRequest`.

#### Scenario: A NO-map subcommand fails the catalog check
- GIVEN a level script referencing `rebase -i`, `clone`, or any other
  `unsupported.ts` `NO`-map subcommand
- WHEN the solvability suite replays it through `GitEngine.ejecutar`
- THEN the real dispatch rejects it and that level's test fails

### Requirement: Per-Level Solvability Contract

For every `LevelDef` in the catalog: replaying `setupScript` from `vacio()`
MUST leave `validar(estado).done === false`; replaying `solutionScript`
from that same seeded state MUST leave `validar(estado).done === true`.

#### Scenario: Setup alone never pre-solves a level (templated per level)
- GIVEN `setupScript` replayed from `vacio()`
- WHEN `validar(estado)` is evaluated
- THEN `done` is `false`

#### Scenario: The reference solution always solves its level (templated per level)
- GIVEN `solutionScript` replayed after `setupScript`
- WHEN `validar(estado)` is evaluated
- THEN `done` is `true`, and for World 6 levels the matching PR reaches the
  required status (`open`/`merged`) via the stated hosting actions

### Requirement: World 1 — Básicos (commits, staging, history)

| id | Título | Objetivo | Setup (sketch) | Checklist | Solución (sketch) | Budget |
|---|---|---|---|---|---|---|
| `basics-01-primer-commit` | Tu primer commit | Inicializa el repo y haz tu primer commit | vacío | `inited && commitCount>=1` | `init; touch README.md; echo "Mi proyecto">README.md; add README.md; commit -m "Primer commit"` | 7 |
| `basics-02-status-y-stage` | Status y stage | Agrega `a.txt` al stage y confírmalo | init; touch/echo `a.txt` (sin commit) | `fileTracked('a.txt') && commitCount>=1` | `add a.txt; commit -m "Agrega a.txt"` | 4 |
| `basics-03-deshacer-stage` | Deshacer el stage | Saca `secreto.txt` del stage sin perderlo | init; touch/echo `secreto.txt`; `add secreto.txt` | `!fileStaged('secreto.txt') && fileExists('secreto.txt')` | `restore --staged secreto.txt` | 3 |
| `basics-04-mover-y-borrar` | Renombrar y limpiar | Renombra `viejo.txt`→`nuevo.txt` y elimina `obsoleto.txt` | init + commit con `viejo.txt`,`obsoleto.txt` tracked | `fileTracked('nuevo.txt') && !fileTracked('viejo.txt') && !fileTracked('obsoleto.txt')` | `mv viejo.txt nuevo.txt; rm obsoleto.txt; commit -m "Limpieza"` | 5 |
| `basics-05-corregir-mensaje` | Corregir el último commit | Corrige el mensaje del último commit con `--amend` | init + 1 commit con mensaje erróneo | `commitCount===1 && lastCommitMsg==="Commit corregido"` | `commit --amend -m "Commit corregido"` | 3 |

#### Scenario: `basics-01-primer-commit` setup is not pre-solved
- GIVEN the empty `vacio()` state (this level's setup is empty)
- WHEN `validar(estado)` runs
- THEN `done` is `false` because `inited` is `false`

### Requirement: World 2 — Ramas (branch, switch, checkout, cherry-pick)

| id | Título | Objetivo | Setup (sketch) | Checklist | Solución (sketch) | Budget |
|---|---|---|---|---|---|---|
| `branching-01-crear-rama` | Crea una rama | Crea y cambia a la rama `feature` | 1 commit en main | `currentBranch==='feature' && branchExists('feature')` | `switch -c feature` | 3 |
| `branching-02-cambiar-ramas` | Cambiar entre ramas | Cambia a `feature2` y luego vuelve a `main` | 1 commit; rama `feature2` creada | `currentBranch==='main'` | `switch feature2; switch main` | 4 |
| `branching-03-commits-en-rama` | Commits en una rama | Haz un commit en `bugfix` sin tocar `main` | rama `bugfix` creada y activa | `currentBranch==='bugfix' && commitCount(bugfix)===commitCount(main)+1 && head(main) unchanged` | `touch fix.txt; echo fix>fix.txt; add fix.txt; commit -m "Corrige bug"` | 6 |
| `branching-04-eliminar-rama` | Borrar una rama fusionada | Borra la rama `temporal` ya fusionada | `temporal` mergeado en main, HEAD en main | `!branchExists('temporal')` | `branch -d temporal` | 3 |
| `branching-05-traer-un-commit` | Traer un commit con cherry-pick | Lleva el commit de `hotfix` a `main` sin fusionar toda la rama | main + rama `hotfix` con 1 commit extra | `fileContentMatches && commitCount(main)===prev+1 && !isMerged(main,'hotfix')` | `switch main; cherry-pick <hash-hotfix>` | 4 |

### Requirement: World 3 — Merge y conflictos

| id | Título | Objetivo | Setup (sketch) | Checklist | Solución (sketch) | Budget |
|---|---|---|---|---|---|---|
| `merge-01-fast-forward` | Fusión fast-forward | Fusiona `feature` en `main` | `feature` adelante de `main`, sin divergencia | `isMerged(main,'feature')` | `switch main; merge feature` | 4 |
| `merge-02-tres-vias` | Fusión de tres vías | Fusiona `feature` en `main` creando un commit de merge | `main`/`feature` divergen en archivos distintos | `isMerged(main,'feature') && lastCommit(main).parents.length===2` | `switch main; merge feature -m "Merge feature"` | 4 |
| `merge-03-resolver-conflicto` | Resolver un conflicto | Fusiona `feature`, resuelve el conflicto y confirma | `main`/`feature` editan la misma línea | `!hasConflict(estado) && isMerged(main,'feature')` | `merge feature; echo "cambio resuelto" > conflicto.txt; add conflicto.txt; commit --no-edit` | 6 |
| `merge-04-abortar-merge` | Abortar una fusión | Mismos pasos de conflicto que `merge-03`, PERO el setup ya deja el `merge feature` en curso (conflictivo) | `main`/`feature` editan la misma línea; setup ya ejecutó `merge feature` | `op===null && !isMerged(main,'feature') && workingTreeMatchesPreMerge` | `merge --abort` | 3 |
| `merge-05-no-ff` | Forzar un commit de merge | Fusiona con `--no-ff` aunque sea fast-forward posible | `feature` adelante de `main`, ff posible | `isMerged(main,'feature') && lastCommit(main).parents.length===2` | `switch main; merge feature --no-ff -m "Merge (no-ff)"` | 4 |

(Implementation note, review-fixes batch: `merge-03`'s reference solution
uses `echo "cambio resuelto" > conflicto.txt` to overwrite the conflicted
file rather than a literal `edit` step — the player may resolve the same
way, or via the conflict-resolver UI, or via `edit`; all three produce the
same checklist-satisfying state. `merge-04`'s `setup` was moved to already
include the `git merge feature` step that starts the conflict — matching
how the level actually opens (mid-conflict, ready to abort) — so its
`solution` is just `git merge --abort` and its budget is DERIVED
(`countSteps(solution) + slack` = `1 + 2` = `3`), down from the earlier
sketch's `4`. `git merge --abort` leaves no durable trace in the resulting
`RepoState` (no commit, no ref move, no file left behind) — there's
nothing for a 1-step reference solution to "lose" by not re-describing the
already-done setup step.)

### Requirement: World 4 — Deshacer cambios

| id | Título | Objetivo | Setup (sketch) | Checklist | Solución (sketch) | Budget |
|---|---|---|---|---|---|---|
| `undo-01-reset-soft` | Deshacer sin perder el stage | Deshaz el último commit dejando los cambios en stage | 2 commits, el último con error | `commitCount===1 && indexDiffersFromHead` | `reset --soft HEAD~1` | 3 |
| `undo-02-reset-mixed` | Sacar del stage con reset | Saca `a.txt` del stage sin perder sus cambios | 1 commit; `a.txt` editado y en stage | `!fileStaged('a.txt') && fileContentUnchanged('a.txt')` | `reset a.txt` | 3 |
| `undo-03-reset-hard` | Descartar un commit malo | Elimina por completo el último commit y sus cambios | 2 commits buenos + 1 commit malo | `commitCount===2 && head===secondCommitHash` | `reset --hard HEAD~1` | 3 |
| `undo-04-guardar-con-stash` | Recuperar cambios guardados | Recupera los cambios que guardaste con stash | 1 commit; setup ya ejecutó `git stash` sobre un cambio sucio | `stashListEmpty && workingDirMatchesOriginalDirty` | `stash pop` | 3 |
| `undo-05-revertir-commit` | Revertir un commit público | Deshaz el efecto del 2º commit sin reescribir historia | 3 commits en main | `commitCount===4 && fileContentMatches(preChange)` | `revert <hash-commit-2>` | 3 |

(Implementation note, review-fixes batch: `undo-04`'s `setup` was moved to
already include the `git stash` step — matching how the level actually
opens (a stash already sitting in the drawer, ready to pop) — so its
`solution` is just `git stash pop` and its budget is DERIVED
(`countSteps(solution) + slack` = `1 + 2` = `3`), down from the earlier
sketch's `4`. `git stash pop` leaves no durable trace beyond restoring the
working-tree edit and emptying the stash list — there's nothing for a
1-step reference solution to "lose" by not re-describing the already-done
setup step.)

### Requirement: World 5 — Remoto (push, fetch, pull, rebase, tag)

| id | Título | Objetivo | Setup (sketch) | Checklist | Solución (sketch) | Budget |
|---|---|---|---|---|---|---|
| `remote-01-primer-push` | Tu primer push | Sube `main` a `origin` y fija el upstream | 1 commit, sin upstream | `isPushed('main') && hasUpstream('main')` | `push -u origin main` | 3 |
| `remote-02-fetch-y-pull` | Ponerte al día | Tu rama local quedó atrás de `origin`; actualízala | 2 commits, pusheados; luego `reset --hard HEAD~1` local | `localHead===originMainHead` | `fetch; pull` | 4 |
| `remote-03-rebase-sobre-main` | Rebase lineal | Haz rebase de `feature` sobre `main` para una historia lineal | `main`/`feature` divergen desde una base común | `isAnc(mainHead, featureHead) && commitCountPreserved` | `switch feature; rebase main` | 4 |
| `remote-04-pull-rebase` | Pull con rebase | Un commit local diverge del origin; tráelo con rebase, no con merge | push commit A; push commit B; `reset --hard` a A local; nuevo commit C local | `isAnc(originMainHead, head) && noMergeCommitIntroduced` | `pull --rebase` | 3 |
| `remote-05-etiquetar-version` | Etiquetar una versión | Crea el tag `v1.0` en el último commit | 1+ commits en main | `tagExists('v1.0')` | `tag v1.0` | 3 |

### Requirement: World 6 — Pull requests y colaboración

World 6 goals are validated through hosting state (PR status/comments),
reached via the simulated web view's actions, not typed git commands.

| id | Título | Objetivo | Setup (sketch) | Checklist | Solución (sketch) | Budget |
|---|---|---|---|---|---|---|
| `pr-01-abrir-pr` | Abre tu primer PR | Abre un PR de `feature` hacia `main` | rama `feature` con 1 commit, pusheada con `-u` | `prExists(source:'feature',target:'main',status:'open')` | hosting: `createPullRequest(feature→main, "Mi primer PR")` | 3 |
| `pr-02-comentar-pr` | Deja feedback | Comenta en el PR abierto | PR abierto ya creado en setup | `prView(id).comments.length>=1` | hosting: `commentPullRequest(id, "Se ve bien")` | 3 |
| `pr-03-actualizar-rama` | Actualizar la rama de un PR | Agrega un commit a `feature` y empújalo para actualizar el PR | PR abierto para `feature→main` | `prCommitCount(id) > setupCommitCount && prStatus(id)==='open'` | `touch extra.txt; echo extra>extra.txt; add extra.txt; commit -m "Más cambios"; push` | 7 |
| `pr-04-fusionar-pr` | Fusiona el PR | Fusiona el PR con la estrategia "Squash" | PR abierto y fusionable (`clean`) | `prStatus(id)==='merged'` | hosting: `mergePullRequest(id, {strategy:'squash', deleteBranch:true})` | 3 |
| `pr-05-cerrar-y-reabrir-pr` | Ciclo de vida de un PR | Cierra el PR y vuelve a abrirlo | PR abierto para una rama distinta | `prStatus(id)==='open' && prWasClosedThenReopened(id)` | hosting: `closePullRequest(id); reopenPullRequest(id)` | 4 |

#### Scenario: World 6 goal validated via hosting state, not a typed command
- GIVEN `pr-04-fusionar-pr`'s setup state
- WHEN the solution's `mergePullRequest` hosting action is dispatched
- THEN `validar` reads `estado.hosting` and reports `done: true` with no
  git command having been required for the merge itself
