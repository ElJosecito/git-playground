# Design: Port Git Playground to Vite + React + TypeScript

## Technical Approach

This is a greenfield port in two layers, and the oracle never changes.

1. **Engine** (`src/engine/**`): a 1:1 typed port of `design-handoff/git-engine.js`. It is pure and synchronous, and its state is JSON-serializable. It keeps the original identifiers (`ejecutar`, `vacio`, `fusionar3`…) so reviewers can diff it against the original line by line. A golden parity harness runs the original IIFE and the port side by side.
2. **UI** (`src/app`, `src/ui`, `src/hooks`, `src/components`):
   - `useReducer` holds the domain state.
   - The engine is called in **event handlers**, never inside the reducer.
   - Ephemeral, animation-rate state (camera, plan, timers, history) lives in refs inside dedicated hooks.
   - One memoized SVG layer, `GraphLayer`, renders the graph. WAAPI animations are driven by stable ref callbacks guarded by plan identity.
   - Styling uses CSS Modules on top of `:root` tokens.

Contracts preserved byte-exact: `gitpg:v1` `{repo, theme, hist}`, `window.GitPlayground {estado, ejecutar, motor, cargar}`, `\x01kind\x02text\x03` markup, and the Spanish copy.

## Architecture Decisions

| # | Decision | Options considered | Choice and rationale |
|---|----------|--------------------|----------------------|
| D1 | Where the engine runs | In the reducer, or in the handler before dispatch | **Handler.** `nuevoCommit` reads `Date.now()` and the internal-error path calls `console.error`. StrictMode double-invokes reducers, so both would make the reducer impure. A `repoRef` mirrors the original `this.repo`, so back-to-back commands see the latest state before React re-renders. |
| D2 | State containers | `Map`/`Set`, or plain `Record` | **Plain `Record`s, same key insertion order.** Lanes and colors depend on key order, the hash input includes `JSON.stringify(tree)`, and `gitpg:v1` must round-trip. |
| D3 | Engine identifiers | Translate to English, or keep the Spanish originals | **Keep the originals.** This gives a reviewable 1:1 port, and `motor()` must expose the same API shape. |
| D4 | Loading the oracle | `vm` context, an edited ESM copy, or `new Function('window', src)` | **`new Function` in the same realm.** The original file is not touched. Faked `Date` applies to both engines. `toEqual` has no cross-realm issues. |
| D5 | After-commit hook point | `useEffect`, `flushSync`, or `useLayoutEffect` | **`useLayoutEffect` keyed on `transition.id`.** It matches the original setState-callback timing: DOM is committed, rects can be measured, and fills apply before paint. |
| D6 | Animate-once guard | `el.__born` expando, or `WeakMap<Element, Plan>` | **`WeakMap`.** It is typed and also survives StrictMode re-invoking ref callbacks. |
| D7 | Layout caching | Recompute per render, or cache per repo | **Module-level `WeakMap<RepoState, Layout>`.** The engine deep-clones on every change, so repo objects are effectively immutable. |
| D8 | Graph rendering | Per-node `memo` components, or one memoized layer | **One layer** (fixed decision). `memo(GraphLayer)` takes deps `[layout, planVersion, tipId, handlers]`. Sub-parts are plain render functions, not nested components. |
| D9 | Foreign (imperative) DOM | Append into React-managed nodes, or keep separate containers | **React renders empty containers**: the overlay `<div>` for `fly()` chips and a `<g data-fx>` (last child of the world `<g>`) for particles. React never reconciles their children. |
| D10 | Camera transform | Pass it as a prop or style, or set it imperatively | **Imperative `setAttribute`** on the world `<g>` and canvas `backgroundSize/Position`. These attributes are deliberately absent from JSX, so re-renders cannot reset them. |
| D11 | Dynamic styles | CSS variables for everything, or CSS Modules plus inline style for data values | **CSS Modules plus inline style for data values.** Static layout, `style-hover` and variants go in modules. Palette hex colors, geometry and toast opacity/transform go in inline `style`. |
| D12 | Persistence trigger | `useEffect` on state, or explicit `persist()` in handlers | **Explicit.** This mirrors the original `save()` calls (apply, clear, theme, load), avoids a write on mount, and reads refs for `hist`. |
| D13 | TypeScript strictness | strict plus `noUncheckedIndexedAccess`, or strict only | **`strict: true`, `noUncheckedIndexedAccess: false`.** The engine indexes Records densely. The parity harness provides the safety net. No `any` in `src/engine`. |
| D14 | Test environments | jsdom only, or Vitest `projects` | **Two projects.** `node` covers engine, ui-pure and reducer tests. `dom` (jsdom) covers hooks and components. |
| D15 | Choreography DOM contract | Component refs, or data attributes | **Keep data attributes:** `data-chip`, `data-zone`, `data-stash`, `data-h`, `data-rh`, `data-label`, `data-leaving`, `data-inner`, `data-ripple`, `data-child`, `data-remote`. Queries are scoped to `rootRef`. `finishAnims` keeps `document.getAnimations()`. |

## Data Flow

```
TerminalWindow ─run(text)─► useGitPlayground (handlers)
                               │ choreo.finishAll()
                               │ res = ejecutar(repoRef.current, text)   (pure engine)
                               │ plan = choreo.prepare(res.eventos, prev, next) → planRef, snapRects(before)
                               │ repoRef.current = next ; persist()
                               ▼
                     dispatch({type:'applied', res, prev, echo})
                               ▼
              reducer → {repo, lines, transition:{id,res,prev,next}}
                               ▼ render (GraphLayer memo reads layoutOf(repo) + planRef)
              ref callbacks fire on mount → WAAPI births (WeakMap guard)
                               ▼
              useLayoutEffect[transition.id] → choreo.after():
                  error ? shake term + live : toasts.push(explicar) + live
                  if plan===planRef.current → fly/particles/labels/camera
```

`resolver`, `companero` and `escribir` take the same path through `applyResult(res, echo|null)`.

## File Changes

All files are new, under the repository root. `design-handoff/**` is unchanged.

```
index.html  package.json  tsconfig.json  tsconfig.app.json  tsconfig.node.json
vite.config.ts  vitest.config.ts  eslint.config.js (optional)
src/main.tsx  App.tsx  global.d.ts  vite-env.d.ts
src/styles/theme.css  global.css
src/engine/ types.ts constants.ts markup.ts util.ts hash.ts errors.ts state.ts graph.ts
            refs.ts tokens.ts files.ts diff.ts format.ts branching.ts shell.ts events.ts
            recorder.ts run.ts explain.ts layout.ts completion.ts info.ts index.ts
src/engine/commands/ index.ts basics.ts history.ts branches.ts integrate.ts undo.ts remote.ts unsupported.ts
src/engine/__tests__/*.test.ts            (one per module)
src/engine/__tests__/parity/ loadOriginal.ts corpus.ts parity.test.ts
src/app/ playgroundReducer.ts(.test) useGitPlayground.ts debugApi.ts
src/ui/  markup.ts selectors.ts tooltip.ts geometry.ts plan.ts layoutCache.ts color.ts motion.ts keyboardNav.ts (+ .test.ts each)
src/hooks/ useCamera useChoreography useToasts usePersistence useTerminalWindow useTheme useMobile useReducedMotion useTooltip (.ts, + tests)
src/components/ Canvas GraphLayer EmptyState FilesStrip ActionBar ToastStack Tooltip ConflictResolver
                ConflictPill FileEditorModal CameraControls TerminalWindow TerminalLine SegText FlyOverlay LiveRegion
                (each .tsx + .module.css; .test.tsx for interactive ones)
src/test/ setup.dom.ts
```

Engine module map:

| Module | Contents |
|--------|----------|
| `state` | `vacio`, `ensureColor`, `colorRama`, `laneFor`, `nuevoCommit`, `headHash`, `setHead` |
| `diff` | `diffTxt`, `hunks`, `fusionLineas`, `fusionar3`, `marcadores`, `aplicarResultado`, `cambiosCommit`, `diffArboles` |
| `run` | `unaOrden`, `ejecutar`, `envolver`, `escribir`, `resolver`, `companero`, `ejemplo` |
| `index` | The `GitEngine` facade object, with the same keys as `window.GitEngine` |

## Interfaces / Contracts

```ts
type Hash = string; type Tree = Record<string, string>; type OpKind = 'merge'|'rebase'|'cherry-pick'|'revert';
interface Commit { hash: Hash; n: number; msg: string; parents: Hash[]; tree: Tree; author: string; t: number;
  lane: number; x: number; local: boolean; dy?: number; copyOf?: Hash; cherryOf?: Hash; revertOf?: Hash }
type Head = { type: 'branch'; name: string } | { type: 'detached'; hash: Hash };
interface ConflictSides { ours?: string; theirs?: string }           // undefined = deleted side
interface PickOp { kind: 'merge'|'cherry-pick'|'revert'; other: Hash; otherName: string; conflicts: string[];
  data: Record<string, ConflictSides>; msg: string; origW: Tree; origI: Tree }
interface RebaseOp { kind: 'rebase'; onto: Hash; ontoName: string; todo: Hash[]; pairs: [Hash, Hash][];
  branch: string|null; orig: Hash; ut: Tree; lane: number; conflicts: string[];
  current?: Hash; other?: Hash; otherName?: string; data?: Record<string, ConflictSides> }
type OpState = PickOp | RebaseOp;
interface RepoState { v: 1; inited: boolean; files: Tree; index: Tree; commits: Record<Hash, Commit>; order: Hash[];
  branches: Record<string, Hash>; colorOf: Record<string, number>; nColors: number; laneOf: Record<string, number>;
  lanes: { name: string; color: string }[]; detLane: number|null; tags: Record<string, Hash>; head: Head;
  prev: string|null; stash: { msg: string; base: Hash; w: Record<string, string|null>; i: Record<string, string|null> }[];
  reflog: { h: Hash|null; msg: string }[]; remote: { branches: Record<string, Hash>; known: Record<Hash, 1> };
  tracking: Record<string, Hash>; upstream: Record<string, string>; op: OpState|null; seq: number; tm: number }
type GitEvent = /* one variant per event type listed in the proposal (40 total); payloads exactly as emitted,
  e.g. */ | { type: 'commit-created'; hash: Hash; files: string[]; branch: string|null; root: boolean }
  | { type: 'reset'; mode: 'soft'|'mixed'|'hard'; from: Hash|null; to: Hash; count: number; ref: string; aborted: OpKind|null }
  | { type: 'ref-moved'; kind: 'branch'|'tag'|'track'; ref: string; from: Hash|null; to: Hash|null } /* … */;
interface CommandResult { estado: RepoState; salida: string[]; eventos: GitEvent[];
  accion?: { tipo: 'editar'; archivo: string } | null; error?: boolean }      // key presence varies by path
interface Layout { pos: Record<Hash, Point>; nodes: LNode[]; edges: LEdge[]; links: LLink[]; labels: LLabel[];
  phantom: { P: Point; edges: { id: string; d: string }[] } | null; rpos: Record<Hash, Point>; rnodes: RNode[];
  redges: REdge[]; rlabels: RLabel[]; rbox: Box|null; stash: (Point & { n: number })|null; bbox: Box|null }
```

Parity gotchas:

- Event objects are built `{type, ...payload}` in the original insertion order.
- `aborted` is computed as `prevOp && prevOp.kind`, which yields `null` when there is no op.
- `GitError` is a plain class with `lines` and does not extend `Error`.

**Reducer.** State is:

```ts
{ repo, lines: {id, segs}[] /* ≤500 */, nextLineId, input, editor: {file, text} | null,
  resolverHidden, resetOpen, live, transition: {id, res, prev, next} | null }
```

Actions:

- `applied`: appends echo and output lines and sets `transition`. It sets `resolverHidden = false` when the events contain `merge-conflict`.
- `echoed`, `cleared`, `editorOpened`, `editorChanged`, `editorClosed`, `repoLoaded{repo, notice?}`, `inputChanged`, `linesAppended`, `liveSet`, `resolverToggled`, `resetMenuToggled`.
- All are exhaustive (`never` check) and contain no I/O.

**Hooks.** All handlers are stable via `useCallback`/refs.

| Hook | Contract |
|------|----------|
| `useMobile(canvasRef)` | Returns `{vw, vh, mobile: vw < 720, sized}`. Uses ResizeObserver and window `resize`. |
| `useTerminalWindow(view)` | Returns `{geom, min, max, box, open, resizable, camBottom, toggleMin, toggleMax, onDragStart, onResizeStart}`. Clamping formulas are from the original. Window pointer listeners are removed on unmount. |
| `useCamera({canvasRef, envRef, reducedRef, onMove})` | Returns `{worldRef, camRef, lastManualRef, apply, zoomAt, camTo, finish, fitAll(dur, full?), headCam, inView, w2s, markManual, onCanvasPointerDown, zoomIn, zoomOut, fit, centerHead}`. It installs the non-passive wheel listener. The math lives in `ui/geometry.ts`: `safeArea`, `fitCam`, `easeIO`, `clamp`. |
| `useChoreography({rootRef, overlayRef, fxRef, termRef, camera, reducedRef, toasts})` | Returns `{planRef, planVersion, prepare, after, finishAll, refs: {node, rnode, edge, label, pulse, stash}}`. `mkPlan` is a pure function in `ui/plan.ts`. |
| `useToasts()` | Returns `{toasts, push(expl)}`. Max 2, double-rAF enter, 4000 ms leave, removal after 300 ms. Timers are cleared on unmount. |
| `usePersistence()` | Returns `{initial: {repo, theme, hist}, save(snapshot)}`. Reads lazily once and checks `repo.v === 1`, falling back to `ejemplo()`. Saves `hist.slice(-100)`. Both read and write are wrapped in try/catch. |
| `useTheme(initial, onChange)` | Returns `{theme, toggle}`. Sets `documentElement.dataset.theme` on mount (layout effect) and on toggle. |
| `useTooltip(camera)` | Returns `{tip, hover, unhover, blur, clear}`. 120 ms hover delay; a document `pointerdown` listener dismisses touch tips. |
| `useReducedMotion()` | Returns a ref holding the `prefers-reduced-motion` value, read once. |

**Component tree:**

```
App → PlaygroundShell(rootRef)
├── Canvas {onPointerDown, children}
│   ├── GraphLayer {layout, planVersion, tipId, refs, handlers}
│   └── EmptyState {title, text}
├── FilesStrip {model, open, mobile, onToggle} | MobileFilesButton
├── ActionBar {showMate, mateLabel, onMate, onTheme, resetOpen, onReset*}
├── ToastStack {toasts}
├── Tooltip {data, placement}
├── ConflictResolver {model, onResolve(file, mode), onEdit, onHide}
├── ConflictPill
├── FileEditorModal {file, text, onChange, onSave, onCancel}
├── CameraControls {bottom, zoomIn, zoomOut, fit, head}
├── TerminalWindow {box, lines, promptSegs, input, onInput, onKey, …}
│   └── TerminalLine (memo by id) → SegText
├── FlyOverlay(ref)
└── LiveRegion {text}
```

The original `renderVals()` becomes pure selectors in `ui/selectors.ts` and `ui/tooltip.ts`:

- `filesModel`
- `stripSummary`
- `resolverModel`
- `promptSegs`
- `tipData`
- `tipPlacement`
- `terminalBox`

**DC template to JSX mapping:**

| DC construct | JSX / CSS equivalent |
|--------------|----------------------|
| `sc-if` | Ternary returning `null` in the else branch |
| `sc-for list as` | `.map()` with keys (line/toast id, file name, conflict file) |
| `{{ x }}` | `{x}` |
| `ref="{{r}}"` | `ref={r}` |
| `onX="{{f}}"` | `onX={f}` |
| `style="…"` | CSS Module class, plus inline style for the data-driven parts |
| `style-hover` | `:hover` rule in the module |
| `hint-placeholder-*` | Dropped |
| `<helmet>` | `index.html` (title, Geist fonts) and `global.css` (body, scrollbar, placeholder rules) |

**Tokens (`theme.css`):**

- Every dark and light variable from the original `:root` and `:root[data-theme="light"]`, unchanged.
- `--font-sans: Geist,system-ui,sans-serif` and `--font-mono: 'Geist Mono',monospace`.
- `--radius-sm: 6px`, `--radius-md: 10px`, `--radius-lg: 14px`.
- `--space-1..7`: 4, 6, 8, 10, 12, 14, 16 px.
- Motion: the existing `--dur-*` and `--ease-*`, plus `--ease-spring: cubic-bezier(.34,1.4,.64,1)` and `--ease-spring-soft: cubic-bezier(.34,1.36,.64,1)`.
- `--z-strip` 20, `--z-actions` 25, `--z-term` 30, `--z-resolver` 35, `--z-toast` 40, `--z-editor` 45, `--z-tip` 50, `--z-overlay` 60.
- WAAPI cannot read `var()`, so `ui/motion.ts` mirrors the easing and duration values as TS constants.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit (node) | Every engine module, including `hashStr` vectors, `fusionar3` edge cases, `resolve` (`~`/`^`, ambiguity), lanes. Also `ui/*` pure modules (`mkPlan`, `geometry`, `selectors`, `markup`, `tipData`) and the reducer. | Vitest, strict TDD |
| Parity (node) | The corpus seeds `ejemplo`/`vacio` and runs steps: `{cmd}`, `{escribir}`, `{resolver}`, `{companero}`. After each step it compares `salida`, `eventos`, `error`, `accion` and `estado`, plus `explicar`, `layout` and `completar` at checkpoints. | `loadOriginal()` imports the oracle with `?raw` and runs `new Function('window', src)(shim)`. `vi.useFakeTimers({toFake: ['Date']})` and `setSystemTime` freeze `Date`. Results are compared with `toEqual` **and** `JSON.stringify` equality, so key order is checked too. |
| Hooks (jsdom) | `useToasts` timers, `usePersistence` round trip on legacy `gitpg:v1`, terminal clamping, camera `apply` setting the transform attribute | `renderHook` with fake timers |
| Integration (jsdom) | Typing a command updates output; history ↑/↓; Tab completion; resolver buttons; editor Ctrl+Enter and Esc; reset menu; theme sets `data-theme`; `window.GitPlayground` | RTL with `user-event` |
| Manual | Choreography timing, camera moves, mobile sheet | A QA checklist in tasks |

`setup.dom.ts` stubs the following:

- `Element.prototype.animate`, returning a fake `Animation` with `finish`/`cancel`, `onfinish`/`oncancel`, and `effect.getTiming`.
- `document.getAnimations`.
- `SVGElement.getTotalLength`.
- `matchMedia`, `ResizeObserver`, `CSS.escape` and `setPointerCapture`.
- jsdom runs with `pretendToBeVisual: true`.

Timezone and locale are fixed with `test.env.TZ = 'UTC'` and `TZ=UTC` in the npm script. A sanity test asserts `getTimezoneOffset() === 0` and the `es-ES` output of `fecha`.

## Migration / Rollout

No migration is required. The app reads existing `gitpg:v1` data as is. Delivery is `exception-ok` (`size:exception`) in about 7 work-unit commits, starting with the scaffold.

## Open Questions

None are blocking. Assumptions: React 19 (ref callbacks and `ref`-as-prop), current Vite and Vitest majors, and Node with full ICU.
