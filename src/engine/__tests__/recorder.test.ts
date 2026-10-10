import { describe, it, expect } from 'vitest';
import { mkR } from '../recorder';

describe('recorder (mkR, ported from git-engine.js)', () => {
  it('out() splits multi-line strings into separate salida entries', () => {
    const r = mkR();
    r.out('a\nb', 'c');
    expect(r.salida).toEqual(['a', 'b', 'c']);
  });

  it('ev() pushes {type, ...data} onto eventos', () => {
    const r = mkR();
    r.ev('repo-init');
    r.ev('branch-created', { name: 'main', hash: 'h1' });
    expect(r.eventos).toEqual([{ type: 'repo-init' }, { type: 'branch-created', name: 'main', hash: 'h1' }]);
  });

  it('accion starts null', () => {
    expect(mkR().accion).toBeNull();
  });
});
