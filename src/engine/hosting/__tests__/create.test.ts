import { describe, it, expect } from 'vitest';
import { ejemplo } from '../../run';
import { createPr } from '../create';

describe('createPullRequest (new behavior, no oracle equivalent)', () => {
  function commitOn(s: ReturnType<typeof ejemplo>, branch: string, file: string, content: string): void {
    s.head = { type: 'branch', name: branch };
    const parent = s.branches[branch]!;
    const parentTree = s.commits[parent]!.tree;
    const tree = { ...parentTree, [file]: content };
    const c = { hash: `h-${branch}-${file}`, n: s.order.length + 1, msg: `add ${file}`, parents: [parent], tree, author: 'Tú <tu@ejemplo.com>', t: 0, lane: 0, x: s.order.length, local: true };
    s.commits[c.hash] = c;
    s.order.push(c.hash);
    s.branches[branch] = c.hash;
    s.remote.branches[branch] = c.hash;
    s.remote.known[c.hash] = 1;
  }

  it('creates an open PR when the source is pushed to origin and has commits ahead of target', () => {
    const s = ejemplo();
    s.branches.feature = s.branches.main!;
    s.remote.branches.feature = s.remote.branches.main!;
    commitOn(s, 'feature', 'feature.txt', 'contenido');
    const pr = createPr(s, { source: 'feature', target: 'main', title: 'Mi PR', body: 'desc' });
    expect(pr.status).toBe('open');
    expect(pr.id).toBe(1);
    expect(pr.timeline).toEqual([{ kind: 'opened', at: 1 }]);
  });

  it('rejects when the source branch was never pushed to origin, with a push hint', () => {
    const s = ejemplo();
    s.branches.feature = s.branches.main!;
    expect(() => createPr(s, { source: 'feature', target: 'main', title: 'x', body: '' })).toThrowError();
    try {
      createPr(s, { source: 'feature', target: 'main', title: 'x', body: '' });
    } catch (e) {
      expect((e as { lines: string[] }).lines.join('\n')).toContain('git push -u origin feature');
    }
  });

  it('rejects when source and target are the same branch', () => {
    const s = ejemplo();
    expect(() => createPr(s, { source: 'main', target: 'main', title: 'x', body: '' })).toThrowError();
  });

  it('rejects when source has zero commits ahead of target ("nothing to compare")', () => {
    const s = ejemplo();
    s.branches.feature = s.branches.main!;
    s.remote.branches.feature = s.remote.branches.main!;
    expect(() => createPr(s, { source: 'feature', target: 'main', title: 'x', body: '' })).toThrowError();
  });

  it('rejects a duplicate open PR for the same source/target pair', () => {
    const s = ejemplo();
    s.branches.feature = s.branches.main!;
    s.remote.branches.feature = s.remote.branches.main!;
    commitOn(s, 'feature', 'feature.txt', 'contenido');
    createPr(s, { source: 'feature', target: 'main', title: 'Primero', body: '' });
    expect(() => createPr(s, { source: 'feature', target: 'main', title: 'Segundo', body: '' })).toThrowError();
  });

  it('rejects an empty title', () => {
    const s = ejemplo();
    s.branches.feature = s.branches.main!;
    s.remote.branches.feature = s.remote.branches.main!;
    commitOn(s, 'feature', 'feature.txt', 'contenido');
    expect(() => createPr(s, { source: 'feature', target: 'main', title: '   ', body: '' })).toThrowError();
  });

  it('increments nextId/clock deterministically for a second PR between different branches', () => {
    const s = ejemplo();
    s.branches.feature = s.branches.main!;
    s.remote.branches.feature = s.remote.branches.main!;
    commitOn(s, 'feature', 'feature.txt', 'contenido');
    s.branches.other = s.branches.main!;
    s.remote.branches.other = s.remote.branches.main!;
    commitOn(s, 'other', 'other.txt', 'contenido2');
    const pr1 = createPr(s, { source: 'feature', target: 'main', title: 'Uno', body: '' });
    const pr2 = createPr(s, { source: 'other', target: 'main', title: 'Dos', body: '' });
    expect(pr1.id).toBe(1);
    expect(pr2.id).toBe(2);
    expect(s.hosting!.nextId).toBe(3);
  });
});
