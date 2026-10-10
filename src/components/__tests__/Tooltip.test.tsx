import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tooltip } from '../Tooltip';
import { tipData, tipPlacement } from '../../ui/tooltip';
import { vacio, nuevoCommit, setHead, laneFor } from '../../engine/state';

// 1:1 port of the DC template's commit/branch/HEAD/etc. tooltip
// (design-handoff/Git Playground.dc.html, lines 116-129). Phase 6,
// tasks.md 6.5/6.6.
describe('Tooltip', () => {
  it('renders the title, hash, message, and rows for a commit', () => {
    const repo = vacio();
    repo.inited = true;
    const c = nuevoCommit(repo, { msg: 'Add feature', parents: [], tree: {}, lane: laneFor(repo, 'main') });
    setHead(repo, c.hash, 'init');
    repo.branches.main = c.hash;
    const data = tipData({ kind: 'commit', id: c.hash, X: 0, Y: 0, r: 14 }, repo)!;
    const placement = tipPlacement({ x: 400, y: 400 }, 14, 1, 1024);
    render(<Tooltip data={data} placement={placement} />);
    expect(screen.getByText(`Commit #${c.n}`)).toBeInTheDocument();
    expect(screen.getByText(c.hash.slice(0, 7))).toBeInTheDocument();
    expect(screen.getByText('Add feature')).toBeInTheDocument();
    expect(screen.getByText('Autor')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
  });

  it('omits the message row when hasMsg is false (e.g. a branch tooltip)', () => {
    const repo = vacio();
    repo.inited = true;
    const c = nuevoCommit(repo, { msg: 'x', parents: [], tree: {}, lane: 0 });
    repo.branches.main = c.hash;
    const data = tipData({ kind: 'branch', id: 'main', X: 0, Y: 0, r: 10 }, repo)!;
    const placement = tipPlacement({ x: 400, y: 400 }, 10, 1, 1024);
    render(<Tooltip data={data} placement={placement} />);
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('Una rama es solo una etiqueta móvil: avanza con cada commit.')).toBeInTheDocument();
  });

  it('positions the tooltip using the placement left/top/transform', () => {
    const repo = vacio();
    const data = tipData({ kind: 'phantom', id: 'x', X: 0, Y: 0, r: 16 }, repo)!;
    const placement = tipPlacement({ x: 100, y: 300 }, 16, 1, 1024);
    render(<Tooltip data={data} placement={placement} />);
    const root = screen.getByRole('tooltip');
    expect(root.style.left).toBe(placement.x);
    expect(root.style.top).toBe(placement.y);
    expect(root.style.transform).toBe(placement.transform);
  });
});
