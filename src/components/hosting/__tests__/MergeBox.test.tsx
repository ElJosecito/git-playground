// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MergeBox } from '../MergeBox';
import type { Mergeability } from '../../../engine/hosting/types';
import type { HostingOutcome } from '../../../app/useGitPlayground';

// New behavior (spec "hosting-web-view" domain, "Merge Box" requirement:
// "disabled/hidden entirely" on conflicts; "usable+warning" on outdated;
// "only 'Rebase' is disabled" when canRebase:false while base is clean).
function cleanMergeability(overrides: Partial<Mergeability> = {}): Mergeability {
  return { state: 'clean', conflicts: [], ahead: 1, behind: 0, outdated: false, canRebase: true, ...overrides };
}

describe('MergeBox', () => {
  it('shows the 3-strategy selector, "Eliminar rama" checkbox, and "Fusionar pull request" button when mergeability is clean', () => {
    render(<MergeBox mergeability={cleanMergeability()} target="main" onMerge={vi.fn()} />);
    expect(screen.getByLabelText('Estrategia de fusión')).toBeInTheDocument();
    expect(screen.getByText('Eliminar rama')).toBeInTheDocument();
    expect(screen.getByText('Fusionar pull request')).toBeInTheDocument();
  });

  it('hides the entire box (no selector, no merge button) and shows a conflict explanation when mergeability is "conflicts"', () => {
    render(
      <MergeBox
        mergeability={{ state: 'conflicts', conflicts: ['a.txt'], ahead: 1, behind: 1, outdated: false, canRebase: false }}
        target="main"
        onMerge={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('Estrategia de fusión')).not.toBeInTheDocument();
    expect(screen.queryByText('Fusionar pull request')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('a.txt');
    expect(screen.getByRole('alert')).toHaveTextContent('Resuélvelos localmente');
  });

  it('hides the entire box when mergeability is "missing-branch"', () => {
    render(<MergeBox mergeability={{ state: 'missing-branch', conflicts: [], ahead: 0, behind: 0, outdated: false, canRebase: false }} target="main" onMerge={vi.fn()} />);
    expect(screen.queryByText('Fusionar pull request')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('falta la rama');
  });

  it('shows a non-blocking warning AND a usable merge button when mergeability is outdated', () => {
    render(<MergeBox mergeability={cleanMergeability({ outdated: true })} target="main" onMerge={vi.fn()} />);
    expect(screen.getByText(/avanzó desde que se creó este pull request/)).toBeInTheDocument();
    expect(screen.getByText('Fusionar pull request')).toBeEnabled();
  });

  it('disables only the "Rebase and merge" option when canRebase is false while the base merge is clean', () => {
    render(<MergeBox mergeability={cleanMergeability({ canRebase: false })} target="main" onMerge={vi.fn()} />);
    expect(screen.getByRole('option', { name: 'Rebase and merge' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Crear merge commit' })).toBeEnabled();
    expect(screen.getByRole('option', { name: 'Squash and merge' })).toBeEnabled();
    expect(screen.getByText('Fusionar pull request')).toBeEnabled();
  });

  it('submits the selected strategy and delete-branch flag to onMerge', async () => {
    const onMerge = vi.fn((): HostingOutcome => ({ ok: true }));
    const user = userEvent.setup();
    render(<MergeBox mergeability={cleanMergeability()} target="main" onMerge={onMerge} />);
    await user.selectOptions(screen.getByLabelText('Estrategia de fusión'), 'squash');
    await user.click(screen.getByText('Eliminar rama'));
    await user.click(screen.getByText('Fusionar pull request'));
    expect(onMerge).toHaveBeenCalledWith('squash', true);
  });

  it('shows the engine rejection inline when onMerge fails, without throwing', async () => {
    const onMerge = vi.fn((): HostingOutcome => ({ ok: false, lines: ['\x01e\x02No se puede fusionar el pull request #1: hay conflictos.\x03'] }));
    const user = userEvent.setup();
    render(<MergeBox mergeability={cleanMergeability()} target="main" onMerge={onMerge} />);
    await user.click(screen.getByText('Fusionar pull request'));
    expect(screen.getByRole('alert')).toHaveTextContent('No se puede fusionar el pull request #1');
  });
});
