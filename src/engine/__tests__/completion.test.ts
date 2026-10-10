import { describe, it, expect } from 'vitest';
import { vacio, nuevoCommit, laneFor, setHead } from '../state';
import { completar } from '../completion';

describe('completion (completar, ported from git-engine.js)', () => {
  it('completes the first word from shell commands + "git"', () => {
    const r = completar(vacio(), 'gi');
    expect(r.last).toBe('gi');
    expect(r.pool).toContain('git');
  });

  it('completes "git <sub>" from the full GIT dispatch table, excluding toString', () => {
    const r = completar(vacio(), 'git sta');
    expect(r.pool).toEqual(expect.arrayContaining(['status', 'stash']));
    expect(r.pool).not.toContain('toString');
  });

  it('completes branch/tag/file/tracking names and common flags for later arguments', () => {
    const s = vacio();
    s.inited = true;
    const lane = laneFor(s, 'main');
    const c = nuevoCommit(s, { msg: 'root', parents: [], tree: { 'readme.md': '1' }, lane, t: 1 });
    setHead(s, c.hash, 'commit (initial): root');
    s.files['readme.md'] = '1';
    s.branches.feature = c.hash;
    s.tags.v1 = c.hash;
    s.tracking.main = c.hash;
    const r = completar(s, 'git switch fe');
    expect(r.last).toBe('fe');
    expect(r.pool).toContain('feature');

    const r2 = completar(s, 'git diff --st');
    expect(r2.pool).toContain('--staged');

    const r3 = completar(s, 'cat rea');
    expect(r3.pool).toContain('readme.md');
  });

  it('deduplicates and sorts the candidate pool', () => {
    const r = completar(vacio(), 'git h');
    expect(r.pool).toEqual([...new Set(r.pool)].sort());
  });
});
