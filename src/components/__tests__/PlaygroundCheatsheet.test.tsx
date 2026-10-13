// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlaygroundShell } from '../PlaygroundShell';

// The in-sandbox cheatsheet panel: reuses the `#/cheatsheet` data/search
// and lets the user drop a supported command into the terminal input.
describe('PlaygroundShell cheatsheet panel', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    delete (window as { GitPlayground?: unknown }).GitPlayground;
    delete document.documentElement.dataset.theme;
  });

  function toggleButton() {
    return screen.getByRole('button', { name: 'Cheatsheet' });
  }

  it('opens and closes from the action bar button, managing focus', async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell />);
    expect(screen.queryByRole('dialog', { name: 'Cheatsheet' })).not.toBeInTheDocument();
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggleButton());
    const panel = screen.getByRole('dialog', { name: 'Cheatsheet' });
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'true');
    expect(within(panel).getByRole('searchbox', { name: 'Buscar comandos' })).toHaveFocus();

    await user.click(within(panel).getByRole('button', { name: 'Cerrar cheatsheet' }));
    expect(screen.queryByRole('dialog', { name: 'Cheatsheet' })).not.toBeInTheDocument();
    expect(toggleButton()).toHaveFocus();
  });

  it('toggles with Ctrl+K even while typing in the terminal, without touching the input', async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell />);
    const input = screen.getByLabelText('Comando');
    await user.type(input, 'git st');
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('dialog', { name: 'Cheatsheet' })).toBeInTheDocument();
    expect(input).toHaveValue('git st');
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.queryByRole('dialog', { name: 'Cheatsheet' })).not.toBeInTheDocument();
  });

  it('toggles with Cmd+K too', async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell />);
    await user.keyboard('{Meta>}k{/Meta}');
    expect(screen.getByRole('dialog', { name: 'Cheatsheet' })).toBeInTheDocument();
  });

  it('closes on Escape when the search is empty', async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell />);
    await user.click(toggleButton());
    const search = within(screen.getByRole('dialog', { name: 'Cheatsheet' })).getByRole('searchbox');
    await user.type(search, 'stash');
    await user.keyboard('{Escape}');
    expect(search).toHaveValue('');
    expect(screen.getByRole('dialog', { name: 'Cheatsheet' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Cheatsheet' })).not.toBeInTheDocument();
    expect(toggleButton()).toHaveFocus();
  });

  it('filters the command list with the search field', async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell />);
    await user.click(toggleButton());
    const panel = screen.getByRole('dialog', { name: 'Cheatsheet' });
    expect(within(panel).getByText('git init')).toBeInTheDocument();
    await user.type(within(panel).getByRole('searchbox'), 'stash');
    expect(within(panel).getByText('git stash pop')).toBeInTheDocument();
    expect(within(panel).queryByText('git init')).not.toBeInTheDocument();
  });

  it('"/" focuses the panel search when focus is not in a field', async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell />);
    await user.click(toggleButton());
    const search = within(screen.getByRole('dialog', { name: 'Cheatsheet' })).getByRole('searchbox');
    toggleButton().focus();
    await user.keyboard('/');
    expect(search).toHaveFocus();
    expect(search).toHaveValue('');
  });

  it('shows the explanation and shortcuts of a command on demand', async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell />);
    await user.click(toggleButton());
    const panel = screen.getByRole('dialog', { name: 'Cheatsheet' });
    const details = within(panel).getByText('git stash pop').closest('li')!;
    const more = within(details).getByText('Ver detalles');
    expect(more.closest('details')).not.toHaveAttribute('open');
    await user.click(more);
    expect(more.closest('details')).toHaveAttribute('open');
  });

  it('"Usar" inserts the command into the terminal input without running it and focuses it', async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell />);
    await user.click(toggleButton());
    const panel = screen.getByRole('dialog', { name: 'Cheatsheet' });
    await user.type(within(panel).getByRole('searchbox'), 'switch -c');
    await user.click(within(panel).getByRole('button', { name: 'Usar git switch -c <rama>' }));
    const input = screen.getByLabelText('Comando');
    expect(input).toHaveValue('git switch -c <rama>');
    expect(input).toHaveFocus();
    expect(screen.queryByText(/Switched|Cambiado a/)).not.toBeInTheDocument();
  });

  it('only offers "Usar" for commands the simulator supports', async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell />);
    await user.click(toggleButton());
    const panel = screen.getByRole('dialog', { name: 'Cheatsheet' });
    expect(within(panel).queryByRole('button', { name: /^Usar git clone/ })).not.toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Usar git status' })).toBeInTheDocument();
  });
});
