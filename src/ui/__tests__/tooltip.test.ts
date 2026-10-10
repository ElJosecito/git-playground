import { describe, it, expect } from 'vitest';
import { tipData, tipPlacement } from '../tooltip';
import { vacio, nuevoCommit, setHead, ensureColor, laneFor } from '../../engine/state';
import type { TipTarget } from '../tooltip';

// 1:1 port of the DC template's `tipData(t, repo)` and the tooltip
// placement math inside `renderVals()` (design-handoff/Git
// Playground.dc.html, lines 416-427, 517-519). Phase 6, tasks.md 6.1/6.2.
describe('tipData', () => {
  it('returns null for an unknown commit hash', () => {
    const repo = vacio();
    const t: TipTarget = { kind: 'commit', id: 'missing', X: 0, Y: 0, r: 14 };
    expect(tipData(t, repo)).toBeNull();
  });

  it('describes a normal commit: author, type, HEAD ref, and no note', () => {
    const repo = vacio();
    repo.inited = true;
    laneFor(repo, 'main');
    const c = nuevoCommit(repo, { msg: 'Add feature', parents: [], tree: {}, lane: 0 });
    setHead(repo, c.hash, 'init');
    repo.branches.main = c.hash;
    const t: TipTarget = { kind: 'commit', id: c.hash, X: 0, Y: 0, r: 14 };
    const d = tipData(t, repo)!;
    expect(d.title).toBe(`Commit #${c.n}`);
    expect(d.hash).toBe(c.hash.slice(0, 7));
    expect(d.msg).toBe('Add feature');
    expect(d.hasMsg).toBe(true);
    expect(d.rows[0]).toEqual({ k: 'Autor', v: c.author.replace(/\s*<.*>/, ''), ff: 'inherit' });
    expect(d.rows[1]).toEqual({ k: 'Tipo', v: 'Normal', ff: 'inherit' });
    expect(d.rows.some((r) => r.k === 'Apuntan' && r.v.includes('HEAD'))).toBe(true);
    expect(d.hasNote).toBe(false);
  });

  it('describes a merge commit (two parents) as "Merge (dos padres)"', () => {
    const repo = vacio();
    repo.inited = true;
    const mainLane = laneFor(repo, 'main');
    const featureLane = laneFor(repo, 'feature');
    const base = nuevoCommit(repo, { msg: 'base', parents: [], tree: {}, lane: mainLane });
    const other = nuevoCommit(repo, { msg: 'other', parents: [base.hash], tree: {}, lane: featureLane });
    const merge = nuevoCommit(repo, { msg: 'merge', parents: [base.hash, other.hash], tree: {}, lane: mainLane });
    setHead(repo, merge.hash, 'merge');
    repo.branches.main = merge.hash;
    const t: TipTarget = { kind: 'commit', id: merge.hash, X: 0, Y: 0, r: 16 };
    const d = tipData(t, repo)!;
    expect(d.rows[1]).toEqual({ k: 'Tipo', v: 'Merge (dos padres)', ff: 'inherit' });
  });

  it('prefixes the title with "origin · " and uses origin/<branch> refs for a remote commit (rcommit)', () => {
    const repo = vacio();
    repo.inited = true;
    const c = nuevoCommit(repo, { msg: 'on origin', parents: [], tree: {}, lane: 0 });
    repo.remote.branches.main = c.hash;
    const t: TipTarget = { kind: 'rcommit', id: c.hash, X: 0, Y: 0, r: 11 };
    const d = tipData(t, repo)!;
    expect(d.title).toBe(`origin · Commit #${c.n}`);
    expect(d.rows.some((r) => r.k === 'Apuntan' && r.v === 'origin/main')).toBe(true);
  });

  it('describes a branch label with vs-main ahead/behind and no upstream', () => {
    const repo = vacio();
    repo.inited = true;
    ensureColor(repo, 'main');
    ensureColor(repo, 'feature');
    const base = nuevoCommit(repo, { msg: 'base', parents: [], tree: {}, lane: laneFor(repo, 'main') });
    repo.branches.main = base.hash;
    const ahead = nuevoCommit(repo, { msg: 'ahead', parents: [base.hash], tree: {}, lane: laneFor(repo, 'feature') });
    repo.branches.feature = ahead.hash;
    const t: TipTarget = { kind: 'branch', id: 'feature', X: 0, Y: 0, r: 10 };
    const d = tipData(t, repo)!;
    expect(d.title).toBe('feature');
    expect(d.rows[0]).toEqual({ k: 'Apunta a', v: `${ahead.hash.slice(0, 7)} · ahead`, ff: 'inherit' });
    expect(d.rows.some((r) => r.k === 'vs. main')).toBe(true);
    expect(d.rows.some((r) => r.k === 'Remoto')).toBe(false);
    expect(d.hasNote).toBe(true);
  });

  it('describes a non-detached HEAD', () => {
    const repo = vacio();
    repo.inited = true;
    const c = nuevoCommit(repo, { msg: 'first', parents: [], tree: {}, lane: 0 });
    setHead(repo, c.hash, 'init');
    const t: TipTarget = { kind: 'head', id: 'HEAD', X: 0, Y: 0, r: 10 };
    const d = tipData(t, repo)!;
    expect(d.title).toBe('HEAD');
    expect(d.titleColor).toBe('var(--text-primary)');
    expect(d.rows).toEqual([
      { k: 'Apunta a', v: `main → ${c.hash.slice(0, 7)}`, ff: "'Geist Mono',monospace" },
      { k: 'Separado', v: 'No', ff: 'inherit' },
    ]);
  });

  it('describes a detached HEAD with the warning title/color', () => {
    const repo = vacio();
    repo.inited = true;
    const c = nuevoCommit(repo, { msg: 'first', parents: [], tree: {}, lane: 0 });
    repo.head = { type: 'detached', hash: c.hash };
    const t: TipTarget = { kind: 'head', id: 'HEAD', X: 0, Y: 0, r: 10 };
    const d = tipData(t, repo)!;
    expect(d.title).toBe('HEAD (separado)');
    expect(d.titleColor).toBe('var(--warning)');
    expect(d.rows[0]!.v).toBe(`${c.hash.slice(0, 7)} (commit directo)`);
  });

  it('describes a tracking ref (origin/<branch>)', () => {
    const repo = vacio();
    repo.inited = true;
    const c = nuevoCommit(repo, { msg: 'tracked', parents: [], tree: {}, lane: 0 });
    repo.tracking.main = c.hash;
    const t: TipTarget = { kind: 'track', id: 'main', X: 0, Y: 0, r: 10 };
    const d = tipData(t, repo)!;
    expect(d.title).toBe('origin/main');
    expect(d.hash).toBe(c.hash.slice(0, 7));
    expect(d.msg).toBe('tracked');
  });

  it('describes a tag', () => {
    const repo = vacio();
    repo.inited = true;
    const c = nuevoCommit(repo, { msg: 'tagged', parents: [], tree: {}, lane: 0 });
    repo.tags.v1 = c.hash;
    const t: TipTarget = { kind: 'tag', id: 'v1', X: 0, Y: 0, r: 10 };
    const d = tipData(t, repo)!;
    expect(d.title).toBe('Tag v1');
    expect(d.hash).toBe(c.hash.slice(0, 7));
  });

  it('describes the stash (up to 4 entries)', () => {
    const repo = vacio();
    repo.inited = true;
    repo.stash = [{ msg: 'wip 1', base: 'x', w: {}, i: {} }];
    const t: TipTarget = { kind: 'stash', id: 's', X: 0, Y: 0, r: 24 };
    const d = tipData(t, repo)!;
    expect(d.title).toBe('Stash');
    expect(d.rows).toEqual([{ k: 'stash@{0}', v: 'wip 1', ff: 'inherit' }]);
  });

  it('describes the pending-merge phantom marker', () => {
    const repo = vacio();
    const t: TipTarget = { kind: 'phantom', id: 'x', X: 0, Y: 0, r: 16 };
    const d = tipData(t, repo)!;
    expect(d.title).toBe('Merge pendiente');
    expect(d.titleColor).toBe('var(--danger)');
  });
});

describe('tipPlacement', () => {
  it('places the tooltip above the point when there is room (not near the top)', () => {
    const p = tipPlacement({ x: 400, y: 400 }, 14, 1, 1024);
    expect(p.transform).toBe('translate(-50%,-100%)');
    expect(p.y).toBe(`${400 - (14 * 1 + 12)}px`);
    expect(p.x).toBe('400px');
    expect(p.arrowY).toBe('calc(100% - 5px)');
  });

  it('flips below the point when too close to the top (y < 210)', () => {
    const p = tipPlacement({ x: 400, y: 100 }, 14, 1, 1024);
    expect(p.transform).toBe('translateX(-50%)');
    expect(p.y).toBe(`${100 + (14 * 1 + 12)}px`);
    expect(p.arrowY).toBe('-5px');
  });

  it('clamps the horizontal position to stay 140px from each viewport edge, offsetting the arrow to compensate', () => {
    const p = tipPlacement({ x: 10, y: 400 }, 14, 1, 1024);
    expect(p.x).toBe('140px');
    expect(p.arrowX).toBe('calc(50% + -130px)');
  });
});
