# Apply Progress: Landing Page + Levels

**Change**: landing-and-levels
**Mode**: Strict TDD
**Batches so far**: 1 (Phase 1+2), 2 (Phase 3+4, plus a theme-wiring fix — see below), 3 (Phase 5+6, plus a Phase-7 catalog skeleton — see below), 4 (Phase 7: full 30-level curriculum — see below)
**Test runner**: `npm test` (`cross-env TZ=UTC vitest run`)

## Completed Tasks

### Phase 1: Router & Shell Foundation
- [x] 1.1 RED: `parseRoute`/`hashLocation`/`useHashRoute` tests (deep link, back/forward, unknown-route/malformed-level-id redirects)
- [x] 1.2 GREEN: `src/app/router/{routes,hashLocation,useHashRoute}.ts`, `RouteFrame`, `Redirect`, `src/app/theme/{themeStorage,ThemeProvider}.ts`
- [x] 1.3 GREEN: `App.tsx` route switch — landing eager, Playground/LevelMap/Level routes lazy; no-hash = landing
- [x] 1.4 RED+GREEN: `scripts/check-chunks.mjs` + `check:chunks` script
- [x] 1.5 `npm test` + `npm run build` + `npm run check:chunks` — all green

### Phase 2: Workspace Extraction
- [x] 2.1 Safety net: `PlaygroundShell`/`PlaygroundShell.graphMemo` tests green before refactor (confirmed at 767/767 baseline)
- [x] 2.2 RED: `useGitPlayground` onAction/bootLines tests, guarded `debugApi` cleanup test, `ActionBar` showReset/homeHref tests
- [x] 2.3 GREEN: extracted `src/components/workspace/{useWorkspace,WorkspaceView}.tsx`; `PlaygroundShell` composes it (`LevelShell` doesn't exist yet — Phase 5)
- [x] 2.4 GREEN: `useGitPlayground.ts` onAction/bootLines option, `debugApi.ts` guarded cleanup, `ActionBar.tsx` homeHref/showReset
- [x] 2.5 `npm test` — original `PlaygroundShell`/`PlaygroundShell.graphMemo` test files pass **UNEDITED**

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `src/app/router/hashLocation.ts` | Created | Pure `parseRoute`/`buildHash`/`navigate`/`getHash`/`subscribeHash`/`getLastNavKind` — hand-rolled hash routing, no deps |
| `src/app/router/useHashRoute.ts` | Created | `useSyncExternalStore` over hashchange, cached snapshot per hash string |
| `src/app/router/routes.ts` | Created | `React.lazy` boundaries for Playground/LevelMap/Level routes + hover/focus preload fns |
| `src/app/router/RouteFrame.tsx` | Created | Per-route title/scroll/focus management (push=scroll-top, pop=restore scrollY, non-initial=focus `[data-route-focus]`) |
| `src/app/router/Redirect.tsx` | Created | Declarative `navigate(to, {replace:true})` on mount |
| `src/app/theme/themeStorage.ts` | Created | Theme-only RMW of `gitpg:v1` (`{theme}` when no record exists) |
| `src/app/theme/ThemeProvider.tsx` | Created | App-level theme context; nested providers are a transparent passthrough |
| `src/routes/LandingRoute.tsx` + `.module.css` | Created | Placeholder landing (Phase 8 replaces content) with 2 CTAs + hover/focus preload wiring |
| `src/routes/PlaygroundRoute.tsx` | Created | Lazy entry rendering the real `PlaygroundShell` (this is the actual sandbox, not a placeholder) |
| `src/routes/LevelMapRoute.tsx` | Created | **Placeholder** — Phase 6 replaces content |
| `src/routes/LevelRoute.tsx` | Created | **Placeholder** (accepts `id`) — Phase 5 replaces content |
| `src/App.tsx` | Modified | Route switch by hash; wraps everything in `ThemeProvider`; owns the scroll-position Map |
| `scripts/check-chunks.mjs` | Created | Reads `dist/.vite/manifest.json`, BFS over static `imports` from the entry, greps those files' content for engine/PlaygroundShell/LevelShell markers |
| `package.json` | Modified | Added `check:chunks` script |
| `vite.config.ts` | Modified | Added `build.manifest: true` |
| `vitest.config.ts` | Modified | dom project gained `src/app/**/*.test.tsx`, `src/routes/**/*.test.tsx`, `src/__tests__/**/*.test.tsx` |
| `src/test/setup.dom.ts` | Modified | Added a real no-op `window.scrollTo` stub (jsdom's default logs "Not implemented") |
| `src/app/debugApi.ts` | Modified | `installDebugApi`'s uninstaller now only deletes `target.GitPlayground` if it's still the api it installed (guarded cleanup) |
| `src/app/useGitPlayground.ts` | Modified | 3rd options param `{onAction, bootLines}`; `onAction` fires for `run()` (command), `hosting.*` (hosting), `resolveConflict`/`saveFile` (ui) |
| `src/components/ActionBar.tsx` | Modified | Added optional `showReset` (default `true`) and `homeHref` (renders an "Inicio" link when set) |
| `src/components/workspace/useWorkspace.ts` | Created | Extracted hook owning everything `PlaygroundShell` used to own except theme/persistence; new `hostingEnabled` option (default `true`) |
| `src/components/workspace/WorkspaceView.tsx` + `.module.css` | Created | Extracted presentational tree; `toolbar`/`emptyState`/`children` slots |
| `src/components/PlaygroundShell.tsx` | Modified | Now composes `useWorkspace` + `WorkspaceView`; keeps its own `useTheme`/`usePersistence` wiring |
| `src/components/PlaygroundShell.module.css` | Deleted | Its one rule (`.root`) moved to `WorkspaceView.module.css` |
| `src/app/__tests__/debugApi.test.ts` | Modified | +2 tests for guarded cleanup |
| `src/app/__tests__/useGitPlayground.test.ts` | Modified | +7 tests for `onAction`/`bootLines` |
| `src/components/__tests__/ActionBar.test.tsx` | Modified | +4 tests for `showReset`/`homeHref` |
| 9 new `__tests__` files under `src/app/router/`, `src/app/theme/`, `src/routes/`, `src/__tests__/`, `src/components/workspace/` | Created | See TDD Cycle Evidence below |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1/1.2 | `src/app/router/__tests__/hashLocation.test.ts` | Unit (node) | N/A (new) | ✅ Written | ✅ 16/16 | ✅ 8 scenarios + navKind | ➖ None needed |
| 1.2 | `src/app/router/__tests__/useHashRoute.test.ts` | Integration (dom, renderHook) | N/A (new) | ✅ Written | ✅ 4/4 | ✅ deep-link + back/forward | ➖ None needed |
| 1.2 | `src/app/router/__tests__/RouteFrame.test.tsx` | Integration (dom) | N/A (new) | ✅ Written | ✅ 5/5 | ✅ push/pop/initial cases | ➖ None needed |
| 1.2 | `src/app/router/__tests__/Redirect.test.tsx` | Integration (dom) | N/A (new) | ✅ Written | ✅ 2/2 | ➖ Single behavior | ➖ None needed |
| 1.2 | `src/app/router/__tests__/routes.test.ts` | Unit (node) | N/A (new) | ✅ Written | ✅ 3/3 | ➖ Structural (3 preload fns) | ➖ None needed |
| 1.2 | `src/app/theme/__tests__/themeStorage.test.ts` | Unit (node) | N/A (new) | ✅ Written | ✅ 8/8 | ✅ missing/existing/corrupt record | ➖ None needed |
| 1.2 | `src/app/theme/__tests__/ThemeProvider.test.tsx` | Integration (dom) | N/A (new) | ✅ Written | ✅ 5/5 | ✅ boot/toggle/nesting/no-provider | ➖ None needed |
| 1.3 | `src/routes/__tests__/LandingRoute.test.tsx` | Integration (dom) | N/A (new) | ✅ Written | ✅ 5/5 | ✅ 2 CTAs + preload | ➖ None needed |
| 1.3 | `src/__tests__/App.test.tsx` | Integration (dom) | N/A (new) | ✅ Written | ✅ 6/6 | ✅ 4 routes + unknown + theme | ➖ None needed |
| 1.4 | `scripts/check-chunks.mjs` (verified via build, not vitest) | Build-verification | N/A (new) | ✅ Confirmed failing against the OLD eager `App.tsx` (flagged `companero`/`mergePullRequest`/`createPullRequest`/`Reiniciar repositorio` in the single bundle) | ✅ Confirmed passing against the real lazy `App.tsx` | ➖ Single scenario (entry inclusion) | ➖ None needed |
| 2.2 | `src/app/__tests__/debugApi.test.ts` (2 new cases) | Unit (node) | ✅ 5/5 pre-existing | ✅ Written | ✅ 7/7 | ✅ guarded vs. unguarded cleanup | ➖ None needed |
| 2.2 | `src/components/__tests__/ActionBar.test.tsx` (4 new cases) | Integration (dom) | ✅ 8/8 pre-existing | ✅ Written | ✅ 12/12 | ✅ default/false/omitted/provided | ➖ None needed |
| 2.2 | `src/app/__tests__/useGitPlayground.test.ts` (7 new cases) | Unit (node, renderHook) | ✅ 46/46 pre-existing | ✅ Written | ✅ 53/53 | ✅ command/hosting×5/ui×2/bootLines | ➖ None needed |
| 2.3 | `src/components/__tests__/PlaygroundShell.test.tsx` + `.graphMemo.test.tsx` | Integration (dom) — **approval tests, read-only** | ✅ 11/11 before AND after the extraction, unedited | N/A (refactor, not new behavior) | ✅ 11/11 | N/A | ✅ Extracted `useWorkspace`/`WorkspaceView`, `PlaygroundShell` reduced to composition + theme/persistence wiring |
| 2.3/2.4 | `src/components/workspace/__tests__/useWorkspace.test.tsx` | Integration (dom, renderHook) | N/A (new) | ✅ Written; confirmed sensitive by temporarily reverting the `hostingEnabled` gate and observing 2/3 failures | ✅ 3/3 after restoring | ✅ enabled/disabled/independent-of-hasRemote | ➖ None needed |

### Test Summary
- **Total tests written this batch**: 71 (54 in Phase 1 + 17 in Phase 2: 2 debugApi + 4 ActionBar + 7 useGitPlayground + 3 useWorkspace, minus 1 double-counted RouteFrame nav test correction during RED fixes — exact delta: baseline 767 → final 837, **+70 net new tests**)
- **Total tests passing**: 837/837 (96 files)
- **Layers used**: Unit (node) ~8 files, Integration (dom) ~10 files
- **Approval tests** (refactoring): `PlaygroundShell.test.tsx` (9 cases) + `PlaygroundShell.graphMemo.test.tsx` (2 cases) — both green before AND after the `useWorkspace`/`WorkspaceView` extraction, unedited
- **Pure functions created**: `parseRoute`, `buildHash`, `getHash`, `navigate`, `subscribeHash`, `getLastNavKind` (hashLocation.ts), `readTheme`/`writeTheme` (themeStorage.ts)

## Verification (run at the end of this batch)

```
npm test        → 96 files, 837 tests, all passing
npx tsc -b --noEmit → clean, no errors
npm run build    → succeeds; entry 225.82kB, PlaygroundRoute chunk 150.45kB (split), LevelMapRoute/LevelRoute chunks <1kB each
npm run check:chunks → "OK. Entry chunk graph (2 file(s)) excludes PlaygroundShell, LevelShell, and the engine."
```

Baseline before this batch: 767/767 tests (86 files). All pre-existing tests remain green and **unedited** except the 3 files explicitly listed above (`debugApi.test.ts`, `useGitPlayground.test.ts`, `ActionBar.test.tsx`), which gained NEW test cases for NEW optional behavior (additive, backward compatible) — no existing test case in those files was modified or removed. `PlaygroundShell.test.tsx` and `PlaygroundShell.graphMemo.test.tsx` were not touched at all.

## Deviations from Design

1. **Locked-level guard deferred.** design.md's "locked guard" router scenario needs the level catalog (Phase 7) and progress/unlocks (Phase 4) to mean anything real. `parseRoute` in this batch only does SYNTACTIC parsing (4 routes + malformed-id/unknown-hash fallback); the semantic "unknown catalog id" / "locked world" checks are deferred to the real `LevelRoute` component in Phase 5/7, per design.md's own split ("unknown catalog id → Redirect inside LevelRoute").
2. **LevelMapRoute/LevelRoute are placeholders**, not the components tasks.md 5.2/6.2 will create — those tasks now REPLACE this batch's placeholder content rather than creating the files from scratch. Updated the note inline in both the engram and file tasks.md.
3. **Theme integration with PlaygroundShell is NOT done this batch.** design.md's "app-level ThemeProvider" + "PlaygroundShell self-wraps in one" decision is NOT wired into `PlaygroundShell` — `PlaygroundShell` still uses its own local `useTheme`/`usePersistence` exactly as before (unchanged), while `App.tsx` separately wraps the whole route switch in the NEW `ThemeProvider`. This means right now there are two independent theme mechanisms: the app-level `ThemeProvider` (drives landing/future level routes) and `PlaygroundShell`'s own `useTheme` (drives the sandbox, still writing the full `{repo,theme,hist}` triple via `usePersistence`). **Cross-route theme sync for `#/playground` is therefore not yet real** — toggling theme on the landing page won't visually update an already-mounted sandbox and vice versa until a later batch wires `PlaygroundShell` onto the shared context (tasks.md doesn't have an explicit task for this; flagging as a planning gap for whoever runs the next apply batch or `sdd-tasks` revision). No existing test caught this because `PlaygroundShell.test.tsx` only renders `PlaygroundShell` standalone.
4. **`useWorkspace`'s `hasRemote` was decoupled from `hostingEnabled`** (design.md doesn't spell out this distinction explicitly — it only says "graphHandlers memo (remote-box click only when hostingEnabled)"). The teammate ("Compañero") trigger depends only on `hasRemote`; a new `hostingVisible = hasRemote && hostingEnabled` field was added for the PR-specific gates (ActionBar's `showHosting`, the remote-box click). This keeps a hypothetical remote-only, non-hosting level (e.g. a World 5 level) able to show the teammate button without exposing PR UI. Verified via a dedicated test that would fail without this distinction.
5. **RouteFrame's scroll-position Map is owned by the caller (`App.tsx`), not by `RouteFrame` itself** — a simplification from design.md's phrasing ("restores scrollY from an in-memory Map") that keeps `RouteFrame` a pure, easily testable leaf component. `App.tsx` captures scrollY in a layout-effect cleanup when leaving each route and passes it back in as a `scrollY` prop on a `pop` navigation.
6. **`check-chunks.mjs` uses a content-marker scan, not a pure manifest-graph check.** The vite manifest's `imports`/`dynamicImports` graph only reveals chunk-to-chunk references — if code were (incorrectly) imported eagerly, Vite wouldn't create a separate chunk at all, so there'd be no manifest trace of what got inlined into the entry. The script instead BFS's the manifest's static `imports` to find which built FILES are reachable without crossing a `dynamicImports` boundary, then greps those files for markers (GitEngine/hosting facade property names + a PlaygroundShell-specific UI string) that survive minification. Verified empirically RED (against a temporarily-restored eager `App.tsx`) and GREEN (against the real lazy one).

## Issues Found
None blocking. See Deviation #3 above — recommend a follow-up task (either amending Phase 2 or adding to Phase 5) to wire `PlaygroundShell` (and the future `LevelShell`) onto the app-level `ThemeProvider` for true cross-route theme sync, before `sdd-verify`/`sdd-archive` treat the app-shell "Theme set on one route applies to another" spec scenario as satisfied end-to-end.

## Batch 2 — tasks.md Phase 3 (Level Engine) + Phase 4 (Level Progress) + theme-wiring fix

**Test runner**: `npm test` (`cross-env TZ=UTC vitest run`)

### Completed Tasks

#### Phase 3: Level Engine
- [x] 3.1 RED: predicates, step-replay determinism (ignore `t`) + `LevelStepError`, `evaluateLevel`, counting tests
- [x] 3.2 GREEN: `src/engine/lessons/{types,predicates,steps,evaluate,counting}.ts`
- [x] 3.3 GREEN: `HostingView`/`useHostingView` PR-action completion callback — **already satisfied by Batch 1**, see Deviations
- [x] 3.4 Spec text alignment (level-player Command Budget Counter) — done in both `openspec/changes/landing-and-levels/specs/level-player/spec.md` and the engram `sdd/landing-and-levels/spec` artifact
- [x] 3.5 `npm test` (TZ=UTC) — green

#### Phase 4: Level Progress
- [x] 4.1 RED: schema/store/stars/unlocks/session tests
- [x] 4.2 GREEN: `src/lessons/progress/{schema,store,stars,unlocks,ProgressContext}.tsx`, `src/lessons/session.ts`
- [x] 4.3 `npm test` (TZ=UTC) — green
- [x] 4.4 (added this batch) Wire `PlaygroundShell` onto the app-level `ThemeProvider` — closes Batch 1's Deviation #3

### Files Changed (Batch 2)

| File | Action | What Was Done |
|------|--------|---------------|
| `src/engine/lessons/types.ts` | Created | `HostingAction`, `Step`, `Goal`, `LevelDef`, `Evaluation`, `PlayerAction` — pure data shapes, no React |
| `src/engine/lessons/predicates.ts` | Created | 19 pure checklist predicates (`currentBranch`, `isDetached`, `branchExists`, `branchAt`, `commitCount`, `headMessage`, `fileTracked`, `fileStaged`, `fileContent`, `workingClean`, `hasConflict`, `opInProgress`, `isMerged`, `isLinear`, `tagAt`, `stashCount`, `remoteHasBranch`, `isPushed`, `upstreamOf`, `prWith`) — never reads commit `t` |
| `src/engine/lessons/steps.ts` | Created | `applySteps` (replays a `Step[]` script through the real `GitEngine`) + `LevelStepError` |
| `src/engine/lessons/counting.ts` | Created | `isReadOnlyCommand`, `countsToward`, `countSteps`, `countsLiveAction`, `computeBudget` |
| `src/engine/lessons/evaluate.ts` | Created | `evaluateLevel(level, estado): Evaluation` |
| `src/engine/lessons/__tests__/{predicates,steps,counting,evaluate}.test.ts` | Created | 47 tests total |
| `src/lessons/progress/schema.ts` | Created | `LevelsStoreV1`/`CompletedEntry`/`InProgressSnapshot` + `parseStore`/`emptyStore` |
| `src/lessons/progress/store.ts` | Created | `loadStore`, `persistStore` (quota-retry), `withSnapshot`/`withClearedSnapshot`/`withCompletion`, `snapshotFor`, `resetProgress` |
| `src/lessons/progress/stars.ts` | Created | `computeStars` |
| `src/lessons/progress/unlocks.ts` | Created | `computeUnlocks`, `LevelUnlockMeta` |
| `src/lessons/progress/ProgressContext.tsx` | Created | `ProgressProvider`/`useProgress` React context over the store |
| `src/lessons/session.ts` | Created | `createSession`/`revealHint`/`showSolution`/`recordAction`/`hasUsedHints` |
| `src/lessons/progress/__tests__/{schema,store,stars,unlocks,ProgressContext}.test.{ts,tsx}`, `src/lessons/__tests__/session.test.ts` | Created | 35 tests total |
| `vitest.config.ts` | Modified | `node` project gained `src/lessons/**/*.test.ts`; `dom` project gained `src/lessons/**/*.test.tsx` |
| `src/components/PlaygroundShell.tsx` | Modified | Wraps itself in `ThemeProvider`; body consumes `useAppTheme()` instead of its own local `useTheme` state |
| `src/components/__tests__/PlaygroundShell.theme.test.tsx` | Created | 1 test proving shared-context wiring (ancestor provider case) |
| `openspec/changes/landing-and-levels/specs/level-player/spec.md` | Modified | Command Budget Counter requirement + 3 new scenarios (resolve/save/failed-PR all count) |

### TDD Cycle Evidence (Batch 2)

| Task | Test File | RED confirmed | GREEN | Notes |
|------|-----------|------|-------|-------|
| theme fix | `PlaygroundShell.theme.test.tsx` | ✅ ran, failed (`'light' !== 'dark'`) | ✅ 1/1 | `PlaygroundShell.test.tsx` (12 tests, unedited) + `.graphMemo.test.tsx` stayed green throughout |
| 3.1/3.2 predicates | `predicates.test.ts` | ✅ module-not-found before `predicates.ts` existed | ✅ 14/14 | built on real engine replay via `GitEngine.ejecutar`, not hand-built `RepoState` |
| 3.1/3.2 steps | `steps.test.ts` | ✅ ran, module-not-found | ✅ 7/7 | includes a determinism test stripping `t` before `toEqual` |
| 3.1/3.2 counting | `counting.test.ts` | ✅ ran, module-not-found | ✅ 22/22 | covers every read-only command in the spec list + the 3.4 resolution (hosting-fail/resolve/save all count) |
| 3.1/3.2 evaluate | `evaluate.test.ts` | ✅ ran, module-not-found | ✅ 4/4 | |
| 4.1/4.2 schema | `schema.test.ts` | ✅ ran, module-not-found | ✅ 7/7 | |
| 4.1/4.2 store | `store.test.ts` | ✅ ran, module-not-found | ✅ 9/9 | includes a `Storage.prototype.setItem` monkeypatch to force `QuotaExceededError` on the first write |
| 4.1/4.2 stars | `stars.test.ts` | ✅ ran, module-not-found | ✅ 3/3 | |
| 4.1/4.2 unlocks | `unlocks.test.ts` | ✅ ran, module-not-found | ✅ 5/5 | |
| 4.1/4.2 session | `session.test.ts` | ✅ ran, module-not-found | ✅ 5/5 | |
| 4.1/4.2 ProgressContext | `ProgressContext.test.tsx` | ✅ ran, module-not-found | ✅ 6/6 | |

### Test Summary
- Baseline before this batch: 837/837 tests (96 files)
- Final: 920/920 tests (107 files) — **+83 net new tests**, zero regressions
- `tsc -b --noEmit`: clean
- `npm run build`: succeeds (entry 225.96kB; `PlaygroundRoute` chunk 150.28kB; `LevelMapRoute`/`LevelRoute` chunks <1kB each — level-engine/level-progress code isn't imported by any route yet, so it contributes 0 bytes to any chunk)
- `npm run check:chunks`: "OK. Entry chunk graph (2 file(s)) excludes PlaygroundShell, LevelShell, and the engine."

## Deviations from Design (Batch 2)

1. **LevelDef field names resolved to design's literal Contract, not the spec's Spanish shorthand.** The level-engine spec prose says "Spanish `titulo`/`objetivo`/`teoria`" field names, but design.md's own Contracts section explicitly spells out `LevelDef = {id, world, order, version, title, objective, theory[], setup, solution, goals, hints, slack?, hosting?}` — English field NAMES, Spanish field VALUES (the actual title/objective/hint text). Design wins per instructions. `hosting?: boolean` (not `allowHostingUI`) per the same Contract.
2. **No stored `budget` field on `LevelDef`.** Design's own Contract section omits one, and its Key Decisions state "budget = Σ countsToward(solution) + slack (default 2)" — i.e. derived, not authored. `counting.ts`'s `computeBudget(level)` is the single source of truth Phase 7's curriculum levels (and Phase 5's level player) must call; there is no field to keep in sync by hand.
3. **Task 3.3 required no new code.** `useGitPlayground.ts`'s `onAction` callback (built in Batch 1, Phase 2) already fires the exact `{kind:'hosting', op, ok}` / `{kind:'ui', action}` shapes `counting.ts`'s `countsLiveAction` classifies, including on PR-action FAILURE — confirmed via the pre-existing `useGitPlayground.test.ts` assertions (`fires {kind:"hosting", op:"create", ok} ... on both success and failure`, `fires {kind:"ui", action:"resolve"} for resolveConflict and {kind:"ui", action:"save"} for saveFile`). `HostingView.tsx` was not touched, matching design's "HostingView is untouched."
4. **`isReadOnlyCommand` classifies `&&`/`;`-chained lines group by group** (every group must be individually read-only for the whole line to count as read-only) — the spec only describes single commands; chaining wasn't specified, so the safer (counts more, never under-counts) interpretation was chosen.
5. **`ProgressProvider` takes `levels: LevelUnlockMeta[]` as a prop**, not an import of the real curriculum catalog — `src/lessons/worldsMeta.ts` (Phase 7) doesn't exist yet. Phase 6's `LevelMap`/Phase 5's `LevelShell` will supply it once it does.
6. **`vitest.config.ts` globs.** `node` project gained `src/lessons/**/*.test.ts`; `dom` project gained `src/lessons/**/*.test.tsx`. `src/lessons/progress/store.ts`'s test carries a per-file `// @vitest-environment jsdom` pragma (needs real `localStorage`) while staying under the `node` project's glob, instead of adding a second, narrower `dom`-project glob that would have double-matched it.
7. **Theme-wiring fix (closes Batch 1 Deviation #3).** `PlaygroundShell` now wraps itself in `<ThemeProvider>` and its body calls `useAppTheme()` instead of `useTheme`/`usePersistence.initial.theme`. When rendered inside the real app (where `App.tsx` already wraps the route switch in a `ThemeProvider`), the nested provider is a transparent passthrough and `PlaygroundShell` shares the SAME context — a theme change on any route now applies everywhere. When rendered standalone (its own unedited test files), `ThemeProvider` has no ancestor to detect, so it creates its own root exactly as before — `PlaygroundShell.test.tsx`/`.graphMemo.test.tsx` needed zero edits. `src/hooks/useTheme.ts` is now unused by `PlaygroundShell` but was left in place (still has its own passing unit tests; not deleted since nothing in this batch's scope asked for its removal and a future `LevelShell` might still want it, though it will more likely also adopt the app-level `ThemeProvider`).

## Batch 3 — tasks.md Phase 5 (Level Player) + Phase 6 (Level Map) + catalog skeleton

**Test runner**: `npm test` (`cross-env TZ=UTC vitest run`)

### Completed Tasks

#### Phase 5: Level Player
- [x] 5.1 RED: solve flow, hint-caps-1-star, solution-counts-as-hint, reset, success-modal locked-world gating, live budget, snapshot restore tests
- [x] 5.2 GREEN: `src/components/levels/{LevelShell,LessonPanel,GoalChecklist,BudgetMeter,HintList,SolutionReveal,SuccessDialog,LockedLevel,useLevelSession}.tsx`, `src/lessons/seed.ts`, `src/routes/LevelRoute.tsx`
- [x] 5.3 `npm test` (TZ=UTC) — green

#### Phase 6: Level Map
- [x] 6.1 RED: world lanes, locked aria-disabled, stars aria-label, "en curso" badge, reset-progress-confirm tests
- [x] 6.2 GREEN: `src/components/levels/{LevelMap,WorldLane,LevelNode}.tsx`, `src/routes/LevelMapRoute.tsx`
- [x] 6.3 `npm test` (TZ=UTC) — green

#### Catalog skeleton (pulled forward from Phase 7, per apply instructions)
- [x] `src/lessons/catalog/{index,w1-basicos}.ts` — 2 real World 1 levels (`basics-01-primer-commit`, `basics-02-status-y-stage`) with a generic solvability suite that runs over whatever levels exist in the catalog
- [x] `src/lessons/worldNames.ts` — the 6 world display names (small, catalog-independent, hand-authored — see its own deviation note below)

### Files Changed (Batch 3)

| File | Action | What Was Done |
|------|--------|---------------|
| `src/lessons/seed.ts` | Created | `seedOf(level)` — replays `setup` through the real engine from `vacio()`, memoized by `id:version` |
| `src/lessons/__tests__/seed.test.ts` | Created | 4 tests |
| `src/components/levels/useLevelSession.ts` | Created | Stateful wrapper over `src/lessons/session.ts`; exposes both `session` (for re-renders) and `ref` (for stale-closure-free reads in `persist`) |
| `src/components/levels/__tests__/useLevelSession.test.tsx` | Created | 6 tests |
| `src/lessons/catalog/w1-basicos.ts` | Created | `basics-01-primer-commit`, `basics-02-status-y-stage` — full `LevelDef`s matching the spec's World 1 table |
| `src/lessons/catalog/index.ts` | Created | `levels`, `getLevel`, `allLevelsSorted`, `unlockMetaOf`, `nextLevelOf` |
| `src/lessons/catalog/__tests__/catalog.solvability.test.ts` | Created | 14 tests (generic `describe.each` over whatever levels currently exist) |
| `src/lessons/worldNames.ts` | Created | `WORLD_NAMES` — the 6 world display names |
| `src/lessons/__tests__/worldNames.test.ts` | Created | 1 test |
| `src/components/levels/GoalChecklist.{tsx,module.css}` | Created | Live checklist, `aria-live="polite"`, `data-done` |
| `src/components/levels/BudgetMeter.{tsx,module.css}` | Created | Live count vs. budget, `data-over-budget` |
| `src/components/levels/HintList.{tsx,module.css}` | Created | Progressive reveal + 1-star warning copy |
| `src/components/levels/SolutionReveal.{tsx,module.css}` | Created | Confirm-gated solution viewer; describes `HostingAction` steps in Spanish |
| `src/components/levels/SuccessDialog.{tsx,module.css}` | Created | Focus-trapped modal, staggered star animation, Siguiente/Repetir/Mapa |
| `src/components/levels/LockedLevel.tsx` | Created | "Nivel bloqueado" guard view |
| `src/components/levels/{GoalChecklist,BudgetMeter,HintList,SolutionReveal,SuccessDialog,LockedLevel}.test.tsx` under `__tests__/` | Created | 19 tests total |
| `src/components/levels/LessonPanel.{tsx,module.css}` | Created | Composes the 4 leaf components + breadcrumb/objective/theory/reset/map-link |
| `src/components/levels/__tests__/LessonPanel.test.tsx` | Created | 4 tests |
| `src/components/levels/LevelShell.tsx` | Created | The full level-session assembly: `useWorkspace`/`WorkspaceView` + `LessonPanel` + `SuccessDialog`, level-scoped persistence (snapshot save/restore/no-op-after-completion), completion effect (stars → `recordCompletion` + `clearSnapshot`), reset handler |
| `src/components/levels/__tests__/LevelShell.test.tsx` | Created | 7 tests covering every spec scenario in task 5.1 |
| `src/routes/LevelRoute.tsx` | Modified (REPLACED placeholder) | Unknown id → `Redirect`; locked id → `LockedLevel`; otherwise `LevelShell` keyed `${id}:${nonce}` for reset-remount, wrapped in its own `ProgressProvider` |
| `src/routes/__tests__/LevelRoute.test.tsx` | Created | 3 tests |
| `src/components/levels/LevelNode.{tsx,module.css}` | Created | Unlocked (link) / locked (`aria-disabled`) node, stars, "en curso" badge |
| `src/components/levels/__tests__/LevelNode.test.tsx` | Created | 4 tests |
| `src/components/levels/WorldLane.{tsx,module.css}` | Created | One world's heading + `<ol>` of `LevelNode` |
| `src/components/levels/__tests__/WorldLane.test.tsx` | Created | 1 test |
| `src/components/levels/LevelMap.{tsx,module.css}` | Created | Header (Inicio, total stars, Reiniciar progreso confirm) + world lanes |
| `src/components/levels/__tests__/LevelMap.test.tsx` | Created | 4 tests |
| `src/routes/LevelMapRoute.tsx` | Modified (REPLACED placeholder) | Wraps `LevelMap` in its own `ProgressProvider` |
| `src/routes/__tests__/LevelMapRoute.test.tsx` | Created | 1 test |
| `src/styles/theme.css` | Modified | Added `--z-lesson: 27` token (design.md: "pinned ObjectiveBar... `--z-lesson 27`") |
| `src/__tests__/App.test.tsx` | Modified | Updated the Phase-1 placeholder-era `#/niveles/:id` assertion to match the real level's title instead of the raw id; renamed the `#/niveles` test's description (content unchanged — same heading text in both placeholder and real `LevelMap`) |

### TDD Cycle Evidence (Batch 3)

| Unit | Test File | RED confirmed | GREEN | Notes |
|------|-----------|------|-------|-------|
| seedOf | `seed.test.ts` | module-not-found before `seed.ts` existed | 4/4 | |
| useLevelSession | `useLevelSession.test.tsx` | module-not-found | 6/6 | |
| catalog | `catalog.solvability.test.ts` | module-not-found before `catalog/index.ts` existed | 14/14 | generic `describe.each`, not hardcoded to specific ids |
| worldNames | `worldNames.test.ts` | module-not-found | 1/1 | |
| GoalChecklist | `GoalChecklist.test.tsx` | module-not-found | 3/3 | |
| BudgetMeter | `BudgetMeter.test.tsx` | module-not-found | 3/3 | |
| HintList | `HintList.test.tsx` | module-not-found | 4/4 | |
| SolutionReveal | `SolutionReveal.test.tsx` | module-not-found | 4/4 | |
| SuccessDialog | `SuccessDialog.test.tsx` | module-not-found | 5/5 | |
| LessonPanel | `LessonPanel.test.tsx` | module-not-found | 4/4 | |
| LockedLevel | `LockedLevel.test.tsx` | module-not-found | 1/1 | |
| LevelShell | `LevelShell.test.tsx` | module-not-found | 7/7 | first run passed clean — no implementation fix-up needed |
| LevelRoute | `LevelRoute.test.tsx` | ran against the Phase-1 placeholder, failed (wrong heading/no guard) | 3/3 | true behavioral RED, not just module-not-found |
| LevelNode | `LevelNode.test.tsx` | module-not-found | 4/4 | |
| WorldLane | `WorldLane.test.tsx` | module-not-found | 1/1 | |
| LevelMap | `LevelMap.test.tsx` | module-not-found | 4/4 | |
| LevelMapRoute | `LevelMapRoute.test.tsx` | ran against the Phase-1 placeholder, failed (no level link) | 1/1 | true behavioral RED |

One mid-batch fix (not a separate RED/GREEN unit, caught by the LevelRoute RED run): `LevelShell`'s initial `bootLines` literally repeated `level.objective`, which is already shown in `LessonPanel`'s objective paragraph — `screen.getByText` found it twice. Replaced with a generic, distinct Spanish instruction line (`LEVEL_BOOT_LINES`).

### Test Summary (Batch 3)
- Baseline before this batch: 920/920 tests (107 files)
- Final: 989/989 tests (124 files) — **+69 net new tests**, zero regressions
- `tsc -b --noEmit`: clean
- `npm run build`: succeeds (new chunks: `LevelRoute` 11.66kB JS / 5.18kB CSS gzip 4.33/1.30kB, `LevelMapRoute` 3.58kB JS / 2.34kB CSS, a separate `catalog` chunk 4.95kB, `engine` chunk unchanged at 67.45kB — none pulled into the entry)
- `npm run check:chunks`: "OK. Entry chunk graph (2 file(s)) excludes PlaygroundShell, LevelShell, and the engine."
- `PlaygroundShell.test.tsx`/`.graphMemo.test.tsx`/`.theme.test.tsx` — all 12 tests still green, unedited this batch

## Deviations from Design (Batch 3)

1. **Catalog skeleton pulled forward from Phase 7**, per this batch's explicit apply instructions (not tasks.md's own phase assignment) — `src/lessons/catalog/{index,w1-basicos}.ts` with only 2 of World 1's 5 spec-table levels seeded (`basics-01-primer-commit`, `basics-02-status-y-stage`). The solvability test suite is generic (`describe.each` over whatever `levels` currently holds), so Phase 7 can append the other 28 levels with zero test-file changes.
2. **`src/lessons/worldsMeta.ts` (design.md's named Phase 7 file) was deliberately NOT created.** Its stated constraint — "WorldsPreview from worldsMeta.ts (no catalog import)" — only matters once the landing page (Phase 8) exists, and a correct `worldsMeta.ts` needs the full 30-level id/world/order list, which doesn't exist until Phase 7 completes the curriculum. Creating a partial one now would either (a) under-declare levels LevelMap/ProgressProvider need, or (b) hardcode ids for levels that don't exist in the catalog yet, risking drift. Instead: a tiny `src/lessons/worldNames.ts` (6 world display names only, no level ids, no catalog import) covers what `LevelMap`'s `WorldLane` headings need this batch; `LevelMap`/`LevelMapRoute`/`LevelRoute` derive per-level unlock metadata directly from the (partial) real catalog via `catalog/index.ts`'s `unlockMetaOf()`. Phase 7 task 7.13 still owns creating the real `worldsMeta.ts`; Phase 8's landing page will switch to it when it's built.
3. **`LevelMap`'s total-stars display is `levels.length * 3`, not a hardcoded `/90`** (design.md UI literally says "total stars x/90") — since only 2 of the eventual 30 levels exist, `/90` would be misleading before Phase 7 finishes. Becomes exactly `/90` automatically once the catalog is complete.
4. **`LevelShell`/`LevelRoute`/`LevelMapRoute` each self-wrap in their own `ProgressProvider`** rather than sharing one hoisted to `App.tsx`. `ProgressProvider` has no ancestor-passthrough logic (unlike `ThemeProvider`), but since routes are mutually exclusive — only one is ever mounted at a time — there is no state-sharing concern; each route simply reloads `gitpg:levels:v1` fresh on mount, same as any other direct navigation.
5. **`LevelShell`'s layout is a fixed-position overlay panel (`LessonPanel`, `position:fixed` docked to the viewport edge), not a true CSS grid that reflows the canvas**, because `WorkspaceView.module.css`'s `.root` is itself `position:fixed; inset:0` and `useMobile`/camera-fit math assumes the canvas fills the full viewport — changing that would risk the sandbox's own camera/graph-layout behavior. The 3 breakpoints design.md specifies (`>=1024px` / `720-1023px` / `<720px`) are still honored as 3 panel-width/position rules in `LessonPanel.module.css`, just as an overlay rather than a grid column.
6. **`SuccessDialog`'s "Siguiente nivel"/"Mapa" navigate via `window.location.hash` assignment** (a plain push navigation, matching `navigate()`'s own `window.location.hash = hash` path in `hashLocation.ts`) rather than importing `navigate()` directly — kept the component's props surface free of a router dependency for its own unit tests; `LevelShell`'s integration tests cover the actual hash values produced.
7. **Mid-batch fix**: `LevelShell`'s terminal `bootLines` were changed from literally repeating `level.objective` (duplicate text with `LessonPanel`'s own objective paragraph, caught by a `getByText` multiple-match failure while writing `LevelRoute.test.tsx`) to a generic, distinct instruction line.
8. **`src/__tests__/App.test.tsx`** (written in Batch 1 against the Phase-1 placeholder) needed its `#/niveles/:id` assertion updated from `heading name /basics-01-primer-commit/` (the placeholder's raw-id `h1`) to the real level's title `'Tu primer commit'` — the placeholder behavior it tested no longer exists, as flagged by Batch 1's own deviation notes ("5.2/6.2 REPLACE their content").

## Issues Found (through Batch 3)
None blocking.

## Batch 4 — tasks.md Phase 7 (Curriculum: 6 worlds, 30 levels)

**Test runner**: `npm test` (`cross-env TZ=UTC vitest run`)

### Completed Tasks

- [x] 7.0 Spec fix: `branching-05` solution → `cherry-pick hotfix`; `undo-05` solution → `revert HEAD~1` (no literal hashes) — now actually implemented in code (the spec text itself already carried a note that this fix was pending code)
- [x] 7.1 World 1 — Básicos: added `basics-03-deshacer-stage`, `basics-04-mover-y-borrar`, `basics-05-corregir-mensaje` to the existing `w1-basicos.ts` (basics-01/02 already existed from Batch 3's pull-forward)
- [x] 7.2 World 2 — Ramas: `src/lessons/catalog/w2-ramas.ts` (5 levels)
- [x] 7.3 World 3 — Merge y conflictos: `src/lessons/catalog/w3-merge.ts` (5 levels)
- [x] 7.4 World 4 — Deshacer cambios: `src/lessons/catalog/w4-deshacer.ts` (5 levels)
- [x] 7.5 World 5 — Remoto: `src/lessons/catalog/w5-remoto.ts` (5 levels)
- [x] 7.6 World 6 — Pull requests y colaboración: `src/lessons/catalog/w6-colaboracion.ts` (5 levels)
- [x] 7.13 GREEN: `src/lessons/catalog/index.ts` (now imports and concatenates all 6 world modules), `src/lessons/worldsMeta.ts` (new — the real design.md-named file; a catalog-independent, hand-authored 30-level id/title list for the future landing `WorldsPreview`, cross-checked against the real catalog by a new `worldsMeta.test.ts`)
- [x] 7.14 `npm test` (TZ=UTC) — full catalog solvability suite green (30/30 levels)

### TDD Cycle Evidence (Batch 4)

Every level's `setup`/`solution` script replays through the REAL engine (`GitEngine.ejecutar`/hosting facade) — nothing hand-built. Given the scale (28 new levels + 1 new file), RED/GREEN was run as two focused passes rather than per-level:

| What | RED confirmed | GREEN | Notes |
|------|------|-------|-------|
| `basics-03/04/05` (appended to the existing `w1-basicos.ts`) | ✅ ran with `solution: []` stubs first — `catalog.solvability.test.ts` failed exactly on "the reference solution solves the level" for all 3, nothing else | ✅ 3/3 after filling in the real solution scripts | Genuine behavioral RED (not module-not-found), since the file already existed |
| `worldsMeta.test.ts` (written before `worldsMeta.ts` existed) | ✅ ran, `Cannot find module '../worldsMeta'` | ✅ 4/4 after creating `worldsMeta.ts` | Cross-checks `WORLDS_META`'s flattened id sequence and titles against the real catalog |
| `w2-ramas.ts` .. `w6-colaboracion.ts` (new files, imported into `index.ts` before they existed) | ✅ ran, `Cannot find module` for each (same accepted pattern as Batch 3's catalog skeleton: a pure-data module's only meaningful RED is "doesn't exist yet") | ✅ 25/25 after authoring each file, with one real bug caught and fixed mid-GREEN (see below) | |

One real bug caught by the GREEN run (not a trivial module-not-found): `pr-03-actualizar-rama`'s first-draft goal checked `commitCount(s, 'feature') === 2`, which was **already true right after setup** (setup's own "Feature work" commit is 2 total when counted via ancestry, since `commitCount` counts everything reachable from the branch tip, including the shared `Base` commit on `main`) — this made the "setup is not yet solved" assertion fail. Fixed by checking `commitCount(s,'feature') === commitCount(s,'main') + 2` instead (an explicit "2 commits ahead of main" delta), confirmed both the "not solved after setup" and "solved after solution" assertions pass.

### Files Changed (Batch 4)

| File | Action | What Was Done |
|------|--------|---------------|
| `src/engine/lessons/predicates.ts` | Modified | +5 pure predicates: `isMergeCommit`, `remoteBranchAt`, `remoteIsAncestorOfLocal`, `visitedBranch`, `prCommentCount` |
| `src/lessons/catalog/w1-basicos.ts` | Modified | +3 levels (`basics-03-deshacer-stage`, `basics-04-mover-y-borrar`, `basics-05-corregir-mensaje`); `w1Levels` now has all 5 |
| `src/lessons/catalog/w2-ramas.ts` | Created | 5 levels (branching-01..05) |
| `src/lessons/catalog/w3-merge.ts` | Created | 5 levels (merge-01..05) |
| `src/lessons/catalog/w4-deshacer.ts` | Created | 5 levels (undo-01..05) |
| `src/lessons/catalog/w5-remoto.ts` | Created | 5 levels (remote-01..05) |
| `src/lessons/catalog/w6-colaboracion.ts` | Created | 5 levels (pr-01..05), hosting-action-based solutions for 4 of the 5 |
| `src/lessons/catalog/index.ts` | Modified | `levels` now concatenates all 6 world modules (30 total) |
| `src/lessons/worldsMeta.ts` | Created | `WORLDS_META` — 6 worlds × 5 levels, catalog-independent (no catalog import, per landing-page spec's "Code-Split Isolation") |
| `src/lessons/__tests__/worldsMeta.test.ts` | Created | 4 tests, cross-checks `WORLDS_META` against the real catalog |
| `src/components/levels/__tests__/LevelMap.test.tsx` | Modified | `'0 / 6'` → `'0 / 90'` (anticipated consequence of the catalog growing to 30 levels, flagged by Batch 3's own deviation #3) |
| `src/components/levels/__tests__/LevelShell.test.tsx` | Modified | "no next level" test now uses a cloned level with an id NOT in the catalog, instead of relying on `basics-02` being the literal last level |
| `openspec/changes/landing-and-levels/tasks.md` | Modified | Phase 7 marked `[x]`, deviations appended |

### Design-constraint notes specific to this batch

- **No literal hashes.** `branching-05-traer-un-commit`'s solution is `git cherry-pick hotfix` (branch name, not a hash) and `undo-05-revertir-commit`'s is `git revert HEAD~1` (relative ref) — matches 7.0's spec fix and the hard constraint.
- **`edit` cannot be replayed headlessly.** The shell `edit` command sets `accion.tipo:'editar'`, which `applySteps` treats as a `LevelStepError` (by design — it needs a live UI). `merge-03-resolver-conflicto`'s conflict resolution therefore uses `echo "..." > conflicto.txt` (a direct whole-file overwrite) instead of the spec table's literal "edit conflicto.txt (resuelto)" step — same end state (the conflict is resolved by writing the final content), just via a script-replayable command.
- **No durable "attempted-then-undid-it" evidence in `RepoState`.** `git merge --abort` and `git stash pop` restore exactly the pre-operation state with no trace (no reflog entry for either). Checking only final-state predicates can't distinguish "never tried" from "tried and undid it" — which would make the "setup is not yet solved" assertion fail if the setup didn't ALSO perform the risky operation. Fixed for `merge-04-abortar-merge` and `undo-04-guardar-con-stash` by having `setup` itself perform the merge-with-conflict / the stash push, so the exercise is specifically "cancel/recover from this in-progress state" — each level's `objective` text was adjusted to match (`merge-04`: "Cancela una fusión conflictiva en curso"; `undo-04`: "Recupera los cambios que guardaste con stash"). `branching-02-cambiar-ramas` has the same shape of problem (staying on `main` the whole time would trivially satisfy `currentBranch === 'main'`) but a cheaper fix existed: `s.reflog` DOES durably record every checkout, so a new `visitedBranch(s, name)` predicate checks the reflog for a `to feature2` entry, genuinely requiring the round trip.
- **Hosting flag strictness.** The existing (Batch 3) `catalog.solvability.test.ts` enforces `hosting === (solution contains a HostingAction)` literally. `pr-03-actualizar-rama`'s solution is pure git commands (push to update an already-open PR), so despite being a World 6 / PR-flavored level, `hosting` is left unset/`false` — the player can solve it without ever opening the hosting view, which is consistent with its actual solution script.
- **Derived budgets vs. the spec table's planning sketch.** Per design.md, `LevelDef` has no stored `budget` field — it's always `computeBudget(level) = countSteps(solution) + slack(2)`. Several levels' real derived budgets differ by 1 from the spec table's sketch (e.g. `merge-01-fast-forward` derives to 4 — `switch main` + `merge feature` — matching the table exactly in this case; most others matched exactly too, since setups were deliberately positioned to require the same step count the table's own solution text implies). No level was padded with a redundant command just to force a specific number.

### Test Summary (Batch 4)
- Baseline before this batch: 989/989 tests (124 files)
- Final: **1161/1161 tests (125 files), +172 net new, zero regressions**
- `tsc -b --noEmit`: clean
- `npm run build`: succeeds — new `catalog` chunk grew to 30.84kB gzip 8.92kB (was ~4.95kB for 2 levels); `engine` chunk unchanged at 67.47kB; nothing new pulled into the entry
- `npm run check:chunks`: "OK. Entry chunk graph (2 file(s)) excludes PlaygroundShell, LevelShell, and the engine."
- `PlaygroundShell.test.tsx`/`.graphMemo.test.tsx`/`.theme.test.tsx` — all 12 tests still green, unedited this batch

## Issues Found (through Batch 4)
None blocking.

## Batch 5 — tasks.md Phase 8 (Landing Page) + Phase 9 (Verification & QA)

**Test runner**: `npm test` (`cross-env TZ=UTC vitest run`)

### Completed Tasks

#### Phase 8: Landing Page
- [x] 8.1 RED: `HeroDemo` fake-timer tests — real-engine script replay, loop, reduced-motion static frame, pause (7 tests)
- [x] 8.2 RED: CTA navigation + `WorldsPreview` (worldsMeta-driven, no catalog import) tests (plus Hero/Features/HowItWorks tests — 12 tests)
- [x] 8.3 GREEN: `src/components/landing/{Hero,HeroDemo,Features,HowItWorks,WorldsPreview,CTA}.tsx`, hover/focus preload already wired into `routes.ts` (Batch 1); replaced the Phase-1 placeholder `src/routes/LandingRoute.tsx`
- [x] 8.4 `npm test` (TZ=UTC) + `npm run build` + `npm run check:chunks` — all green, see Test Summary below

#### Phase 9: Verification & QA
- [x] 9.1 Full `npm test` (TZ=UTC) + `npm run build` + `npm run check:chunks` — all green
- [ ] 9.2 Manual QA (human gate — NOT RUN): wrote `openspec/changes/landing-and-levels/qa-checklist.md` covering routing, landing, every world, stars/unlocks, reset, reload persistence, cross-route theme, mobile, reduced motion, and World 6 PR flows. A human must walk it and sign off before this checkbox (or tasks.md's matching one) flips to `[x]`.
- [x] 9.3 Confirmed parity tests untouched and green — `src/engine/__tests__/parity/parity.test.ts` and every file under `src/engine/commands/__tests__/` were never touched across all 5 batches of this change; they're part of the 1180/1180 green run below

### TDD Cycle Evidence (Batch 5)

| What | Test File | RED confirmed | GREEN | Notes |
|------|-----------|------|-------|-------|
| `HeroDemo` typing/holding/looping/pause state machine | `src/components/landing/__tests__/HeroDemo.test.tsx` | ✅ written and run against a FIRST implementation whose scheduling effect re-ran per-render-cycle instead of self-chaining — 4/7 failed (0 nodes ever rendered; pause/resume snapshots coincidentally equal) | ✅ 7/7 after rewriting the scheduler to self-chain via refs (see Issues Found) | Real engine replay (`GitEngine.vacio`/`ejecutar`/`layout`/`headHash`) via `buildFrames`, cross-checked against an independent direct replay in the test itself |
| `Hero` | `src/components/landing/__tests__/Hero.test.tsx` | ✅ ran, module-not-found | ✅ 2/2 | Confirms the literal "Git Playground" `h1` + `data-route-focus`, and that the lazy `HeroDemo` eventually mounts behind `Suspense` |
| `Features` | `src/components/landing/__tests__/Features.test.tsx` | ✅ ran, module-not-found | ✅ 2/2 | |
| `HowItWorks` | `src/components/landing/__tests__/HowItWorks.test.tsx` | ✅ ran, module-not-found | ✅ 2/2 | |
| `WorldsPreview` | `src/components/landing/__tests__/WorldsPreview.test.tsx` | ✅ ran, module-not-found | ✅ 2/2 | Cross-checks against the real `WORLDS_META` (all 6 names + all 30 titles render) |
| `CTA` | `src/components/landing/__tests__/CTA.test.tsx` | ✅ ran, module-not-found | ✅ 4/4 | Same hover/focus-preload pattern as the Phase-1 placeholder it replaces |
| `LandingRoute` (pre-existing, Batch 1) | `src/routes/__tests__/LandingRoute.test.tsx` | N/A — approval test | ✅ 5/5, **unedited** | The placeholder's 2 CTAs/h1/preload behavior is now provided by `CTA`/`Hero` instead of inline markup; accessible names/hrefs/data-route-focus are identical, so the existing assertions pass unchanged |
| `App` routing (pre-existing, Batch 1) | `src/__tests__/App.test.tsx` | N/A — approval test | ✅ 6/6, **unedited** | Its `heading` level-1 name `'Git Playground'` assertion is why Hero's `h1` keeps that literal text instead of a creative headline (see Deviations) |

### Issues Found (Batch 5, resolved before GREEN)

**`HeroDemo`'s first scheduling design was fundamentally broken under fake timers.** The initial implementation
scheduled each next tick (next char / next hold / loop restart) from inside a `useEffect` whose dependency array
included `phase`/`stepIndex`/`charCount` — i.e. it relied on a React re-render actually committing between one
`setTimeout` firing and the next one being scheduled. Under `vi.useFakeTimers()` + a single
`act(() => vi.advanceTimersByTime(bigNumber))` call (the same pattern `useToasts.test.ts` uses successfully), only
the FIRST scheduled timer ever fired — React doesn't guarantee a full render+effect-flush pass between two
synchronous fake-timer callbacks inside one `act()` invocation unless the next timer is scheduled imperatively,
not via a dependency-triggered effect re-run. Fixed by rewriting the whole typing/holding/loop-pause state machine
to self-chain: a single `useEffect` (keyed only on `running`/`reducedMotion`, i.e. the 3 pause reasons) starts a
recursive `scheduleTyping`/`scheduleHold`/`scheduleLoopPause` chain that calls `setTimeout` again directly inside
each callback (reading/writing plain `useRef`s for the scheduling logic, with parallel `useState` calls purely for
rendering). A second, smaller test bug compounded this during debugging: two of the three pause/resume tests
originally compared the FULL `document.body.innerHTML` before vs. after a pause/resume cycle, with advance
durations landing EXACTLY on a phase-transition boundary — this made the "before" and "after" snapshots
coincidentally byte-identical (both showed 0 typed characters and 0 commits, just for two different, equally
untyped script lines) even once the component itself worked correctly. Fixed by comparing only the typed `<code>`
text content, with advance windows deliberately offset mid-character (not landing on a boundary) so "frozen while
paused" vs. "progressed after resume" are unambiguous. None of this touched the engine, `src/engine/commands/*`,
or `design-handoff/`.

### Files Changed (Batch 5)

| File | Action | What Was Done |
|------|--------|---------------|
| `src/components/landing/colors.ts` | Created | `LANDING_ACCENTS`/`accentFor` — a hand-copied mirror of the engine's `PALETA` hex values, since eager landing modules may only `import type` from the engine |
| `src/components/landing/heroScript.ts` | Created | `HERO_SCRIPT` — 12 real git/shell command lines (init → commit → branch → commit → merge --no-ff), curated to only ever ADD nodes, never reposition one |
| `src/components/landing/HeroDemo.tsx` + `.module.css` | Created | The engine-driven hero graph + typed terminal line + pause button + reduced-motion static fallback; the ONLY landing module that imports the real `GitEngine`/`GraphLayer` at runtime |
| `src/components/landing/Hero.tsx` + `.module.css` | Created | Eager hero shell (`h1`, tagline, subtitle) that `React.lazy`-loads `HeroDemo` behind `Suspense`, with a static SVG skeleton fallback |
| `src/components/landing/Features.tsx` + `.module.css` | Created | 3-item features list (real motor, nothing to install, live graph) |
| `src/components/landing/HowItWorks.tsx` + `.module.css` | Created | 3-step "how it works" ordered list |
| `src/components/landing/WorldsPreview.tsx` + `.module.css` | Created | 6-world preview grid, driven by `src/lessons/worldsMeta.ts` (no catalog import — landing-page spec "Code-Split Isolation") |
| `src/components/landing/CTA.tsx` + `.module.css` | Created | The spec's literal dual CTA ("Empezar niveles" → `#/niveles`, "Modo libre" → `#/playground`), hover/focus-preloaded via the existing `routes.ts` functions |
| `src/components/landing/__tests__/{HeroDemo,Hero,Features,HowItWorks,WorldsPreview,CTA}.test.tsx` | Created | 19 tests total |
| `src/routes/LandingRoute.tsx` | Modified (REPLACED Phase-1 placeholder) | Composes `Hero`/`Features`/`HowItWorks`/`WorldsPreview`/`CTA`; sets `data-scroll-page` on `<body>` for as long as it's mounted |
| `src/routes/LandingRoute.module.css` | Modified (REPLACED Phase-1 placeholder) | Page-level dotted-grid backdrop + the vertical "commit-log" rail every section's dot sits on |
| `src/styles/global.css` | Modified | Scoped the sandbox-era `body { overflow: hidden }` to `body:not([data-scroll-page])`, so the landing page (a normal scrolling document) isn't clipped |
| `openspec/changes/landing-and-levels/qa-checklist.md` | Created | Phase 9's human-gate manual QA checklist — explicitly marked NOT RUN |
| `openspec/changes/landing-and-levels/tasks.md` | Modified | Phase 8 + 9.1/9.3 marked `[x]`; 9.2 stays `[ ]` pending human sign-off; deviations appended |

`src/routes/__tests__/LandingRoute.test.tsx` and `src/__tests__/App.test.tsx` were both left completely unedited
and still pass — see TDD Cycle Evidence above for why.

### Test Summary (Batch 5)
- Baseline before this batch: 1161/1161 tests (125 files)
- Final: **1180/1180 tests (131 files), +19 net new, zero regressions**
- `tsc -b --noEmit`: clean
- `npm run build`: succeeds. New chunks: `HeroDemo` 3.85kB JS / 1.78kB CSS (gzip 1.70/0.72kB); `engine` chunk
  unchanged at 67.48kB (gzip 24.03kB) and still NOT reachable from the entry; entry (`index`) chunk 235.04kB JS
  (gzip 74.01kB) — grew from the Batch 4 baseline (~226kB) by the landing page's own eager content (Hero shell,
  Features, HowItWorks, WorldsPreview, CTA, the rail/grid CSS), as expected since landing is eager by design.
- `npm run check:chunks`: "OK. Entry chunk graph (2 file(s)) excludes PlaygroundShell, LevelShell, and the engine."
- `PlaygroundShell.test.tsx`/`.graphMemo.test.tsx`/`.theme.test.tsx` — all 12 tests still green, unedited this batch
- `src/engine/__tests__/parity/parity.test.ts` + all `src/engine/commands/__tests__/*` — green, untouched this batch (confirms 9.3)

## Deviations from Design (Batch 5)

1. **Hero's `h1` keeps the literal text "Git Playground"**, not a creative headline. `src/__tests__/App.test.tsx`
   (Batch 1 baseline, not owned by this batch) asserts the landing route's `h1` by the exact accessible name
   `'Git Playground'` in 3 of its 6 tests. Changing the copy would have required editing a baseline test file for
   a cosmetic reason, which is higher-risk than keeping the brand name as the `h1` and putting the actual pitch
   ("Aprende Git ejecutando comandos reales.") in a prominent tagline paragraph directly below it — a common,
   accessible landing-page pattern (h1 = product name, tagline = value prop).
2. **`global.css`'s `body { overflow: hidden }` is now scoped to `body:not([data-scroll-page])`.** This predates
   this change (written when the whole app was a single fixed-viewport sandbox canvas) but was never revisited
   when routing was introduced in Phase 1 — Phase 1 through 7's routes (sandbox, level map, a level) are ALL
   still fixed-viewport canvases, so nothing broke until Phase 8 introduced the first route that needs to scroll
   like a normal document. `LandingRoute` sets `data-scroll-page` on `<body>` in a `useEffect`, removed on
   unmount, so every other route's fixed-viewport behavior is completely unchanged. Not caught by any test (CSS
   rules aren't exercised by jsdom's layout, which doesn't do real layout/overflow at all); flagged here for the
   human QA pass (checklist section 2's first row) and for `sdd-verify` to confirm against the actual spec intent.
3. **`colors.ts` hand-copies the engine's `PALETA` hex values** instead of importing them, to honor "eager
   landing modules only `import type` from the engine" (landing-page spec "Code-Split Isolation" / design.md
   Chunking). If the oracle's palette ever changes, this file needs a matching manual update — there is no
   automated check tying the two together (a cross-check test, mirroring `worldsMeta.test.ts`'s pattern against
   the catalog, would be a reasonable follow-up but wasn't in this batch's assigned tasks).
4. **No "Continuar en modo libre" dynamic CTA label.** design.md's UI notes mention this as a nice-to-have
   ("'Continuar en modo libre' when `gitpg:v1` exists") but the landing-page spec's own literal Core Sections
   requirement — and the pre-existing `LandingRoute.test.tsx`/`App.test.tsx` approval tests — pin the CTA's
   accessible name to exactly `'Modo libre'`. Implementing the dynamic variant would have required changing
   those baseline tests' expected link names for a design nicety; deferred.
5. **`HeroDemo`'s pause-and-resume does not preserve exact elapsed time within the current char/hold.** Pausing
   mid-character or mid-hold and resuming restarts that character's/hold's FULL delay rather than the remaining
   fraction. This is an intentional simplification (the design doc doesn't specify sub-tick resume precision) for
   decorative, non-interactive content — not perceptible to a user.

## Issues Found (Batch 5)
None blocking — see "Issues Found (Batch 5, resolved before GREEN)" above for the one implementation bug (fixed
during this same batch, before reporting GREEN).

## Remaining Tasks
- [ ] 9.2 Manual QA walkthrough of `openspec/changes/landing-and-levels/qa-checklist.md` (human gate)

## Workload / PR Boundary
- Mode: single PR, `size:exception` (per tasks.md's Review Workload Forecast, `delivery_strategy: exception-ok`)
- Current work unit (Batch 5): Suggested Work Units 8 (Landing+hero demo) and 9 (Verify+QA) — both complete except the human-only 9.2 QA walkthrough
- Boundary: starts from the 1161-test baseline (full 30-level curriculum built, landing route still a Phase-1
  placeholder); finishes with the complete, distinctive landing page (hero demo, features, how-it-works, worlds
  preview, dual CTA) plus a full final verification run and a written (not yet executed) manual QA checklist
- Estimated review budget impact: ~21 files created/modified this batch (8 new landing components + their CSS, 6
  new test files, 1 replaced route + its CSS, 1 global CSS scoping fix, 1 new QA checklist, tasks.md); recommend
  reviewing `HeroDemo.tsx` + its test separately (the trickiest logic) from the other 5 presentational sections

## Status
Phase 1 through Phase 8 complete (35/35 sub-tasks across five batches, counting the added 4.4 theme-wiring task),
plus Phase 9's automated gates (9.1, 9.3). 1180/1180 tests passing, `tsc -b --noEmit` clean, `npm run build`
succeeds, `npm run check:chunks` green. Only remaining work on this change is 9.2 — a human walking
`qa-checklist.md` — before `sdd-verify`/`sdd-archive` should treat this change as fully done.

## Review fixes

Surgical fixes applied after an adversarial blind-judge review (judge-a/judge-b), strict TDD throughout (RED
confirmed via `npm test -- <file>` before each production-code change, then GREEN). No commits created; no
`design-handoff/`, `src/engine/commands/*`, or `src/engine/__tests__/parity/*` files touched.

1. **CRITICAL — hint/solution reveal not persisted before the first command (star cheat).**
   `src/components/levels/LevelShell.tsx`'s `persist` callback only ran from `useGitPlayground`'s
   command/`clear`/`loadRepo` handlers — `onRevealHint`/`onShowSolution` never saved. Root cause: the
   `LevelShell`→`useWorkspace`→`useGitPlayground` persistence wiring was designed around "persist whenever the
   repo/hist changes," but revealing a hint or the solution changes neither — only the in-memory
   `useLevelSession` ref — so nothing triggered a write. Repro: open a level, reveal a hint (or the solution),
   unmount with zero commands run, remount, solve within budget → awarded 3 stars instead of the required 1.
   Fix: call the pre-existing `useGitPlayground` `persistNow()` escape hatch immediately inside
   `onRevealHint`/`onShowSolution`, right after updating the session ref (which `useLevelSession` already
   updates synchronously, so `persistNow()` reads the fresh `hintsUsed`/`solutionShown` value). Tests added:
   `LevelShell.test.tsx` — hint-only and solution-only remount+solve repros, both now capped at 1 star.
2. **WARNING — `App.tsx` mutated `isInitialRef` during render; broke under `<StrictMode>`.**
   `main.tsx` wraps `<App/>` in `<StrictMode>`, which double-invokes a component's render phase. `AppShell`
   read `isInitialRef.current` AND set it to `false` in the same render call — the second (discarded) render
   call then read back the first call's mutation, so the INITIAL mount's own commit saw `isInitial: false`,
   and `RouteFrame` wrongly ran its scroll/focus-steal effect on first paint (stealing focus to the landing
   `<h1>`). Root cause: a side effect (ref mutation) performed in the render body instead of an effect — exactly
   the class of impurity StrictMode's double-render is designed to surface. Fix: render now only READS
   `isInitialRef.current`; the `false` flip moved into a `useLayoutEffect` with no deps (fires once, after the
   initial commit). Tests added: `App.test.tsx` — initial mount under `<StrictMode>` no longer focuses the `<h1>`;
   a subsequent navigation under `<StrictMode>` still focuses the new route's `[data-route-focus]`.
3. **SUGGESTION — `SuccessDialog` had no Escape-to-close and no focus restoration.** Added an optional `onClose`
   prop, wired from `LevelShell` as `() => setShowSuccess(false)` (closes the modal, keeping the already-recorded
   completion — returns to the level view). `handleKeyDown` now calls `onClose?.()` on `Escape`. A
   `previouslyFocusedRef` captures `document.activeElement` on mount and restores focus to it in the mount
   effect's cleanup (covers Escape-triggered close and any other unmount path). Tests added:
   `SuccessDialog.test.tsx` (Escape calls `onClose`; focus restored to the pre-dialog element on close) and one
   `LevelShell.test.tsx` integration test (Escape closes the dialog, completion stays recorded in
   `gitpg:levels:v1`).
4. **SUGGESTION — `pr-03-actualizar-rama` lacked `hosting: true`.** Its checklist goals read PR state
   (`prWith`/`isPushed`) for a PR already opened in `setup`, so the player needs the hosting view visible to see
   the PR the level is about, even though the reference solution itself has no hosting-typed step. Set
   `hosting: true` in `src/lessons/catalog/w6-colaboracion.ts`. Relaxed the solvability suite's invariant in
   `src/lessons/catalog/__tests__/catalog.solvability.test.ts` from "hosting iff a hosting step exists" to the
   one-directional "a hosting step in the solution implies `hosting: true`" (confirmed RED with the old
   bidirectional test before relaxing it; the per-level solvability tests themselves are untouched).
5. **Docs — synced `level-curriculum` spec text for 3 drifted levels** against shipped code in
   `src/lessons/catalog/w3-merge.ts`/`w4-deshacer.ts`: `merge-03-resolver-conflicto` (solution uses
   `echo "cambio resuelto" > conflicto.txt`; noted the player may also resolve via the conflict-resolver UI or
   `edit`), `merge-04-abortar-merge` (setup now already includes `git merge feature`; solution is just
   `merge --abort`; budget re-derived to 3), `undo-04-guardar-con-stash` (setup now already includes
   `git stash`; solution is just `stash pop`; budget re-derived to 3) — each with an inline note on why
   (`merge --abort`/`stash pop` leave no durable trace, so a 1-step reference solution loses nothing by not
   re-describing the already-done setup step). Updated both
   `openspec/changes/landing-and-levels/specs/level-curriculum/spec.md` and the engram topic
   `sdd/landing-and-levels/spec` (observation #498, same topic key, full content preserved).

### Final verification (post-fixes)
- `npm test`: **1187/1187** passing (1180 baseline + 7 new tests: 2 for fix 1, 2 for fix 2, 2 for fix 3's unit
  tests + 1 `LevelShell` integration test for fix 3 — 3 total for fix 3)
- `npx tsc -b --noEmit`: clean, no errors
- `npm run build`: succeeds
- `npm run check:chunks`: OK — entry chunk graph excludes `PlaygroundShell`, `LevelShell`, and the engine

### Residual risk
- Fix 3's focus-restore relies on `document.activeElement` at the dialog's mount time; if a future caller opens
  the dialog without any prior focused element (e.g. via a programmatic trigger with nothing focused), the
  restore is a harmless no-op (`previouslyFocusedRef.current` is `document.body`, `.focus()` on it is inert).
- Fix 4 only adjusted one level's `hosting` flag and relaxed the matching invariant to one direction; it does not
  re-audit every other level for the same "goal reads existing hosting state but has no hosting-typed solution
  step" pattern — a future catalog addition could hit the same issue again undetected (the relaxed test only
  catches a hosting step WITHOUT the flag, not a missing flag with no such step).
- Fix 5 is documentation-only; it does not change runtime behavior or add tests beyond what the solvability
  suite already covers for those 3 levels.
