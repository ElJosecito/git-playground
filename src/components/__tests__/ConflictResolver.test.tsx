import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConflictResolver } from '../ConflictResolver';
import { resolverModel } from '../../ui/selectors';
import { vacio } from '../../engine/state';
import type { RepoState } from '../../engine/types';

// 1:1 port of the DC template's conflict-resolver panel (design-handoff/
// Git Playground.dc.html, lines 131-164): per-file mine/theirs/both/edit
// buttons call `resolver(...)`, "Ocultar" hides the panel. Phase 6,
// tasks.md 6.5/6.6.
function makeRepo(): RepoState {
  const repo = vacio();
  repo.inited = true;
  repo.files = { 'conf.txt': '<<<<<<< HEAD\na\n=======\nb\n>>>>>>> feature' };
  repo.op = {
    kind: 'merge',
    other: 'deadbeef',
    otherName: 'feature',
    conflicts: ['conf.txt'],
    data: { 'conf.txt': { ours: 'a', theirs: 'b' } },
    msg: 'Merge feature',
    origW: {},
    origI: {},
  };
  return repo;
}

describe('ConflictResolver', () => {
  it('renders the resolver title, the conflicting file, and its pending state', () => {
    const model = resolverModel(makeRepo())!;
    render(<ConflictResolver model={model} onResolve={() => {}} onEdit={() => {}} onHide={() => {}} />);
    expect(screen.getByText('Conflicto de merge')).toBeInTheDocument();
    expect(screen.getByText('conf.txt')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
  });

  it('calls onResolve(file, mode) for mine/theirs/both and onEdit(file) for Editar…', async () => {
    const model = resolverModel(makeRepo())!;
    const onResolve = vi.fn();
    const onEdit = vi.fn();
    render(<ConflictResolver model={model} onResolve={onResolve} onEdit={onEdit} onHide={() => {}} />);
    const user = userEvent.setup();
    await user.click(screen.getByText('Mantener la mía'));
    await user.click(screen.getByText('Mantener la suya'));
    await user.click(screen.getByText('Mantener ambas'));
    await user.click(screen.getByText('Editar…'));
    expect(onResolve).toHaveBeenNthCalledWith(1, 'conf.txt', 'mia');
    expect(onResolve).toHaveBeenNthCalledWith(2, 'conf.txt', 'suya');
    expect(onResolve).toHaveBeenNthCalledWith(3, 'conf.txt', 'ambas');
    expect(onEdit).toHaveBeenCalledWith('conf.txt');
  });

  it('calls onHide when "Ocultar" is clicked', async () => {
    const model = resolverModel(makeRepo())!;
    const onHide = vi.fn();
    render(<ConflictResolver model={model} onResolve={() => {}} onEdit={() => {}} onHide={onHide} />);
    await userEvent.setup().click(screen.getByText('Ocultar'));
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('renders the git-add/continue hint text built from hintSegs', () => {
    const model = resolverModel(makeRepo())!;
    render(<ConflictResolver model={model} onResolve={() => {}} onEdit={() => {}} onHide={() => {}} />);
    expect(screen.getByText(/Elige una versión/)).toBeInTheDocument();
    expect(screen.getByText('git commit')).toBeInTheDocument();
  });
});
