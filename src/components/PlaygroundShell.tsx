// The sandbox route's final assembly (tasks.md 7.9). Phase 2 (tasks.md)
// extracted everything this component owned EXCEPT theme/persistence into
// `useWorkspace`/`WorkspaceView` (design.md Key Decisions: "Workspace
// extraction... Existing PlaygroundShell tests stay green"), so a future
// `LevelShell` (Phase 5) can compose the exact same workspace with its own
// persistence/onAction/bootLines instead of forking this component.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PersistenceDeps } from '../app/useGitPlayground';
import { ThemeProvider, useAppTheme } from '../app/theme/ThemeProvider';
import { usePersistence } from '../hooks/usePersistence';
import { ActionBar } from './ActionBar';
import { useWorkspace } from './workspace/useWorkspace';
import { WorkspaceView } from './workspace/WorkspaceView';
import { CheatsheetPanel, CHEATSHEET_PANEL_ID } from './playground/CheatsheetPanel';
import { useCheatsheetToggleShortcut } from './playground/useCheatsheetToggleShortcut';
import { GitEngine } from '../engine';
import type { RepoState } from '../engine/types';

// Byte-identical to the oracle's post-reset notice lines (design-handoff/Git
// Playground.dc.html's `resetExample`/`resetEmpty`).
const RESET_EXAMPLE_NOTICE = '\x01m\x02Repositorio reiniciado: README.md y dos commits en main.\x03';
const RESET_EMPTY_NOTICE = '\x01m\x02Carpeta vacía. Empieza con git init.\x03';

export function PlaygroundShell() {
  // `ThemeProvider` wraps itself here so the sandbox stays usable standalone
  // (unit tests, or any future caller with no app-level ancestor): when no
  // provider exists yet, it creates one; when the real app already wrapped
  // the route switch in one (`App.tsx`), this is a transparent passthrough
  // and `PlaygroundShellBody` below shares that SAME context instance —
  // closing the cross-route theme gap (app-shell spec delta "Theme set on
  // one route applies to another") instead of keeping its own independent
  // theme state.
  return (
    <ThemeProvider>
      <PlaygroundShellBody />
    </ThemeProvider>
  );
}

function PlaygroundShellBody() {
  // Full `gitpg:v1` round trip (tasks.md 7.3/7.4): read once, lazily, and
  // written back explicitly (design D12) from the same points the oracle's
  // `save()` fires — `useGitPlayground`'s `PersistenceDeps.persist` below
  // covers apply/clear/load; the app-level `ThemeProvider`'s own `toggle()`
  // covers the theme toggle itself (it RMW-writes only the `theme` field via
  // `themeStorage.ts`). `themeRef` lets `persist` read the LATEST context
  // theme value without `useGitPlayground` needing to know about theme at
  // all, and without `persist`'s identity changing on every toggle. Theme
  // and persistence stay HERE (not in `useWorkspace`) because a level
  // session persists to its own level-scoped snapshot, not `gitpg:v1`.
  const persistence = usePersistence();
  const { theme, toggle: onToggleTheme } = useAppTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const persist = useCallback(
    (repo: RepoState, hist: string[]) => {
      persistence.save({ repo, theme: themeRef.current, hist });
    },
    [persistence],
  );
  const persistenceDeps: PersistenceDeps = {
    initialRepo: persistence.initial.repo,
    initialHist: persistence.initial.hist,
    persist,
  };

  const ws = useWorkspace({ persistence: persistenceDeps });
  const cheatsheet = useCheatsheetPanel(ws);

  return (
    <WorkspaceView
      ws={ws}
      toolbar={
        <ActionBar
          showMate={ws.hasRemote}
          mateLabel={ws.view.mobile ? 'Compañero' : 'Simular cambio de un compañero en origin'}
          onMate={ws.playground.simulateTeammate}
          onToggleTheme={onToggleTheme}
          resetOpen={ws.playground.state.resetOpen}
          onToggleReset={ws.playground.toggleResetMenu}
          onResetExample={() => ws.playground.loadRepo(GitEngine.ejemplo(), RESET_EXAMPLE_NOTICE)}
          onResetEmpty={() => ws.playground.loadRepo(GitEngine.vacio(), RESET_EMPTY_NOTICE)}
          showHosting={ws.hostingVisible}
          hostingCount={ws.hostingCount}
          onOpenHosting={ws.hostingView.openView}
          onToggleCheatsheet={cheatsheet.toggle}
          cheatsheetOpen={cheatsheet.open}
          cheatsheetPanelId={CHEATSHEET_PANEL_ID}
          cheatsheetButtonRef={cheatsheet.buttonRef}
        />
      }
    >
      {cheatsheet.open && <CheatsheetPanel onClose={cheatsheet.close} onUse={cheatsheet.use} />}
    </WorkspaceView>
  );
}

// Matches the first `<placeholder>` so it can be selected after insertion
// and the user types straight over it.
const PLACEHOLDER = /<[^>]+>/;

/** Open state, focus return, and "Usar" → terminal input wiring for the
 * sandbox cheatsheet panel. */
function useCheatsheetPanel(ws: ReturnType<typeof useWorkspace>) {
  const [open, setOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const { setInput } = ws.playground;
  const { min, toggleMin } = ws.term;
  const mobile = ws.view.mobile;

  const restoreFocus = useCallback(() => {
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    (target?.isConnected ? target : buttonRef.current)?.focus({ preventScroll: true });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    restoreFocus();
  }, [restoreFocus]);

  const toggle = useCallback(() => {
    if (open) {
      close();
      return;
    }
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }, [open, close]);

  const use = useCallback(
    (command: string) => {
      setInput(command);
      if (min) toggleMin();
      // On mobile the sheet covers the terminal, so get out of the way.
      if (mobile) setOpen(false);
      returnFocusRef.current = null;
      setFocusRequest((n) => n + 1);
    },
    [setInput, min, toggleMin, mobile],
  );

  useCheatsheetToggleShortcut(toggle);

  // Runs after the inserted text is committed to the terminal input.
  useEffect(() => {
    if (!focusRequest) return;
    const input = ws.termWindowRef.current?.querySelector<HTMLInputElement>('input');
    if (!input) return;
    input.focus({ preventScroll: true });
    const match = PLACEHOLDER.exec(input.value);
    const start = match ? match.index : input.value.length;
    input.setSelectionRange(start, match ? start + match[0].length : start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest]);

  return { open, toggle, close, use, buttonRef };
}
