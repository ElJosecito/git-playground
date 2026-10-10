// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewPullRequestForm } from '../NewPullRequestForm';
import type { HostingOutcome } from '../../../app/useGitPlayground';

// New behavior (spec "hosting-web-view" domain, "Creation Form" requirement:
// "Form to pick source/target, title, description, surfacing engine
// rejection reasons inline" / "Rejected creation shows guidance — GIVEN
// source not pushed to origin WHEN submitted THEN shows `git push -u origin
// <rama>` guidance, no PR created").
describe('NewPullRequestForm', () => {
  it('submits the typed source/target/title/body to onCreate', async () => {
    const onCreate = vi.fn((): HostingOutcome => ({ ok: true }));
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<NewPullRequestForm originBranches={['main']} onCreate={onCreate} onCreated={onCreated} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Comparar'), 'feature');
    await user.type(screen.getByLabelText('Título'), 'Mi cambio');
    await user.type(screen.getByLabelText('Descripción'), 'Explica el cambio');
    await user.click(screen.getByText('Crear pull request'));

    expect(onCreate).toHaveBeenCalledWith({ source: 'feature', target: 'main', title: 'Mi cambio', body: 'Explica el cambio' });
  });

  it('defaults the base branch to "main" when it exists among the origin branches', () => {
    render(<NewPullRequestForm originBranches={['main', 'develop']} onCreate={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText('Base')).toHaveValue('main');
  });

  it('shows the engine push-hint guidance inline and does NOT navigate away when creation is rejected (no PR created)', async () => {
    const onCreate = vi.fn(
      (): HostingOutcome => ({
        ok: false,
        lines: ['\x01e\x02La rama feature no existe en origin.\x03', '\x01m\x02git push -u origin feature\x03'],
      }),
    );
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<NewPullRequestForm originBranches={['main']} onCreate={onCreate} onCreated={onCreated} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Comparar'), 'feature');
    await user.type(screen.getByLabelText('Título'), 'Mi cambio');
    await user.click(screen.getByText('Crear pull request'));

    expect(onCreate).toHaveBeenCalledTimes(1);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('La rama feature no existe en origin.');
    expect(alert).toHaveTextContent('git push -u origin feature');
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('calls onCreated (navigates back to the list) when creation succeeds', async () => {
    const onCreate = vi.fn((): HostingOutcome => ({ ok: true }));
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<NewPullRequestForm originBranches={['main']} onCreate={onCreate} onCreated={onCreated} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Comparar'), 'feature');
    await user.type(screen.getByLabelText('Título'), 'Mi cambio');
    await user.click(screen.getByText('Crear pull request'));

    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the no-origin-branches guidance and disables submit when origin has no branches yet', () => {
    render(<NewPullRequestForm originBranches={[]} onCreate={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/Todavía no hay ramas en origin/)).toBeInTheDocument();
    expect(screen.getByText('Crear pull request')).toBeDisabled();
  });

  it('calls onCancel when "Cancelar" is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<NewPullRequestForm originBranches={['main']} onCreate={vi.fn()} onCreated={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
