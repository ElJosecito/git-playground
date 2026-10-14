// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewPullRequestForm } from '../NewPullRequestForm';
import type { CreatePrOutcome } from '../../../app/useGitPlayground';

// New behavior (spec "hosting-web-view" domain, "Creation Form" requirement,
// UX fix: branch pickers are native `<select>`s offering every known origin
// branch — not a free-text `<datalist>` input the user could fail to find
// branches in).
describe('NewPullRequestForm', () => {
  it('submits the default base/compare branches plus typed title/body to onCreate', async () => {
    const onCreate = vi.fn((): CreatePrOutcome => ({ ok: true, id: 1 }));
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<NewPullRequestForm originBranches={['main', 'feature']} onCreate={onCreate} onCreated={onCreated} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Título'), 'Mi cambio');
    await user.type(screen.getByLabelText('Descripción'), 'Explica el cambio');
    await user.click(screen.getByText('Crear pull request'));

    expect(onCreate).toHaveBeenCalledWith({ source: 'feature', target: 'main', title: 'Mi cambio', body: 'Explica el cambio' });
  });

  it('defaults the base branch to "main" when it exists among the origin branches', () => {
    render(<NewPullRequestForm originBranches={['main', 'develop']} onCreate={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText('Base')).toHaveValue('main');
  });

  it('defaults the compare branch to the first origin branch that is not the base', () => {
    render(<NewPullRequestForm originBranches={['main', 'develop']} onCreate={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText('Comparar')).toHaveValue('develop');
  });

  it('shows the "Elige una rama" placeholder when there is no other branch to default compare to', () => {
    render(<NewPullRequestForm originBranches={['main']} onCreate={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText('Comparar')).toHaveValue('');
    expect(screen.getByText('Elige una rama')).toBeInTheDocument();
  });

  it('offers every origin branch as a Base option, and every one except the current Base as a Comparar option', () => {
    render(<NewPullRequestForm originBranches={['main', 'feature', 'hotfix']} onCreate={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} />);
    const base = screen.getByLabelText('Base') as HTMLSelectElement;
    const compare = screen.getByLabelText('Comparar') as HTMLSelectElement;
    expect(Array.from(base.options).map((o) => o.value)).toEqual(['main', 'feature', 'hotfix']);
    expect(Array.from(compare.options).map((o) => o.value)).toEqual(['feature', 'hotfix']);
  });

  // Fresh-review fix: the old unfiltered picker let the user select the
  // same branch for both Base and Comparar, which the engine always
  // rejects ("La rama de origen y la rama de destino no pueden ser la
  // misma.") — removing it from the list prevents that dead-end entirely.
  it('never offers the current Base branch as a Comparar option, so source===target cannot be selected', () => {
    render(<NewPullRequestForm originBranches={['main', 'feature']} onCreate={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} />);
    const compare = screen.getByLabelText('Comparar') as HTMLSelectElement;
    expect(Array.from(compare.options).map((o) => o.value)).not.toContain('main');
  });

  it('resets Comparar to a fresh default when changing Base to the currently-selected Comparar branch', async () => {
    const user = userEvent.setup();
    render(<NewPullRequestForm originBranches={['main', 'feature', 'hotfix']} onCreate={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} />);
    // Defaults: Base=main, Comparar=feature.
    await user.selectOptions(screen.getByLabelText('Comparar'), 'hotfix');
    expect(screen.getByLabelText('Comparar')).toHaveValue('hotfix');

    await user.selectOptions(screen.getByLabelText('Base'), 'hotfix');

    expect(screen.getByLabelText('Base')).toHaveValue('hotfix');
    expect(screen.getByLabelText('Comparar')).toHaveValue('main');
  });

  it('resets Comparar away from the new Base to the remaining valid branch', async () => {
    const user = userEvent.setup();
    render(<NewPullRequestForm originBranches={['main', 'feature']} onCreate={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} />);
    await user.selectOptions(screen.getByLabelText('Base'), 'feature');
    expect(screen.getByLabelText('Comparar')).toHaveValue('main');
  });

  // Fresh-review fix: `originBranches` is a fresh array literal every
  // render in the real app (`useWorkspace`'s `originBranches` isn't
  // memoized), so a user's in-progress selection must only be resynced when
  // the branch LIST actually changes (content), never on every unrelated
  // rerender with an equal-content-but-different-reference array.
  describe('resyncing selections when originBranches changes on rerender', () => {
    it('falls back Base to "main" (or the first branch) when the selected one disappears', () => {
      const { rerender } = render(
        <NewPullRequestForm originBranches={['main', 'feature']} onCreate={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} />,
      );
      expect(screen.getByLabelText('Base')).toHaveValue('main');
      rerender(<NewPullRequestForm originBranches={['feature', 'hotfix']} onCreate={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByLabelText('Base')).toHaveValue('feature');
    });

    it('falls back Comparar to a valid non-base branch when the selected one disappears', () => {
      const { rerender } = render(
        <NewPullRequestForm originBranches={['main', 'feature']} onCreate={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} />,
      );
      expect(screen.getByLabelText('Comparar')).toHaveValue('feature');
      rerender(<NewPullRequestForm originBranches={['main', 'hotfix']} onCreate={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByLabelText('Comparar')).toHaveValue('hotfix');
    });

    it('does NOT reset a still-valid user selection when originBranches is a new array with the SAME content', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <NewPullRequestForm originBranches={['main', 'feature', 'hotfix']} onCreate={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} />,
      );
      await user.selectOptions(screen.getByLabelText('Comparar'), 'hotfix');
      // A brand-new array literal with identical content (as the real app
      // produces on every unrelated re-render) must not clobber the choice.
      rerender(<NewPullRequestForm originBranches={['main', 'feature', 'hotfix']} onCreate={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByLabelText('Comparar')).toHaveValue('hotfix');
    });
  });

  it('lets the user change source/target via the pickers', async () => {
    const onCreate = vi.fn((): CreatePrOutcome => ({ ok: true, id: 1 }));
    const user = userEvent.setup();
    render(<NewPullRequestForm originBranches={['main', 'feature', 'hotfix']} onCreate={onCreate} onCreated={vi.fn()} onCancel={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText('Comparar'), 'hotfix');
    await user.type(screen.getByLabelText('Título'), 'Mi cambio');
    await user.click(screen.getByText('Crear pull request'));

    expect(onCreate).toHaveBeenCalledWith({ source: 'hotfix', target: 'main', title: 'Mi cambio', body: '' });
  });

  it('shows the always-visible push hint explaining only origin-pushed branches appear', () => {
    render(<NewPullRequestForm originBranches={['main', 'feature']} onCreate={vi.fn()} onCreated={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/Solo aparecen las ramas que ya subiste a origin/)).toBeInTheDocument();
  });

  it('shows the engine rejection inline and does NOT navigate away when creation is rejected (no PR created)', async () => {
    const onCreate = vi.fn(
      (): CreatePrOutcome => ({
        ok: false,
        lines: ['\x01e\x02La rama de origen y la rama de destino no pueden ser la misma.\x03'],
      }),
    );
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<NewPullRequestForm originBranches={['main', 'feature']} onCreate={onCreate} onCreated={onCreated} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Título'), 'Mi cambio');
    await user.click(screen.getByText('Crear pull request'));

    expect(onCreate).toHaveBeenCalledTimes(1);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('La rama de origen y la rama de destino no pueden ser la misma.');
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('calls onCreated with the new PR id (navigates to its detail) when creation succeeds', async () => {
    const onCreate = vi.fn((): CreatePrOutcome => ({ ok: true, id: 42 }));
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<NewPullRequestForm originBranches={['main', 'feature']} onCreate={onCreate} onCreated={onCreated} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Título'), 'Mi cambio');
    await user.click(screen.getByText('Crear pull request'));

    expect(onCreated).toHaveBeenCalledWith(42);
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
