# QA Checklist: Simulated Hosting Pull Requests

**Status: NOT RUN.** This is a human gate — a maintainer must walk through every
step below in a real browser before this change is considered verified.
Automated coverage (`npm test`, `npx tsc -b --noEmit`, `npm run build`) is
green as of the apply batch that wrote this checklist, but none of that
substitutes for the manual pass described here.

## Setup

1. `npm run dev`, open the app, confirm the example repo loads (README.md, two commits on `main`).
2. Open devtools → Network tab (or just watch the terminal) to confirm no hosting action ever produces terminal output.

## 1. Push → create a PR

- [ ] `git checkout -b feature`
- [ ] `echo "cambio" > notas.txt`, `git add notas.txt`, `git commit -m "feature"`
- [ ] `git push -u origin feature`
- [ ] Click "Pull requests (0)" in the ActionBar → web view opens on the list route, URL bar shows `github.com/tu/proyecto/pulls`.
- [ ] Click "Nuevo pull request" → URL bar shows `.../pulls/new`.
- [ ] Try submitting with `source` left blank or pointing at a branch never pushed (e.g. `no-existe`) → inline error shows the `git push -u origin <rama>` hint, no PR created, no terminal output.
- [ ] Fill `Comparar: feature`, `Base: main`, a title → submit → navigates back to the list, new PR appears with an "Abierto" badge and a success toast (no terminal line).
- [ ] Click the remote box in the graph (instead of the ActionBar button) from the list route → same web view opens.

## 2. PR detail — tabs and comments

- [ ] Click the new PR's row → detail opens, URL bar shows `.../pulls/<id>`.
- [ ] Switch to "Commits" → shows the `feature` commit(s) ahead of `main`.
- [ ] Switch to "Cambios" → shows `notas.txt` as a changed file and a readable diff.
- [ ] Switch back to "Conversación" → shows the "Abrió este pull request." entry.
- [ ] Post a comment → appears attributed to "Tú", textarea clears, no terminal output.
- [ ] Try posting an empty/whitespace-only comment → inline rejection, no new timeline entry.

## 3. Conflict blocks every strategy

- [ ] On `main`, edit the same line of `notas.txt` differently and commit (simulate via `git checkout main`, edit, commit — or use "Simular cambio de un compañero" if it touches the same file).
- [ ] Reopen the PR detail → merge box is **hidden entirely**, replaced by a conflict explanation naming the conflicting file(s) and telling you to resolve locally + push + retry.
- [ ] Confirm none of the 3 strategies are reachable (no select, no merge button) while conflicts persist.

## 4. Outdated warns but never blocks

- [ ] Advance `main` with an unrelated, non-conflicting commit (different file) after the PR was opened.
- [ ] Reopen the PR detail → merge box is still visible and usable, with a non-blocking warning banner naming `main` and suggesting a local merge/rebase + push.
- [ ] Confirm all 3 strategies remain selectable despite the warning.

## 5. Rebase-only conflict disables only "Rebase and merge"

- [ ] Set up a case where the 3-way base merge is clean but replaying `feature`'s commits individually onto `main` would conflict (e.g. multiple incremental edits to the same region, clean when squashed together but not commit-by-commit).
- [ ] Merge box shows a visible hint explaining the rebase-specific conflict.
- [ ] "Rebase and merge" option is disabled in the strategy select; "Crear merge commit" and "Squash and merge" remain enabled and clickable.

## 6. Merge via all 3 strategies (use 3 separate PRs, one per strategy)

For each strategy (`Crear merge commit`, `Squash and merge`, `Rebase and merge`):

- [ ] Create a fresh, clean (non-conflicting, non-outdated) PR.
- [ ] Open its detail, select the strategy, optionally check "Eliminar rama".
- [ ] Click "Fusionar pull request" → success toast appears (no terminal output); PR detail reflects `status: merged`.
- [ ] If "Eliminar rama" was checked, confirm the source branch no longer appears as an origin branch option when creating a new PR.
- [ ] Confirm the local repo's `main` branch does NOT move yet (the toast should say your local repo doesn't know about it until you `git fetch`/`git pull`).

## 7. Fetch brings the merge home

- [ ] After merging, run `git fetch` in the terminal → confirm `origin/main` updates (and the merge/squash/rebase commit becomes visible once you merge or pull it locally).
- [ ] Run `git pull` (or `git merge origin/main`) → local `main` picks up the merged commit.

## 8. Close / reopen

- [ ] On an open PR, click "Cerrar pull request" → status flips to "Cerrado" (no terminal output, toast confirms).
- [ ] Click "Reabrir pull request" → status flips back to "Abierto".
- [ ] Delete the PR's source branch from origin (e.g. merge another PR with "Eliminar rama" checked, or manually via a teammate-simulated push that removes it) while the PR is open, then run any command → PR auto-closes with "La rama `<source>` fue eliminada" explanation, and the "Reabrir pull request" button is hidden (cannot reopen until the branch exists again).

## 9. No terminal output / toast-vs-inline sanity pass

- [ ] Re-check every action performed above: successful hosting actions never print a terminal line (only a toast); failed hosting actions never print a terminal line either (only an inline message in the originating form/view).
- [ ] Confirm all visible hosting copy is in Spanish (buttons, badges, warnings, errors).

## Sign-off

- [ ] Tester name/date:
- [ ] Browser(s) tested:
- [ ] Issues found (list or "None"):
