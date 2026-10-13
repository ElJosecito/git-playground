import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilesStrip } from '../FilesStrip';
import { filesModel, stripSummary } from '../../ui/selectors';
import { vacio, nuevoCommit, setHead } from '../../engine/state';
import type { RepoState } from '../../engine/types';
import type { FileActionResult, FilesStripProps } from '../FilesStrip';

// 1:1 port of the DC template's files-strip panel (design-handoff/Git
// Playground.dc.html, lines 37-86): working-dir/staging/last-commit
// columns carrying `data-zone`/`data-chip` (design D15, so Phase 5's
// choreography can measure+fly them), plus the mobile floating-button
// variant. Phase 6, tasks.md 6.5/6.6. The file-management buttons
// ("+ Nuevo archivo" / "Editar" / "Renombrar" / "Borrar") shipped later
// (students shouldn't need touch/mv/rm/edit in the terminal).
function makeRepo(): RepoState {
  const repo = vacio();
  repo.inited = true;
  const c = nuevoCommit(repo, { msg: 'first', parents: [], tree: { 'README.md': '# Hi' }, lane: 0 });
  setHead(repo, c.hash, 'init');
  repo.index = { 'README.md': '# Hi', 'staged.txt': 'new content' };
  repo.files = { 'README.md': '# Hi', 'new.txt': 'content', 'staged.txt': 'new content' };
  return repo;
}

function makeSingleFileRepo(): RepoState {
  const repo = vacio();
  repo.inited = true;
  repo.files = { 'solo.txt': 'content' };
  return repo;
}

/** Renders FilesStrip wired to real React state, so a successful delete/
 * rename actually removes/renames the row in the next render — a plain
 * `vi.fn()` stub (as `baseProps()` uses) never changes `model`, so it can't
 * exercise the "the deleted/renamed row's own button no longer exists"
 * focus-restoration path these tests target. */
function DeleteHarness({ initialRepo }: { initialRepo: RepoState }) {
  const [repo, setRepo] = useState(initialRepo);
  const onDeleteFile = (name: string): FileActionResult => {
    const files = { ...repo.files };
    delete files[name];
    setRepo({ ...repo, files });
    return { ok: true };
  };
  return <FilesStrip {...baseProps({ model: filesModel(repo), onDeleteFile })} />;
}

function RenameHarness({ initialRepo }: { initialRepo: RepoState }) {
  const [repo, setRepo] = useState(initialRepo);
  const onRenameFile = (from: string, to: string): FileActionResult => {
    const files = { ...repo.files };
    files[to] = files[from]!;
    delete files[from];
    setRepo({ ...repo, files });
    return { ok: true };
  };
  return <FilesStrip {...baseProps({ model: filesModel(repo), onRenameFile })} />;
}

function baseProps(overrides: Partial<FilesStripProps> = {}): FilesStripProps {
  return {
    model: filesModel(makeRepo()),
    summary: '',
    mobile: false,
    open: true,
    mobileShown: false,
    onToggle: vi.fn(),
    onShowMobile: vi.fn(),
    onCreateFile: vi.fn(() => ({ ok: true })),
    onRenameFile: vi.fn(() => ({ ok: true })),
    onDeleteFile: vi.fn(() => ({ ok: true })),
    onEditFile: vi.fn(),
    ...overrides,
  };
}

describe('FilesStrip (desktop)', () => {
  it('renders the header with "Archivos" and the summary, and the three data-zone columns', () => {
    const repo = makeRepo();
    const model = filesModel(repo);
    const summary = stripSummary(repo);
    render(<FilesStrip {...baseProps({ model, summary })} />);
    expect(screen.getByText('Archivos')).toBeInTheDocument();
    expect(screen.getByText(summary)).toBeInTheDocument();
    expect(document.querySelector('[data-zone="w"]')).toBeInTheDocument();
    expect(document.querySelector('[data-zone="s"]')).toBeInTheDocument();
    expect(document.querySelector('[data-zone="c"]')).toBeInTheDocument();
  });

  it('renders a data-chip element per working-dir/staging/commit file, exactly as Phase 5 choreography expects', () => {
    const repo = makeRepo();
    const model = filesModel(repo);
    render(<FilesStrip {...baseProps({ model })} />);
    expect(document.querySelector('[data-chip="w:new.txt"]')).toBeInTheDocument();
    expect(document.querySelector('[data-chip="s:staged.txt"]')).toBeInTheDocument();
    expect(document.querySelector('[data-chip="c:__head"]')).toBeInTheDocument();
    expect(document.querySelector('[data-chip="c:README.md"]')).toBeInTheDocument();
  });

  it('shows "vacío" for an empty column', () => {
    const repo = vacio();
    repo.inited = true;
    const model = filesModel(repo);
    render(<FilesStrip {...baseProps({ model })} />);
    expect(screen.getAllByText('vacío').length).toBeGreaterThan(0);
  });

  it('calls onToggle when the header is clicked', async () => {
    const onToggle = vi.fn();
    render(<FilesStrip {...baseProps({ summary: 'x', onToggle })} />);
    await userEvent.setup().click(screen.getByText('Archivos'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('does not render the body columns when collapsed (open: false)', () => {
    render(<FilesStrip {...baseProps({ summary: 'x', open: false })} />);
    expect(document.querySelector('[data-zone="w"]')).not.toBeInTheDocument();
  });
});

describe('FilesStrip (mobile)', () => {
  it('renders only the floating "Archivos" button with the file count when the panel is not shown', async () => {
    const onShowMobile = vi.fn();
    render(<FilesStrip {...baseProps({ summary: 'x', mobile: true, mobileShown: false, onShowMobile })} />);
    const button = screen.getByText('Archivos').closest('button')!;
    expect(button).toBeInTheDocument();
    expect(document.querySelector('[data-zone="w"]')).not.toBeInTheDocument();
    await userEvent.setup().click(button);
    expect(onShowMobile).toHaveBeenCalledTimes(1);
  });

  it('renders the full panel (always expanded) when the mobile panel is shown', () => {
    render(<FilesStrip {...baseProps({ summary: 'x', mobile: true, open: false, mobileShown: true })} />);
    expect(document.querySelector('[data-zone="w"]')).toBeInTheDocument();
  });

  it('renders the "+ Nuevo archivo" button and per-file actions in the mobile floating variant too', () => {
    render(<FilesStrip {...baseProps({ summary: 'x', mobile: true, open: false, mobileShown: true })} />);
    expect(screen.getByText('+ Nuevo archivo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar new.txt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Renombrar new.txt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Borrar new.txt' })).toBeInTheDocument();
  });
});

describe('FilesStrip / per-file actions', () => {
  it('renders Editar/Renombrar/Borrar with aria-labels that include the file name, for every actionable working-dir file', () => {
    render(<FilesStrip {...baseProps()} />);
    for (const name of ['README.md', 'new.txt', 'staged.txt']) {
      expect(screen.getByRole('button', { name: `Editar ${name}` })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `Renombrar ${name}` })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `Borrar ${name}` })).toBeInTheDocument();
    }
  });

  it('does not render action buttons for a non-actionable chip (deleted or in conflict)', () => {
    const repo = makeRepo();
    delete repo.files['staged.txt']; // still in the index, but gone from the working tree: "borrado, sin preparar"
    const model = filesModel(repo);
    const deletedChip = model.wd.find((f) => f.name === 'staged.txt');
    expect(deletedChip?.deco).toBe('line-through');
    render(<FilesStrip {...baseProps({ model })} />);
    expect(screen.queryByRole('button', { name: 'Editar staged.txt' })).not.toBeInTheDocument();
    // Other, unaffected files stay actionable.
    expect(screen.getByRole('button', { name: 'Editar new.txt' })).toBeInTheDocument();
  });

  it('does not render action buttons for a file in conflict (letter "!") — the ConflictResolver panel handles those instead', () => {
    const repo = makeRepo();
    repo.op = { kind: 'merge', other: 'x', otherName: 'x', conflicts: ['new.txt'], data: {}, msg: 'm', origW: {}, origI: {} };
    const model = filesModel(repo);
    const conflictChip = model.wd.find((f) => f.name === 'new.txt');
    expect(conflictChip?.letter).toBe('!');
    render(<FilesStrip {...baseProps({ model })} />);
    expect(screen.queryByRole('button', { name: 'Editar new.txt' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Renombrar new.txt' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Borrar new.txt' })).not.toBeInTheDocument();
  });

  it('Editar calls onEditFile with the file name directly (same flow as the "edit <archivo>" command)', async () => {
    const onEditFile = vi.fn();
    render(<FilesStrip {...baseProps({ onEditFile })} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Editar new.txt' }));
    expect(onEditFile).toHaveBeenCalledWith('new.txt');
  });

  it('Renombrar opens an inline input pre-filled with the current name, submits on Enter, and cancels on Escape', async () => {
    const onRenameFile = vi.fn(() => ({ ok: true }));
    render(<FilesStrip {...baseProps({ onRenameFile })} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Renombrar new.txt' }));
    const input = screen.getByRole('textbox', { name: 'Nuevo nombre para new.txt' });
    expect(input).toHaveValue('new.txt');
    expect(input).toHaveFocus();
    await user.clear(input);
    await user.type(input, 'renombrado.txt{Enter}');
    expect(onRenameFile).toHaveBeenCalledWith('new.txt', 'renombrado.txt');
    // Closed back to the normal action row after a successful rename.
    expect(screen.queryByRole('textbox', { name: 'Nuevo nombre para new.txt' })).not.toBeInTheDocument();
  });

  it('Renombrar shows an inline Spanish error and keeps the input open when the engine rejects it', async () => {
    const onRenameFile = vi.fn(() => ({ ok: false, error: 'Ya existe un archivo llamado "staged.txt".' }));
    render(<FilesStrip {...baseProps({ onRenameFile })} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Renombrar new.txt' }));
    const input = screen.getByRole('textbox', { name: 'Nuevo nombre para new.txt' });
    await user.clear(input);
    await user.type(input, 'staged.txt{Enter}');
    expect(screen.getByText('Ya existe un archivo llamado "staged.txt".')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nuevo nombre para new.txt' })).toBeInTheDocument();
  });

  it('exposes the Renombrar inline error as role="alert" for assistive tech (same convention as NewPullRequestForm/CommentForm/MergeBox)', async () => {
    const onRenameFile = vi.fn(() => ({ ok: false, error: 'Ya existe un archivo llamado "staged.txt".' }));
    render(<FilesStrip {...baseProps({ onRenameFile })} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Renombrar new.txt' }));
    await user.type(screen.getByRole('textbox', { name: 'Nuevo nombre para new.txt' }), 'x{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Ya existe un archivo llamado "staged.txt".');
  });

  it('Renombrar cancels on Escape without calling onRenameFile', async () => {
    const onRenameFile = vi.fn(() => ({ ok: true }));
    render(<FilesStrip {...baseProps({ onRenameFile })} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Renombrar new.txt' }));
    const input = screen.getByRole('textbox', { name: 'Nuevo nombre para new.txt' });
    await user.type(input, '{Escape}');
    expect(onRenameFile).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: 'Nuevo nombre para new.txt' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Renombrar new.txt' })).toHaveFocus();
  });

  it('Borrar shows an inline confirm step; confirming calls onDeleteFile, cancelling does not', async () => {
    const onDeleteFile = vi.fn(() => ({ ok: true }));
    render(<FilesStrip {...baseProps({ onDeleteFile })} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Borrar new.txt' }));
    expect(screen.getByText('¿Borrar new.txt?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar borrado' }));
    expect(onDeleteFile).not.toHaveBeenCalled();
    expect(screen.queryByText('¿Borrar new.txt?')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Borrar new.txt' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar borrado de new.txt' }));
    expect(onDeleteFile).toHaveBeenCalledWith('new.txt');
  });

  it('after a SUCCESSFUL Borrar (the row is gone), moves focus to the next file\'s Borrar button', async () => {
    render(<DeleteHarness initialRepo={makeRepo()} />);
    const user = userEvent.setup();
    // wd order is README.md, new.txt, staged.txt — deleting the middle one.
    await user.click(screen.getByRole('button', { name: 'Borrar new.txt' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar borrado de new.txt' }));
    expect(screen.queryByRole('button', { name: 'Borrar new.txt' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Borrar staged.txt' })).toHaveFocus();
  });

  it('after a SUCCESSFUL Borrar of the LAST file, falls back to the previous file\'s Borrar button', async () => {
    render(<DeleteHarness initialRepo={makeRepo()} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Borrar staged.txt' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar borrado de staged.txt' }));
    expect(screen.getByRole('button', { name: 'Borrar new.txt' })).toHaveFocus();
  });

  it('after a SUCCESSFUL Borrar with no other actionable file left, falls back to "+ Nuevo archivo"', async () => {
    render(<DeleteHarness initialRepo={makeSingleFileRepo()} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Borrar solo.txt' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar borrado de solo.txt' }));
    expect(screen.getByText('+ Nuevo archivo')).toHaveFocus();
  });

  it('after a SUCCESSFUL Renombrar, moves focus to the RENAMED file\'s Renombrar button (new name)', async () => {
    render(<RenameHarness initialRepo={makeRepo()} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Renombrar new.txt' }));
    const input = screen.getByRole('textbox', { name: 'Nuevo nombre para new.txt' });
    await user.clear(input);
    await user.type(input, 'renombrado.txt{Enter}');
    expect(screen.queryByRole('button', { name: 'Renombrar new.txt' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Renombrar renombrado.txt' })).toHaveFocus();
  });
});

describe('FilesStrip / + Nuevo archivo', () => {
  it('opens an inline, auto-focused input; Enter submits a trimmed name; closes on success', async () => {
    const onCreateFile = vi.fn(() => ({ ok: true }));
    render(<FilesStrip {...baseProps({ onCreateFile })} />);
    const user = userEvent.setup();
    await user.click(screen.getByText('+ Nuevo archivo'));
    const input = screen.getByRole('textbox', { name: 'Nombre del nuevo archivo' });
    expect(input).toHaveFocus();
    await user.type(input, '  notas.txt  {Enter}');
    expect(onCreateFile).toHaveBeenCalledWith('notas.txt');
    expect(screen.queryByRole('textbox', { name: 'Nombre del nuevo archivo' })).not.toBeInTheDocument();
  });

  it('shows an inline Spanish error for an invalid name and keeps the input open', async () => {
    const onCreateFile = vi.fn(() => ({ ok: false, error: 'Nombre de archivo no válido.' }));
    render(<FilesStrip {...baseProps({ onCreateFile })} />);
    const user = userEvent.setup();
    await user.click(screen.getByText('+ Nuevo archivo'));
    await user.type(screen.getByRole('textbox', { name: 'Nombre del nuevo archivo' }), 'bad name!{Enter}');
    expect(screen.getByText('Nombre de archivo no válido.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nombre del nuevo archivo' })).toBeInTheDocument();
  });

  it('shows an inline Spanish error for a duplicate name', async () => {
    const onCreateFile = vi.fn(() => ({ ok: false, error: 'Ya existe un archivo llamado "README.md".' }));
    render(<FilesStrip {...baseProps({ onCreateFile })} />);
    const user = userEvent.setup();
    await user.click(screen.getByText('+ Nuevo archivo'));
    await user.type(screen.getByRole('textbox', { name: 'Nombre del nuevo archivo' }), 'README.md{Enter}');
    expect(screen.getByText('Ya existe un archivo llamado "README.md".')).toBeInTheDocument();
  });

  it('exposes the "+ Nuevo archivo" inline error as role="alert" for assistive tech (same convention as NewPullRequestForm/CommentForm/MergeBox)', async () => {
    const onCreateFile = vi.fn(() => ({ ok: false, error: 'Nombre de archivo no válido.' }));
    render(<FilesStrip {...baseProps({ onCreateFile })} />);
    const user = userEvent.setup();
    await user.click(screen.getByText('+ Nuevo archivo'));
    await user.type(screen.getByRole('textbox', { name: 'Nombre del nuevo archivo' }), 'bad name!{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Nombre de archivo no válido.');
  });

  it('cancels on Escape without calling onCreateFile, returning focus to the trigger button', async () => {
    const onCreateFile = vi.fn(() => ({ ok: true }));
    render(<FilesStrip {...baseProps({ onCreateFile })} />);
    const user = userEvent.setup();
    const trigger = screen.getByText('+ Nuevo archivo');
    await user.click(trigger);
    await user.type(screen.getByRole('textbox', { name: 'Nombre del nuevo archivo' }), 'x{Escape}');
    expect(onCreateFile).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: 'Nombre del nuevo archivo' })).not.toBeInTheDocument();
    expect(screen.getByText('+ Nuevo archivo')).toHaveFocus();
  });
});
