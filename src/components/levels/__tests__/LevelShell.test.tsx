// @vitest-environment jsdom
// RED (tasks.md Phase 5, 5.1): `LevelShell`'s behavioral contract — solve
// flow, hint-caps-1-star, solution-counts-as-hint, reset, success-modal
// locked-world/no-next-level gating, live budget, snapshot restore.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LevelShell } from '../LevelShell';
import { ProgressProvider } from '../../../lessons/progress/ProgressContext';
import { ThemeProvider } from '../../../app/theme/ThemeProvider';
import { basics01PrimerCommit, basics02StatusYStage } from '../../../lessons/catalog/w1-basicos';
import { unlockMetaOf } from '../../../lessons/catalog/index';

async function runCommands(commands: string[]): Promise<void> {
  const user = userEvent.setup();
  const input = screen.getByLabelText('Comando');
  for (const cmd of commands) {
    await user.type(input, `${cmd}{Enter}`);
  }
}

function renderLevel(level = basics01PrimerCommit, onResetLevel = vi.fn()) {
  return render(
    <ThemeProvider>
      <ProgressProvider levels={unlockMetaOf()}>
        <LevelShell level={level} onResetLevel={onResetLevel} />
      </ProgressProvider>
    </ThemeProvider>,
  );
}

describe('LevelShell', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    delete (window as { GitPlayground?: unknown }).GitPlayground;
  });

  it('solve flow: completing the goals within budget with no hints shows 3 stars', async () => {
    renderLevel();
    await runCommands(['git init', 'touch README.md', 'echo "Mi proyecto" > README.md', 'git add README.md', 'git commit -m "Primer commit"']);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('3 de 3 estrellas')).toBeInTheDocument();
  });

  it('the success dialog reports the run stats (commands vs budget, hints)', async () => {
    renderLevel();
    await runCommands(['git init', 'touch README.md', 'echo "Mi proyecto" > README.md', 'git add README.md', 'git commit -m "Primer commit"']);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Tu primer commit');
    expect(screen.getByLabelText(/^Comandos: \d+ de 7$/)).toBeInTheDocument();
    expect(screen.getByLabelText('Pistas usadas: 0')).toBeInTheDocument();
  });

  it('revealing a hint caps stars at 1, even if the solve finishes within budget', async () => {
    renderLevel();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /ver pista/i }));
    await runCommands(['git init', 'touch README.md', 'echo "Mi proyecto" > README.md', 'git add README.md', 'git commit -m "Primer commit"']);
    expect(screen.getByLabelText('1 de 3 estrellas')).toBeInTheDocument();
    void user;
  });

  it('viewing the solution counts as a hint used — also caps stars at 1', async () => {
    renderLevel();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /ver solución/i }));
    await user.click(screen.getByRole('button', { name: /ver de todas formas/i }));
    await runCommands(['git init', 'touch README.md', 'echo "Mi proyecto" > README.md', 'git add README.md', 'git commit -m "Primer commit"']);
    expect(screen.getByLabelText('1 de 3 estrellas')).toBeInTheDocument();
  });

  it('"Reiniciar nivel" clears the saved snapshot and calls onResetLevel', async () => {
    const onResetLevel = vi.fn();
    renderLevel(basics01PrimerCommit, onResetLevel);
    await runCommands(['git init']);
    expect(JSON.parse(localStorage.getItem('gitpg:levels:v1')!).inProgress['basics-01-primer-commit']).toBeDefined();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Reiniciar nivel' }));
    expect(onResetLevel).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('gitpg:levels:v1')!).inProgress['basics-01-primer-commit']).toBeUndefined();
  });

  it('shows no "Siguiente nivel" action when the level has no next level in the catalog', async () => {
    // Phase 7: the real catalog now has a level after basics-02, so this
    // test instead uses a clone with an id that isn't in the catalog at
    // all — `nextLevelOf` returns null for any id it can't find (see its
    // `idx < 0` branch), which is exactly the "no next level" case this
    // test covers, independent of how many levels the catalog has.
    renderLevel({ ...basics02StatusYStage, id: 'test-no-next-level' });
    await runCommands(['git add a.txt', 'git commit -m "Agrega a.txt"']);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Siguiente nivel' })).not.toBeInTheDocument();
  });

  it('the budget meter updates live as counted actions are submitted', async () => {
    renderLevel();
    expect(screen.getByText('0 / 7')).toBeInTheDocument();
    await runCommands(['git status']);
    expect(screen.getByText('0 / 7')).toBeInTheDocument();
    await runCommands(['git init']);
    expect(screen.getByText('1 / 7')).toBeInTheDocument();
  });

  it('restores an in-progress snapshot (repo + counter) on remount for the same level', async () => {
    const { unmount } = renderLevel();
    await runCommands(['git init']);
    expect(screen.getByText('1 / 7')).toBeInTheDocument();
    unmount();

    renderLevel();
    expect(screen.getByText('1 / 7')).toBeInTheDocument();
  });

  it('persists a revealed hint immediately, even with no command run yet — a remount+solve still caps at 1 star', async () => {
    const user = userEvent.setup();
    const { unmount } = renderLevel();
    await user.click(screen.getByRole('button', { name: /ver pista/i }));
    unmount();

    renderLevel();
    await runCommands(['git init', 'touch README.md', 'echo "Mi proyecto" > README.md', 'git add README.md', 'git commit -m "Primer commit"']);
    expect(screen.getByLabelText('1 de 3 estrellas')).toBeInTheDocument();
  });

  it('persists a solution reveal immediately, even with no command run yet — a remount+solve still caps at 1 star', async () => {
    const user = userEvent.setup();
    const { unmount } = renderLevel();
    await user.click(screen.getByRole('button', { name: /ver solución/i }));
    await user.click(screen.getByRole('button', { name: /ver de todas formas/i }));
    unmount();

    renderLevel();
    await runCommands(['git init', 'touch README.md', 'echo "Mi proyecto" > README.md', 'git add README.md', 'git commit -m "Primer commit"']);
    expect(screen.getByLabelText('1 de 3 estrellas')).toBeInTheDocument();
  });

  it('pressing Escape on the success dialog closes it, returning to the level view with completion kept', async () => {
    renderLevel();
    await runCommands(['git init', 'touch README.md', 'echo "Mi proyecto" > README.md', 'git add README.md', 'git commit -m "Primer commit"']);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('gitpg:levels:v1')!).completed['basics-01-primer-commit']).toBeDefined();
  });

  it('theme toggle in a level switches the app-wide theme (it used to be a no-op)', async () => {
    renderLevel();
    const before = document.documentElement.dataset.theme;
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cambiar tema' }));
    expect(document.documentElement.dataset.theme).not.toBe(before);
  });

  // FilesStrip panel buttons ("+ Nuevo archivo" etc.) reuse the exact same
  // `useWorkspace`/`WorkspaceView` a level already shares with the sandbox,
  // so a button-created file (1) still drives `evaluateLevel`'s goal checks
  // off the real repo state and (2) must NOT add to the command budget —
  // only typed/debug-API commands and resolveConflict/saveFile do.
  it('a file created via the FilesStrip "+ Nuevo archivo" button counts toward the level goal but NOT the command budget', async () => {
    renderLevel();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Comando'), 'git init{Enter}');

    await user.click(screen.getByText('+ Nuevo archivo'));
    await user.type(screen.getByRole('textbox', { name: 'Nombre del nuevo archivo' }), 'README.md{Enter}');
    // The button action closed its inline form and did not echo anything
    // to the terminal (no new line beyond the "git init" echo+output).
    expect(screen.queryByRole('textbox', { name: 'Nombre del nuevo archivo' })).not.toBeInTheDocument();

    await runCommands(['git add README.md', 'git commit -m "Primer commit"']);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // 3 typed commands (git init, git add, git commit) out of a 7 budget —
    // the button-driven file creation did not bump the count.
    expect(screen.getByLabelText('Comandos: 3 de 7')).toBeInTheDocument();
  });
});
