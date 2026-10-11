# Verification Report: Landing Page + Levels

**Change**: landing-and-levels
**Mode**: Strict TDD
**Verdict**: PASS WITH WARNINGS
**Date**: 2026-10-11

## Completeness

| Metric | Value |
|---|---|
| Tasks total | 36 (across 9 phases) |
| Tasks complete | 35 |
| Tasks incomplete | 1 (9.2 — human-only manual QA walkthrough, tracked, not a code defect) |

## Build & Tests Execution (re-run live, not trusted from apply-progress)

- `npm test` (TZ=UTC): **1180/1180 passed**, 131 files. 0 failures.
- `npx tsc -b --noEmit`: **clean**, exit 0.
- `npm run build`: **succeeds**. Entry chunk 235.04kB gzip 74.01kB; engine chunk 67.48kB gzip 24.03kB unreachable from entry; HeroDemo 3.85kB JS.
- `npm run check:chunks`: `"OK. Entry chunk graph (2 file(s)) excludes PlaygroundShell, LevelShell, and the engine."`
- `git diff HEAD --stat -- src/engine/commands src/engine/__tests__/parity design-handoff`: **EMPTY** — confirmed engine/parity untouched for the entire change.

## Spec Compliance Matrix (all 8 capability domains)

| Requirement | Test/Evidence | Result |
|---|---|---|
| app-routing: hash routes, redirects, locked guard, code-splitting | hashLocation/useHashRoute/App/LevelRoute tests + check:chunks | ✅ COMPLIANT |
| landing-page: engine-driven hero, reduced motion, sections, theme, code-split isolation | HeroDemo.test.tsx (18 assertions, 0 mocks, real GitEngine replay), reducedMotion branch read in source | ✅ COMPLIANT |
| level-engine: LevelDef model, deterministic setup replay, supported-commands-only, pure predicates (never read `t`) | predicates.ts header + source-read confirms no `.t` access; steps.test.ts determinism test strips `t` | ✅ COMPLIANT |
| level-player: shared components, live checklist, hints/solution=1hint cap, budget counter (read-only free, failures count, PR/resolver/editor-save count), reset, success screen | counting.ts source-read: `countsLiveAction` counts hosting regardless of `ok`, counts all `ui` actions; LevelShell/SuccessDialog tests | ✅ COMPLIANT |
| level-progress: star rule (hint caps 1★), linear unlock, `gitpg:levels:v1` schema, snapshot version discard, reset scope | stars.ts/unlocks.ts source-read matches spec precedence exactly; schema.ts/store.ts `snapshotFor` discards on version mismatch | ✅ COMPLIANT |
| level-curriculum: 30 levels (5×6 worlds), supported-commands-only, solvability contract, no literal hashes | grep confirms 30 unique level ids, no hex-hash literals in catalog; `catalog.solvability.test.ts` proves not-solved-after-setup / solved-after-solution for all 30 via `describe.each` | ✅ COMPLIANT (see WARNING on table-text drift below) |
| app-shell delta: debug API rebinds per shell, theme global across routes, `gitpg:v1` schema tolerant of pre-hosting saves, route switch owns root | debugApi.ts guarded cleanup (`only deletes if still its own api`), ThemeProvider passthrough-nesting design confirmed in source | ✅ COMPLIANT |
| hosting-web-view delta: PR-action completion callback, sandbox unaffected | already satisfied by Batch-1 `onAction`; `HostingView.tsx` confirmed untouched | ✅ COMPLIANT |

**Compliance summary**: 8/8 domains compliant; 0 UNTESTED/FAILING scenarios found.

## TDD Compliance

| Check | Result | Details |
|---|---|---|
| TDD Evidence reported | ✅ | Full TDD Cycle Evidence tables present for all 5 batches in apply-progress.md |
| All tasks have tests | ✅ | 35/35 completed sub-tasks have corresponding test files |
| RED confirmed (tests exist) | ✅ | Spot-checked HeroDemo, predicates, counting, catalog solvability, schema/store/stars/unlocks — all exist and pass |
| GREEN confirmed (tests pass) | ✅ | 1180/1180 passing on live re-run |
| Triangulation adequate | ✅ | Solvability suite triangulates per-level (30× not-solved/solved pairs); counting.ts 22 cases |
| Safety Net for modified files | ✅ | PlaygroundShell/.graphMemo/.theme tests reported green before+after every batch, confirmed unedited |

**TDD Compliance**: 6/6 checks passed

## Assertion Quality

Spot-checked HeroDemo.test.tsx (18 expects, 0 mocks, real-engine replay cross-check), catalog.solvability.test.ts (per-level describe.each, no ghost loops over possibly-empty collections — `levels` is asserted non-empty first), counting.test.ts. No tautologies found via repo-wide grep (`expect(true).toBe(true)` etc: 0 hits). No test file found with assertions limited to `toBeInTheDocument()` only.

**Assertion quality**: ✅ No CRITICAL issues found in sampled files.

## Issues Found

### CRITICAL
None. All automated gates (tests, typecheck, build, chunk-boundary check, engine/parity non-modification) pass on live re-execution, not just on trust of the apply-progress report.

### WARNING

1. **Task 9.2 (manual QA walkthrough) is the one open checkbox.** `openspec/changes/landing-and-levels/qa-checklist.md` is explicitly `[ ]` NOT RUN — a legitimate human-only gate (scroll behavior, real browser hover/focus-preload, mobile viewport, reduced-motion OS setting, World 6 PR flows) that automation cannot certify. All automatable items it would have covered are otherwise green. Recommend: archive should either wait for a human sign-off on this checklist, or the user explicitly accepts archiving with this gate still open.

2. **Level-curriculum spec table text has drifted from the shipped catalog for 3 levels, without an inline resolution note** (unlike the project's own established pattern of annotating resolved deviations in the spec body — see the field-names/stars-precedence/schema-shape notes already present in `sdd/landing-and-levels/spec`):
   - `merge-03-resolver-conflicto`: spec table solution says `edit conflicto.txt (resuelto)`; shipped solution is `echo "cambio resuelto" > conflicto.txt` — functionally equivalent (same end state, `edit` can't be replayed headlessly per design), but text doesn't match.
   - `merge-04-abortar-merge`: spec table says setup = "mismo setup que merge-03" and solution = `merge feature; merge --abort` (2 steps, budget 4); shipped code moved `git merge feature` into `setup` itself and solution is just `['git merge --abort']` (1 step, derived budget 3). Objective text also changed from "Inicia el merge conflictivo y cancélalo" to "Cancela una fusión conflictiva que quedó a medias".
   - `undo-04-guardar-con-stash`: spec table setup = "cambios sin confirmar en el working dir" (not yet stashed) and solution = `stash; stash pop` (2 steps, budget 4); shipped code moved `git stash` into setup, solution is just `['git stash pop']` (1 step, derived budget 3).

   These are intentional, documented-in-apply-progress fixes for a real test-design problem (final-state-only predicates can't distinguish "never attempted" from "attempted and undid it" — `merge --abort`/`stash pop` leave no durable trace). The fix is sound and the Per-Level Solvability Contract (setup-not-solved / solution-solves) is verified for all 30 levels including these 3. **Judgment: acceptable engineering tradeoff, but spec text should be synced before archive** to avoid the curriculum table becoming a stale planning artifact.

   - `branching-02-cambiar-ramas`: added a `visitedBranch` reflog-based goal check beyond the literal scenario text (`currentBranch==='main'`) to stop the exercise being trivially satisfied by never leaving `main`. This strengthens rather than weakens the spec intent — acceptable, no spec text update strictly required, but worth a one-line annotation for consistency.
   - `pr-03-actualizar-rama`: `hosting` flag intentionally left `false`/unset even though it's a World-6/PR-flavored level, because its actual solution is pure git commands (push to update an already-open PR) — consistent with the level-engine spec's own rule ("hosting flag iff a hosting step exists"), not a drift.

3. **Design-only (non-spec) deviations, all judged acceptable, no spec breakage**:
   - Hero's `h1` keeps literal "Git Playground" instead of a creative headline — forced by a genuine, confirmed pre-existing assertion in `src/__tests__/App.test.tsx` (`findByRole('heading', {level:1, name:'Git Playground'})`), not an excuse. Pitch copy moved to a tagline paragraph. No spec requirement mandates specific h1 text.
   - `global.css`'s `body { overflow:hidden }` rescoped to `body:not([data-scroll-page])`, with `LandingRoute` toggling the attribute — confirmed present in source. Flagged by apply-progress itself as untestable by jsdom; correctly carried into `qa-checklist.md` item "page scrolls normally" for human verification.
   - `colors.ts` hand-copies `PALETA` hex values instead of importing (required by landing's eager/code-split-isolation constraint) — verified byte-identical to `src/engine/constants.ts`'s `PALETA` today; no automated test ties them together, so future engine palette changes could silently drift. Low risk, reasonable follow-up only.
   - No dynamic "Continuar en modo libre" CTA label — deferred because implementing it would require editing a pinned approval test for a cosmetic nicety; spec's literal Core Sections requirement (two fixed CTAs) is still met.
   - HeroDemo pause/resume restarts a char/hold's full delay rather than preserving exact elapsed time — decorative-content simplification, not spec-mandated precision.

### SUGGESTION

- Add an automated check (unit test) that fails if `src/components/landing/colors.ts`'s `LANDING_ACCENTS` diverges from `src/engine/constants.ts`'s `PALETA`, to catch future silent drift given the intentional code-split duplication.
- Once a human signs off `qa-checklist.md`, flip tasks.md's 9.2 checkbox and append the sign-off date/tester to the checklist file for an auditable record before archive.

## Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| Hand-rolled hash router, no dependency added | ✅ Yes | `hashLocation.ts`/`useHashRoute.ts`, no router package in package.json diff |
| Landing eager, Playground/LevelMap/Level lazy | ✅ Yes | check:chunks passes; source confirms React.lazy boundaries in routes.ts |
| App-level ThemeProvider with passthrough nesting | ✅ Yes | Confirmed in ThemeProvider.tsx source; PlaygroundShell wraps itself defensively |
| Guarded debug-API cleanup (only delete if still own instance) | ✅ Yes | Confirmed verbatim in debugApi.ts |
| Budget always derived, never stored | ✅ Yes | `computeBudget(level) = countSteps(solution) + slack`; no `budget` field on LevelDef |
| Predicates never read commit `t` | ✅ Yes | Source-read confirms, 0 `.t` accesses in predicates.ts |
| PR action reporting at handler layer, HostingView untouched | ✅ Yes | Confirmed via Batch-1/Batch-3 cross-check in apply-progress; file not in git diff |

## Verdict

**PASS WITH WARNINGS** — all automated evidence (1180/1180 tests, clean typecheck, successful build, green chunk-boundary check, zero engine/parity modification) was independently re-executed and confirmed, not taken on trust. All 8 capability-spec domains are compliant with no UNTESTED/FAILING scenarios. The only blocking-for-archive item is the still-open human manual-QA gate (task 9.2); three level-curriculum spec-table rows have accepted-but-undocumented text drift from the shipped catalog that should be synced into the spec before archive for documentation hygiene, though they do not represent a functional spec violation.
