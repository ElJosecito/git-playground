# Proposal: Port Git Playground to Vite + React + TypeScript

## Intent

The Claude Design handoff (`design-handoff/Git Playground.dc.html` + `git-engine.js`) runs only on the `dc-runtime` prototype renderer: untyped, untested, unmaintainable. Port it to a typed, tested React app with full behavioral parity so beginners learning git and devs trying commands get the same experience on a foundation that can later host a lessons layer.

## Scope

### In Scope
- Vite + React + TS + Vitest scaffold
- Modular, pure TS engine (serializable state) with golden parity harness against original `git-engine.js`
- Full UI parity: SVG graph + camera, terminal, files strip, remote + teammate simulation, conflict resolver, inline editor, WAAPI choreography, toasts/tooltip, theme (dark default, light via `data-theme`), mobile layout
- Contracts preserved: `gitpg:v1` localStorage schema, `window.GitPlayground` debug API, `\x01kind\x02text\x03` output markup
- UI copy and engine output kept in Spanish

### Out of Scope
- Lessons/tutorial layer (engine API stays pure to enable it later)
- i18n
- Porting `support.js` (reference only)
- New git commands or behavior changes beyond parity

## Capabilities

### New Capabilities
- `git-engine`: simulated git/shell commands, state model, events, 3-way merge, op state machine, remote/teammate simulation, explain, completion, layout
- `graph-canvas`: SVG commit graph rendering, pan/zoom camera, safe-area fit/center, WAAPI choreography
- `terminal`: draggable/resizable terminal, history, Tab completion, colored prompt and output markup
- `workspace-panels`: files strip, conflict resolver + pill, file editor modal, toasts, tooltip, action bar, empty state
- `app-shell`: theme, persistence (`gitpg:v1`), mobile layout, debug API, accessibility live region

### Modified Capabilities
- None

## Approach

- Engine first (strict TDD): split into `state/hash/refs/diff/commands/*/layout/explain/completion`; typed `RepoState`, `GitEvent` and `OpState` discriminated unions; bit-exact `hashStr`; insertion-order-preserving lanes/colors.
- UI: `useReducer` wrapping engine; refs-based hooks (`useCamera`, `useChoreography`, `useToasts`, `usePersistence`, `useTerminalWindow`); single memoized SVG layer; WAAPI with plan-identity ref guards.
- Styles: CSS Modules + design `:root` custom properties.
- Delivery: `exception-ok` single delivery (`size:exception`), ~7 work-unit commit slices.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json` | New | Scaffold |
| `src/engine/**` | New | TS engine + tests + parity harness |
| `src/components/**`, `src/hooks/**` | New | React UI |
| `src/styles/theme.css` | New | Design tokens |
| `design-handoff/**` | Unchanged | Oracle/reference |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Timestamp/locale nondeterminism breaks parity | High | Fake timers, fixed TZ/locale |
| Hash/lane drift | Med | Bit-exact port, golden tests |
| `op` state machine typing errors | Med | Discriminated union, exhaustive switch |
| Choreography hard to test | High | jsdom `animate` stub, manual visual QA |
| Large single delivery burdens review | High | Work-unit commits, slice boundaries |

## Rollback Plan

Greenfield and additive: revert the change's commits (or drop its branch). `design-handoff/` remains untouched and runnable as the prototype.

## Dependencies

- Node + npm; Vite, React, TypeScript, Vitest, React Testing Library, jsdom

## Success Criteria

- [ ] Golden parity corpus passes (output, events, error, normalized state) against `git-engine.js`
- [ ] All listed UI regions behave as in the prototype (manual QA checklist)
- [ ] `npm test` and `npm run build` pass; TS strict, no `any` in engine
- [ ] Existing `gitpg:v1` data loads; `window.GitPlayground` works

## Proposal question round

Product decisions were confirmed by the user via the orchestrator (fixed). Remaining assumptions to review: parity means visual/timing fidelity "close enough" under manual QA rather than pixel-exact; prototype bugs are ported as-is, not fixed.
