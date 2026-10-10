import { describe, it, expect } from 'vitest';
import { ejemplo, companero } from '../../run';
import { mkR } from '../../recorder';
import { createPr } from '../create';
import { syncHosting } from '../sync';

function seedOpenPr(): ReturnType<typeof ejemplo> {
  const s = ejemplo();
  s.branches.feature = s.branches.main!;
  s.remote.branches.feature = s.remote.branches.main!;
  const parent = s.branches.main!;
  const tree = { ...s.commits[parent]!.tree, 'feature.txt': 'contenido' };
  const c = { hash: 'h-feature-1', n: s.order.length + 1, msg: 'add feature.txt', parents: [parent], tree, author: 'Tú <tu@ejemplo.com>', t: 0, lane: 0, x: s.order.length, local: true };
  s.commits[c.hash] = c;
  s.order.push(c.hash);
  s.branches.feature = c.hash;
  s.remote.branches.feature = c.hash;
  s.remote.known[c.hash] = 1;
  createPr(s, { source: 'feature', target: 'main', title: 'Mi PR', body: '' });
  return s;
}

describe('syncHosting (new behavior, no oracle equivalent)', () => {
  it('is a no-op when the repo has no hosting state at all', () => {
    const s = ejemplo();
    const before = JSON.stringify(s);
    const r = mkR();
    syncHosting(s, r);
    expect(JSON.stringify(s)).toBe(before);
    expect(r.eventos).toEqual([]);
  });

  it('auto-closes an open PR when its source branch is deleted from origin', () => {
    const s = seedOpenPr();
    delete s.remote.branches.feature;
    const r = mkR();
    syncHosting(s, r);
    const pr = s.hosting!.prs[0]!;
    expect(pr.status).toBe('closed');
    expect(pr.closeReason).toBe('source-deleted');
    expect(r.eventos).toContainEqual({ type: 'pr-closed', id: 1, reason: 'source-deleted' });
  });

  it('auto-merges an open PR when its source is already fully contained in target', () => {
    const s = seedOpenPr();
    // land feature's commit on main too, making feature fully reachable from main
    s.remote.branches.main = s.remote.branches.feature!;
    const r = mkR();
    syncHosting(s, r);
    const pr = s.hosting!.prs[0]!;
    expect(pr.status).toBe('merged');
    expect(pr.mergedHash).toBe(s.remote.branches.main);
    expect(r.eventos).toContainEqual({ type: 'pr-merged', id: 1, strategy: 'external', target: 'main', hash: s.remote.branches.main, branchDeleted: false });
  });

  it('leaves a still-open, still-divergent PR untouched', () => {
    const s = seedOpenPr();
    const r = mkR();
    syncHosting(s, r);
    expect(s.hosting!.prs[0]!.status).toBe('open');
    expect(r.eventos).toEqual([]);
  });

  it('does not touch repos with no PR activity after a normal remote-side event (companero)', () => {
    const s = ejemplo();
    const res = companero(s);
    expect(res.estado.hosting).toBeUndefined();
  });
});
