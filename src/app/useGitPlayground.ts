// App-level data hook: owns the playground reducer and every handler that
// talks to the engine. Per design decision D1, the engine is ALWAYS called
// here (in a handler), never inside `playgroundReducer` — `repoRef` mirrors
// the oracle's `this.repo` mutable field so a second command run before
// React re-renders still sees the first command's result (relevant under
// StrictMode's double-invoked effects/reducers too).
//
// The initial repo defaults to `GitEngine.ejemplo()`. Phase 7's
// `usePersistence` (tasks.md 7.3/7.4) will replace this default with the
// real `gitpg:v1` round trip (falling back to `ejemplo()` only on
// missing/corrupt storage) — until then this hook boots the same fixture
// every time, same as a fresh install of the original.
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react';
import { GitEngine } from '../engine';
import type { CommandResult, GitEvent, RepoState } from '../engine/types';
import { createInitialPlaygroundState, playgroundReducer } from './playgroundReducer';
import type { LineInput, PlaygroundState } from './playgroundReducer';
import { parseLine } from '../ui/markup';
import { loadHistory, saveHistory } from './history';
import { installDebugApi } from './debugApi';
import type { CreatePullRequestInput } from '../engine/hosting/create';
import type { MergeStrategy } from '../engine/hosting/types';

/** The slice of `useChoreography`'s result that this hook drives, per
 * design's data-flow diagram: "useGitPlayground (handlers): choreo.
 * finishAll(); res=ejecutar(...); plan=choreo.prepare(...); ...;
 * dispatch(...)" and "useLayoutEffect[transition.id] -> choreo.after()".
 * Optional (and typed as a minimal structural slice, not the full
 * `UseChoreographyResult`) so this hook stays usable/testable without a
 * DOM-backed choreography instance (e.g. Phase 7 default, existing tests). */
export interface ChoreographyApi {
  planRef: { current: { leaving: unknown[] } | null };
  prepare(evs: GitEvent[], prev: RepoState, next: RepoState, isError: boolean): void;
  after(res: CommandResult, prev: RepoState, next: RepoState): string;
  finishAll(): void;
}

// Byte-identical to the oracle's `welcome()` (design-handoff/Git
// Playground.dc.html).
const WELCOME_RAW = [
  '\x01m\x02Bienvenido. Escribe cualquier comando de Git y mira qué pasa en el grafo.\x03',
  '\x01m\x02Nada se rompe: puedes equivocarte y volver atrás. \x03help\x01m\x02 muestra la lista de comandos.\x03',
  '',
];

function createBootState(initialRepo?: RepoState, bootLines?: string[]): PlaygroundState {
  const base = createInitialPlaygroundState();
  const lines = (bootLines ?? WELCOME_RAW).map((text, i) => ({ id: i + 1, segs: parseLine(text) }));
  return { ...base, repo: initialRepo ?? GitEngine.ejemplo(), lines, nextLineId: lines.length + 1 };
}

/** A player action, reported to `options.onAction` at the point the handler
 * decides it counts (design.md Contracts: "PlayerAction = command | hosting
 * {op, ok} | ui{resolve|save}"). `command` carries the raw submitted text —
 * classifying it as read-only/counting is Phase 3's `level-engine/counting`
 * module's job, not this hook's. */
export type PlayerActionEvent =
  | { kind: 'command'; text: string }
  | { kind: 'hosting'; op: 'create' | 'comment' | 'close' | 'reopen' | 'merge'; ok: boolean }
  | { kind: 'ui'; action: 'resolve' | 'save' };

/** Phase 2 (tasks.md 2.2/2.4): lets a future level session (Phase 5) count
 * player actions toward its command budget and boot with its own lesson
 * lines instead of the sandbox's welcome banner. Optional and backward
 * compatible — omitting it keeps the sandbox's exact current behavior. */
export interface UseGitPlaygroundOptions {
  onAction?(action: PlayerActionEvent): void;
  bootLines?: string[];
}

export type ConflictMode = 'mia' | 'suya' | 'ambas';

/** Result of a simulated-hosting action (design's data-flow diagram: "res =
 * GitEngine.mergePullRequest(...) ... error -> {ok:false,lines} -> inline
 * message / ok -> applyResult"). On failure, `lines` are the engine's own
 * markup-encoded `salida` (e.g. the push-hint rejection), meant for the
 * ORIGINATING form/view to render inline — never the terminal. */
export type HostingOutcome = { ok: true } | { ok: false; lines: string[] };

/** `hosting.create`'s own outcome shape — UX fix: the caller (`HostingView`)
 * must navigate to the newly-opened PR's detail instead of back to the
 * list, so success carries the new PR's id (read off the `pr-opened` event
 * `createPr` always emits on success, never guessed from list order). */
export type CreatePrOutcome = { ok: true; id: number } | { ok: false; lines: string[] };

/** The `hosting` handler group (design: "Op failures ... Handler skips
 * applyResult on error"). Every member follows the same shape: error ->
 * `{ok:false,lines}` for the caller to render inline, success -> applyResult
 * (persist + choreo.after -> explicar() toast) and `{ok:true}`. */
export interface HostingHandlers {
  create(input: CreatePullRequestInput): CreatePrOutcome;
  comment(id: number, body: string): HostingOutcome;
  close(id: number): HostingOutcome;
  reopen(id: number): HostingOutcome;
  merge(id: number, strategy: MergeStrategy, deleteBranch: boolean): HostingOutcome;
}

/** Phase 7 (tasks.md 7.3/7.4): injected by `PlaygroundShell` to fold the full
 * `gitpg:v1` `{repo, theme, hist}` round trip (owned by `usePersistence`)
 * into this hook's boot state and save points, superseding the hist-only
 * defaults below. Optional and backward compatible — tests and any other
 * caller that omits it keep booting from `GitEngine.ejemplo()` and
 * `history.ts`'s hist-only storage slot, unchanged. */
export interface PersistenceDeps {
  initialRepo?: RepoState;
  initialHist?: string[];
  /** Called with the (possibly just-updated) repo and the full history
   * array at every point the oracle's own `save()` is called: after a
   * command applies (`apply() -> save(next)`), on `clear`/`cls`
   * (`this.save()`), and on `loadRepo()` (`loadRepo -> save(estado)`).
   * Deliberately NOT called on the editar-accion path (oracle doesn't call
   * save() there either) or on an empty Enter. */
  persist?(repo: RepoState, hist: string[]): void;
}

export interface UseGitPlaygroundResult {
  state: PlaygroundState;
  run(text: string): void;
  resolveConflict(file: string, mode: ConflictMode): void;
  openEditor(file: string): void;
  simulateTeammate(): void;
  saveFile(file: string, text: string): void;
  setEditorText(text: string): void;
  closeEditor(): void;
  /** FilesStrip panel buttons ("+ Nuevo archivo" / "Renombrar" / "Borrar" —
   * students shouldn't need touch/mv/rm to manage files). Same
   * error/ok shape as `hosting.*` (HostingOutcome): on success, applies
   * silently through `applyResult(res, null)` — no terminal echo, and the
   * underlying engine functions never produce `salida` on success either,
   * so nothing lands in the terminal; on error, `applyResult` is skipped
   * (repo untouched) and the engine's markup-encoded error lines are handed
   * back for the panel's inline error display. Deliberately does NOT fire
   * `onAction` — unlike resolveConflict/saveFile, a button-driven file
   * change must never consume a level's command budget. */
  createFile(name: string): HostingOutcome;
  renameFile(from: string, to: string): HostingOutcome;
  deleteFile(name: string): HostingOutcome;
  loadRepo(repo: RepoState, notice?: string): void;
  setInput(value: string): void;
  historyPrev(): void;
  historyNext(): void;
  completeInput(currentInput: string): void;
  setResolverHidden(hidden: boolean): void;
  toggleResetMenu(): void;
  /** Ctrl+L (oracle: `this.setState({lines:[]})`) — clears only the output
   * lines, leaving any pending typed input untouched. Distinct from
   * `run('clear')`/`run('cls')`, which clear both. */
  clearLines(): void;
  /** Escape hatch for callers that own a piece of the persisted snapshot
   * this hook doesn't (namely `theme`, owned by `useTheme` one level up in
   * `PlaygroundShell`) — persists the CURRENT repo/hist on demand, matching
   * the oracle's `toggleTheme` calling `this.save()` with no repo arg
   * (defaults to `this.state.repo`). */
  persistNow(): void;
  hosting: HostingHandlers;
}

export function useGitPlayground(
  choreo?: ChoreographyApi,
  persistence?: PersistenceDeps,
  options?: UseGitPlaygroundOptions,
): UseGitPlaygroundResult {
  const initialRepo = persistence?.initialRepo;
  const [state, dispatch] = useReducer(playgroundReducer, undefined, () => createBootState(initialRepo, options?.bootLines));
  // Routed through a ref so `onAction` can change identity across renders
  // (an inline arrow at the call site, say) without forcing every handler
  // below to re-create its own `useCallback` — same convention as
  // `debugHandlersRef` further down.
  const onActionRef = useRef(options?.onAction);
  useLayoutEffect(() => {
    onActionRef.current = options?.onAction;
  });
  const repoRef = useRef<RepoState | null>(state.repo);
  // Queue of commands whose `choreo.after()` hasn't run yet (D5's
  // after-command hook point, drained below). Needed because two
  // synchronous handler calls in the same tick (e.g. two back-to-back
  // `window.GitPlayground.ejecutar()` calls) batch into ONE React commit —
  // `state.transition` only tracks the latest one, and the effect it keys
  // only fires once per commit. Without this queue the first command's
  // after()-driven toast/aria-live/animation choreography would silently
  // never run. `prepare()` is unaffected (always called synchronously, once
  // per command, in the handler below).
  const pendingAfterRef = useRef<Array<{ res: CommandResult; prev: RepoState | null; next: RepoState }>>([]);
  const historyRef = useRef<string[]>(persistence?.initialHist ?? loadHistory());
  const histIdxRef = useRef(-1);
  // Default fallback persists only the hist slice (Phase 3 behavior,
  // `history.ts`'s `saveHistory`), ignoring `repo` — matches the signature
  // but not the full `{repo, theme, hist}` round trip, which only
  // `PlaygroundShell`'s injected `persistence.persist` provides.
  const persist = persistence?.persist ?? ((_repo: RepoState, hist: string[]) => saveHistory(hist));

  const applyResult = useCallback(
    (res: CommandResult, prefixLine: LineInput | null) => {
      const prev = repoRef.current;
      if (choreo && prev) choreo.prepare(res.eventos, prev, res.estado, !!res.error);
      pendingAfterRef.current.push({ res, prev, next: res.estado });
      repoRef.current = res.estado;
      dispatch({ type: 'applied', res, prefixLine });
      persist(res.estado, historyRef.current);
    },
    [choreo, persist],
  );

  // D5's after-command hook point: fires once the DOM has committed `next`
  // (so rects can be measured) but before paint, keyed on `transition.id`
  // so it only runs once per actually-new command (not on every render).
  // Drains `pendingAfterRef` rather than just reading `state.transition`
  // directly, so that if two (or more) commands batched into this single
  // commit (`state.transition` only tracks the latest), `after()` still
  // runs once per command, in order, each with its OWN prev/next pair.
  useLayoutEffect(() => {
    const pending = pendingAfterRef.current;
    pendingAfterRef.current = [];
    if (!choreo) return;
    for (const { res, prev, next } of pending) {
      if (!prev) continue;
      const live = choreo.after(res, prev, next);
      dispatch({ type: 'liveSet', text: live });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.transition?.id]);

  const run = useCallback(
    (text: string) => {
      choreo?.finishAll();
      const trimmed = text.trim();
      if (trimmed) {
        if (historyRef.current[historyRef.current.length - 1] !== trimmed) {
          historyRef.current = [...historyRef.current, trimmed];
        }
      }
      histIdxRef.current = -1;

      // Counting (design.md Key Decisions): fires for every non-empty
      // submitted command — including `clear`/`cls`, ones the engine
      // rejects, and ones reached via the debug API's `ejecutar()` (which
      // routes through this same `run()`) — classifying which of those
      // actually count toward a level's budget is Phase 3's job, not this
      // hook's.
      if (trimmed) onActionRef.current?.({ kind: 'command', text: trimmed });

      // Oracle (design-handoff/Git Playground.dc.html, line 290): the
      // `clear`/`cls` typed command calls `this.save()` with no repo arg
      // (defaults to the CURRENT, unchanged repo) — distinct from `apply()`'s
      // `save(next)`, which `applyResult` below already covers.
      if (trimmed === 'clear' || trimmed === 'cls') {
        dispatch({ type: 'cleared' });
        persist(repoRef.current ?? GitEngine.vacio(), historyRef.current);
        return;
      }
      if (!trimmed) {
        dispatch({ type: 'echoed', text });
        return;
      }
      const repo = repoRef.current ?? GitEngine.vacio();
      const res = GitEngine.ejecutar(repo, text);
      if (res.accion && res.accion.tipo === 'editar') {
        // Oracle: the editar-accion path never calls save() either.
        dispatch({ type: 'editorOpened', file: res.accion.archivo, echoText: text });
        return;
      }
      applyResult(res, { kind: 'echo', text });
    },
    [applyResult, choreo, persist],
  );

  // Ctrl+L (oracle: `this.setState({lines:[]})`) — lines only, no `save()`
  // call either (matches the oracle, which doesn't persist on this path).
  const clearLines = useCallback(() => dispatch({ type: 'linesCleared' }), []);

  const resolveConflict = useCallback(
    (file: string, mode: ConflictMode) => {
      choreo?.finishAll();
      onActionRef.current?.({ kind: 'ui', action: 'resolve' });
      const repo = repoRef.current ?? GitEngine.vacio();
      applyResult(GitEngine.resolver(repo, file, mode), null);
    },
    [applyResult, choreo],
  );

  // Opens the editor directly for `file`, with no terminal echo — the
  // conflict resolver's "Editar…" button (Phase 6) doesn't go through
  // `run()`/the terminal at all, unlike the engine's `accion: {tipo:
  // 'editar'}` path above.
  const openEditor = useCallback((file: string) => {
    dispatch({ type: 'editorOpened', file, echoText: null });
  }, []);

  const simulateTeammate = useCallback(() => {
    choreo?.finishAll();
    const repo = repoRef.current ?? GitEngine.vacio();
    applyResult(GitEngine.companero(repo), null);
  }, [applyResult, choreo]);

  const saveFile = useCallback(
    (file: string, text: string) => {
      const repo = repoRef.current ?? GitEngine.vacio();
      dispatch({ type: 'editorClosed' });
      choreo?.finishAll();
      onActionRef.current?.({ kind: 'ui', action: 'save' });
      applyResult(GitEngine.escribir(repo, file, text), { kind: 'markup', text: `\x01m\x02(guardado ${file})\x03` });
    },
    [applyResult, choreo],
  );

  const setEditorText = useCallback((text: string) => dispatch({ type: 'editorChanged', text }), []);
  const closeEditor = useCallback(() => dispatch({ type: 'editorClosed' }), []);

  const createFile = useCallback(
    (name: string): HostingOutcome => {
      choreo?.finishAll();
      const repo = repoRef.current ?? GitEngine.vacio();
      const res = GitEngine.crearArchivo(repo, name);
      if (res.error) return { ok: false, lines: res.salida };
      applyResult(res, null);
      return { ok: true };
    },
    [applyResult, choreo],
  );

  const renameFile = useCallback(
    (from: string, to: string): HostingOutcome => {
      choreo?.finishAll();
      const repo = repoRef.current ?? GitEngine.vacio();
      const res = GitEngine.renombrarArchivo(repo, from, to);
      if (res.error) return { ok: false, lines: res.salida };
      applyResult(res, null);
      return { ok: true };
    },
    [applyResult, choreo],
  );

  const deleteFile = useCallback(
    (name: string): HostingOutcome => {
      choreo?.finishAll();
      const repo = repoRef.current ?? GitEngine.vacio();
      const res = GitEngine.borrarArchivo(repo, name);
      if (res.error) return { ok: false, lines: res.salida };
      applyResult(res, null);
      return { ok: true };
    },
    [applyResult, choreo],
  );

  const loadRepo = useCallback(
    (repo: RepoState, notice?: string) => {
      choreo?.finishAll();
      if (choreo) choreo.planRef.current = null;
      repoRef.current = repo;
      dispatch({ type: 'repoLoaded', repo, notice });
      // Oracle: `loadRepo(estado){...this.setState({repo:estado,...},()=>{...this.save(estado);})`.
      persist(repo, historyRef.current);
    },
    [choreo, persist],
  );

  const setInput = useCallback((value: string) => dispatch({ type: 'inputChanged', value }), []);

  const historyPrev = useCallback(() => {
    if (!historyRef.current.length) return;
    histIdxRef.current = histIdxRef.current < 0 ? historyRef.current.length - 1 : Math.max(0, histIdxRef.current - 1);
    dispatch({ type: 'inputChanged', value: historyRef.current[histIdxRef.current]! });
  }, []);

  const historyNext = useCallback(() => {
    if (histIdxRef.current < 0) return;
    histIdxRef.current += 1;
    if (histIdxRef.current >= historyRef.current.length) {
      histIdxRef.current = -1;
      dispatch({ type: 'inputChanged', value: '' });
    } else {
      dispatch({ type: 'inputChanged', value: historyRef.current[histIdxRef.current]! });
    }
  }, []);

  const completeInput = useCallback((currentInput: string) => {
    const repo = repoRef.current ?? GitEngine.vacio();
    const { last, pool } = GitEngine.completar(repo, currentInput);
    if (!pool.length) return;
    let prefix = pool[0]!;
    for (const candidate of pool) {
      while (!candidate.startsWith(prefix)) prefix = prefix.slice(0, -1);
    }
    const base = currentInput.slice(0, currentInput.length - last.length);
    if (pool.length === 1) {
      dispatch({ type: 'inputChanged', value: base + pool[0] + ' ' });
    } else if (prefix.length > last.length) {
      dispatch({ type: 'inputChanged', value: base + prefix });
    } else {
      dispatch({
        type: 'linesAppended',
        entries: [
          { kind: 'echo', text: currentInput },
          { kind: 'plain', text: pool.slice(0, 30).join('   ') },
        ],
      });
    }
  }, []);

  const setResolverHidden = useCallback((hidden: boolean) => dispatch({ type: 'resolverToggled', hidden }), []);
  const toggleResetMenu = useCallback(() => dispatch({ type: 'resetMenuToggled' }), []);

  const persistNow = useCallback(() => {
    persist(repoRef.current ?? GitEngine.vacio(), historyRef.current);
  }, [persist]);

  // Hosting handler group (design's data-flow diagram). Unlike `run()`,
  // there is no terminal echo/prefix line — on success `applyResult` still
  // fires (persist + choreo.after -> explicar() toast), but the engine's own
  // `salida` is empty for every hosting op (spec "Action Result Feedback"),
  // so no line actually lands in the terminal. On error, `applyResult` is
  // deliberately skipped (`estado`/repoRef stay untouched) and the engine's
  // `salida` (the rejection's markup-encoded lines, e.g. the push hint) is
  // handed back to the caller for inline display instead.
  const hostingCreate = useCallback(
    (input: CreatePullRequestInput): CreatePrOutcome => {
      const repo = repoRef.current ?? GitEngine.vacio();
      const res = GitEngine.createPullRequest(repo, input);
      onActionRef.current?.({ kind: 'hosting', op: 'create', ok: !res.error });
      if (res.error) return { ok: false, lines: res.salida };
      applyResult(res, null);
      // `createPr` always emits exactly one `pr-opened` event on success
      // (hosting/create.ts) — read the new id off it rather than guessing
      // from list order (newest-id-first is a display convention, not a
      // write-order guarantee). Type-narrow instead of casting, and never
      // throw if that invariant is somehow violated: fall back to the
      // newest PR's id (highest id in the post-apply state) so the caller
      // still gets a usable, correctly-typed `CreatePrOutcome`.
      const opened = res.eventos.find((e): e is Extract<GitEvent, { type: 'pr-opened' }> => e.type === 'pr-opened');
      if (opened) return { ok: true, id: opened.id };
      const prs = GitEngine.listPullRequests(res.estado);
      const fallbackId = prs.reduce((max, pr) => Math.max(max, pr.id), 0);
      return { ok: true, id: fallbackId };
    },
    [applyResult],
  );
  const hostingComment = useCallback(
    (id: number, body: string): HostingOutcome => {
      const repo = repoRef.current ?? GitEngine.vacio();
      const res = GitEngine.commentPullRequest(repo, id, body);
      onActionRef.current?.({ kind: 'hosting', op: 'comment', ok: !res.error });
      if (res.error) return { ok: false, lines: res.salida };
      applyResult(res, null);
      return { ok: true };
    },
    [applyResult],
  );
  const hostingClose = useCallback(
    (id: number): HostingOutcome => {
      const repo = repoRef.current ?? GitEngine.vacio();
      const res = GitEngine.closePullRequest(repo, id);
      onActionRef.current?.({ kind: 'hosting', op: 'close', ok: !res.error });
      if (res.error) return { ok: false, lines: res.salida };
      applyResult(res, null);
      return { ok: true };
    },
    [applyResult],
  );
  const hostingReopen = useCallback(
    (id: number): HostingOutcome => {
      const repo = repoRef.current ?? GitEngine.vacio();
      const res = GitEngine.reopenPullRequest(repo, id);
      onActionRef.current?.({ kind: 'hosting', op: 'reopen', ok: !res.error });
      if (res.error) return { ok: false, lines: res.salida };
      applyResult(res, null);
      return { ok: true };
    },
    [applyResult],
  );
  const hostingMerge = useCallback(
    (id: number, strategy: MergeStrategy, deleteBranch: boolean): HostingOutcome => {
      const repo = repoRef.current ?? GitEngine.vacio();
      const res = GitEngine.mergePullRequest(repo, id, strategy, deleteBranch);
      onActionRef.current?.({ kind: 'hosting', op: 'merge', ok: !res.error });
      if (res.error) return { ok: false, lines: res.salida };
      applyResult(res, null);
      return { ok: true };
    },
    [applyResult],
  );
  const hosting: HostingHandlers = useMemo(
    () => ({ create: hostingCreate, comment: hostingComment, close: hostingClose, reopen: hostingReopen, merge: hostingMerge }),
    [hostingCreate, hostingComment, hostingClose, hostingReopen, hostingMerge],
  );

  // Install the debug API once and route calls through a ref to the latest
  // handlers: `run`/`loadRepo` change identity whenever `choreo` does, and
  // reinstalling `window.GitPlayground` on every render is needless churn.
  const debugHandlersRef = useRef({ run, loadRepo });
  useLayoutEffect(() => {
    debugHandlersRef.current = { run, loadRepo };
  });
  useEffect(() => {
    return installDebugApi(window, {
      getRepo: () => repoRef.current,
      run: (comando) => debugHandlersRef.current.run(comando),
      loadRepo: (estado) => debugHandlersRef.current.loadRepo(estado),
    });
  }, []);

  return {
    state,
    run,
    resolveConflict,
    openEditor,
    simulateTeammate,
    saveFile,
    setEditorText,
    closeEditor,
    createFile,
    renameFile,
    deleteFile,
    loadRepo,
    setInput,
    historyPrev,
    historyNext,
    completeInput,
    setResolverHidden,
    toggleResetMenu,
    clearLines,
    persistNow,
    hosting,
  };
}
