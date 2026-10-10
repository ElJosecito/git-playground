import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilesStrip } from '../FilesStrip';
import { filesModel, stripSummary } from '../../ui/selectors';
import { vacio, nuevoCommit, setHead } from '../../engine/state';
import type { RepoState } from '../../engine/types';

// 1:1 port of the DC template's files-strip panel (design-handoff/Git
// Playground.dc.html, lines 37-86): working-dir/staging/last-commit
// columns carrying `data-zone`/`data-chip` (design D15, so Phase 5's
// choreography can measure+fly them), plus the mobile floating-button
// variant. Phase 6, tasks.md 6.5/6.6.
function makeRepo(): RepoState {
  const repo = vacio();
  repo.inited = true;
  const c = nuevoCommit(repo, { msg: 'first', parents: [], tree: { 'README.md': '# Hi' }, lane: 0 });
  setHead(repo, c.hash, 'init');
  repo.index = { 'README.md': '# Hi', 'staged.txt': 'new content' };
  repo.files = { 'README.md': '# Hi', 'new.txt': 'content', 'staged.txt': 'new content' };
  return repo;
}

describe('FilesStrip (desktop)', () => {
  it('renders the header with "Archivos" and the summary, and the three data-zone columns', () => {
    const repo = makeRepo();
    const model = filesModel(repo);
    const summary = stripSummary(repo);
    render(<FilesStrip model={model} summary={summary} mobile={false} open={true} mobileShown={false} onToggle={() => {}} onShowMobile={() => {}} />);
    expect(screen.getByText('Archivos')).toBeInTheDocument();
    expect(screen.getByText(summary)).toBeInTheDocument();
    expect(document.querySelector('[data-zone="w"]')).toBeInTheDocument();
    expect(document.querySelector('[data-zone="s"]')).toBeInTheDocument();
    expect(document.querySelector('[data-zone="c"]')).toBeInTheDocument();
  });

  it('renders a data-chip element per working-dir/staging/commit file, exactly as Phase 5 choreography expects', () => {
    const repo = makeRepo();
    const model = filesModel(repo);
    render(<FilesStrip model={model} summary="" mobile={false} open={true} mobileShown={false} onToggle={() => {}} onShowMobile={() => {}} />);
    expect(document.querySelector('[data-chip="w:new.txt"]')).toBeInTheDocument();
    expect(document.querySelector('[data-chip="s:staged.txt"]')).toBeInTheDocument();
    expect(document.querySelector('[data-chip="c:__head"]')).toBeInTheDocument();
    expect(document.querySelector('[data-chip="c:README.md"]')).toBeInTheDocument();
  });

  it('shows "vacío" for an empty column', () => {
    const repo = vacio();
    repo.inited = true;
    const model = filesModel(repo);
    render(<FilesStrip model={model} summary="" mobile={false} open={true} mobileShown={false} onToggle={() => {}} onShowMobile={() => {}} />);
    expect(screen.getAllByText('vacío').length).toBeGreaterThan(0);
  });

  it('calls onToggle when the header is clicked', async () => {
    const repo = makeRepo();
    const model = filesModel(repo);
    const onToggle = vi.fn();
    render(<FilesStrip model={model} summary="x" mobile={false} open={true} mobileShown={false} onToggle={onToggle} onShowMobile={() => {}} />);
    await userEvent.setup().click(screen.getByText('Archivos'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('does not render the body columns when collapsed (open: false)', () => {
    const repo = makeRepo();
    const model = filesModel(repo);
    render(<FilesStrip model={model} summary="x" mobile={false} open={false} mobileShown={false} onToggle={() => {}} onShowMobile={() => {}} />);
    expect(document.querySelector('[data-zone="w"]')).not.toBeInTheDocument();
  });
});

describe('FilesStrip (mobile)', () => {
  it('renders only the floating "Archivos" button with the file count when the panel is not shown', async () => {
    const repo = makeRepo();
    const model = filesModel(repo);
    const onShowMobile = vi.fn();
    render(<FilesStrip model={model} summary="x" mobile={true} open={true} mobileShown={false} onToggle={() => {}} onShowMobile={onShowMobile} />);
    const button = screen.getByText('Archivos').closest('button')!;
    expect(button).toBeInTheDocument();
    expect(document.querySelector('[data-zone="w"]')).not.toBeInTheDocument();
    await userEvent.setup().click(button);
    expect(onShowMobile).toHaveBeenCalledTimes(1);
  });

  it('renders the full panel (always expanded) when the mobile panel is shown', () => {
    const repo = makeRepo();
    const model = filesModel(repo);
    render(<FilesStrip model={model} summary="x" mobile={true} open={false} mobileShown={true} onToggle={() => {}} onShowMobile={() => {}} />);
    expect(document.querySelector('[data-zone="w"]')).toBeInTheDocument();
  });
});
