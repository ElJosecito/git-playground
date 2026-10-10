// Confirms `syncHosting` actually runs at the end of `envolver()` and
// `ejecutar()` (task 1.6 wiring), not just when called directly — complements
// `sync.test.ts`'s unit coverage of the transition rules themselves.
import { describe, it, expect } from 'vitest';
import { ejecutar, escribir, ejemplo } from '../../run';
import { createPr } from '../create';

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

describe('syncHosting wiring into envolver()/ejecutar()', () => {
  it('runs after a plain ejecutar() terminal command and auto-closes a PR whose source was deleted from origin', () => {
    const s = seedOpenPr();
    delete s.remote.branches.feature;
    const res = ejecutar(s, 'git status');
    expect(res.estado.hosting!.prs[0]!.status).toBe('closed');
    expect(res.eventos).toContainEqual({ type: 'pr-closed', id: 1, reason: 'source-deleted' });
  });

  it('runs after a plain envolver()-wrapped session call (escribir) and auto-merges a contained PR', () => {
    const s = seedOpenPr();
    s.remote.branches.main = s.remote.branches.feature!;
    const res = escribir(s, 'README.md', 'nuevo contenido');
    expect(res.estado.hosting!.prs[0]!.status).toBe('merged');
    expect(res.eventos).toContainEqual({ type: 'pr-merged', id: 1, strategy: 'external', target: 'main', hash: s.remote.branches.main, branchDeleted: false });
  });
});
