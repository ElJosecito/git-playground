import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkR } from '../../recorder';
import { vacio, laneFor, setHead } from '../../state';
import { GitError } from '../../errors';
import { init, add, commit } from '../basics';
import { log, show, diff, reflog } from '../history';

function build(): ReturnType<typeof vacio> {
  const s = vacio();
  init(s, [], mkR());
  s.files['a.txt'] = 'v1';
  add(s, ['a.txt'], mkR());
  commit(s, ['-m', 'root'], mkR());
  s.files['a.txt'] = 'v2';
  add(s, ['a.txt'], mkR());
  commit(s, ['-m', 'segundo'], mkR());
  return s;
}

describe('commands/history (log/show/diff/reflog)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 9, 6, 9, 12));
  });
  afterEach(() => vi.useRealTimers());

  describe('log', () => {
    it('--oneline prints newest first, short hash + message', () => {
      const s = build();
      const hashes = s.order;
      const r = mkR();
      log(s, ['--oneline'], r);
      expect(r.salida[0]).toContain(hashes[1]!.slice(0, 7));
      expect(r.salida[0]).toContain('segundo');
      expect(r.salida[1]).toContain(hashes[0]!.slice(0, 7));
      expect(r.salida[1]).toContain('root');
    });

    it('without flags prints the full cabecera block per commit', () => {
      const s = build();
      const r = mkR();
      log(s, [], r);
      expect(r.salida.join('\n')).toContain('Autor: Tú');
      expect(r.salida.join('\n')).toContain('    segundo');
    });

    it('fails with a hint when the current branch has no commits yet', () => {
      const s = vacio();
      init(s, [], mkR());
      expect(() => log(s, [], mkR())).toThrowError(GitError);
    });

    it('--all includes commits reachable from every branch/tag/tracking ref', () => {
      const s = build();
      laneFor(s, 'feature');
      s.branches.feature = s.order[0]!; // points at the root commit only
      const r = mkR();
      log(s, ['--all', '--oneline'], r);
      expect(r.salida).toHaveLength(2); // root + segundo, no duplicates
    });
  });

  describe('show', () => {
    it('renders the commit header and its diff against the first parent', () => {
      const s = build();
      const r = mkR();
      show(s, [], r);
      expect(r.salida.join('\n')).toContain('    segundo');
      expect(r.salida.join('\n')).toContain('diff --git a/a.txt b/a.txt');
    });

    it('shows a placeholder message for a merge commit instead of a diff', () => {
      const s = build();
      const root = s.order[0]!;
      const second = s.order[1]!;
      // Fabricate a merge commit with two parents to exercise the branch.
      s.commits['m1'] = { hash: 'm1', n: 3, msg: 'merge', parents: [second, root], tree: {}, author: 'Tú', t: 1, lane: 0, x: 2, local: true };
      s.order.push('m1');
      setHead(s, 'm1', 'merge');
      const r = mkR();
      show(s, [], r);
      expect(r.salida.join('\n')).toContain('commit de merge');
    });
  });

  describe('diff', () => {
    it('reports no differences when staging matches the tracked working tree', () => {
      const s = build();
      const r = mkR();
      diff(s, [], r);
      expect(r.salida.join('\n')).toContain('Sin diferencias entre tus archivos y el staging');
    });

    it('shows unstaged changes against the index', () => {
      const s = build();
      s.files['a.txt'] = 'v3';
      const r = mkR();
      diff(s, [], r);
      expect(r.salida.join('\n')).toContain('diff --git a/a.txt b/a.txt');
    });

    it('--staged diffs the index against HEAD', () => {
      const s = build();
      s.index['a.txt'] = 'staged-change';
      const r = mkR();
      diff(s, ['--staged'], r);
      expect(r.salida.join('\n')).toContain('diff --git a/a.txt b/a.txt');
    });
  });

  describe('reflog', () => {
    it('lists ref moves newest first', () => {
      const s = build();
      const r = mkR();
      reflog(s, [], r);
      expect(r.salida[0]).toContain('HEAD@{0}');
      expect(r.salida[0]).toContain('segundo');
    });

    it('reports an empty reflog', () => {
      const r = mkR();
      reflog(vacio(), [], r);
      expect(r.salida.join('\n')).toContain('(el reflog está vacío)');
    });
  });
});
