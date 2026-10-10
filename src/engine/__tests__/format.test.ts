import { describe, it, expect } from 'vitest';
import { vacio, nuevoCommit, laneFor, ensureColor } from '../state';
import { decor, fecha, cabecera, trackLine, SUB, OPNOM } from '../format';
import { PALETA } from '../constants';
import type { RepoState } from '../types';

describe('format (log/status decoration helpers, ported from git-engine.js)', () => {
  describe('decor', () => {
    it('returns an empty string when nothing points at the hash', () => {
      const s = vacio();
      expect(decor(s, 'h1')).toBe('');
    });

    it('marks HEAD on a detached commit', () => {
      const s = vacio();
      s.head = { type: 'detached', hash: 'h1' };
      expect(decor(s, 'h1')).toBe('\x01y\x02 (\x03\x01h\x02HEAD\x03\x01y\x02)\x03');
    });

    it('marks "HEAD -> branch" for the current branch tip, colored', () => {
      const s = vacio();
      ensureColor(s, 'main');
      s.branches.main = 'h1';
      expect(decor(s, 'h1')).toBe(`\x01y\x02 (\x03\x01h\x02HEAD -> \x03\x01c:${PALETA[0]}\x02main\x03\x01y\x02)\x03`);
    });

    it('lists other branches, tracking refs and tags pointing at the hash', () => {
      const s = vacio();
      ensureColor(s, 'main');
      ensureColor(s, 'feature');
      s.branches = { main: 'h2', feature: 'h1' };
      s.tracking = { feature: 'h1' };
      s.tags = { v1: 'h1' };
      const d = decor(s, 'h1');
      expect(d.startsWith('\x01y\x02 (\x03')).toBe(true);
      expect(d).toContain(`\x01c:${PALETA[1]}\x02feature\x03`);
      expect(d).toContain('\x01r\x02origin/feature\x03');
      expect(d).toContain('\x01y\x02tag: v1\x03');
    });
  });

  describe('fecha', () => {
    it('formats using the es-ES locale (short weekday/month, 24h time)', () => {
      expect(fecha(Date.UTC(2026, 9, 6, 9, 12))).toBe('mar, 6 oct 2026, 09:12');
    });
  });

  describe('cabecera', () => {
    it('renders author/date/message for a root commit', () => {
      const s = vacio();
      const lane = laneFor(s, 'main');
      const c = nuevoCommit(s, { msg: 'Primer commit', parents: [], tree: {}, lane, t: Date.UTC(2026, 9, 6, 9, 12) });
      const lines = cabecera(s, c);
      expect(lines[0]).toContain('commit ' + c.hash);
      expect(lines.some((l) => l.startsWith('Autor: Tú'))).toBe(true);
      expect(lines.some((l) => l.startsWith('Fecha: mar, 6 oct 2026'))).toBe(true);
      expect(lines.some((l) => l === '    Primer commit')).toBe(true);
    });

    it('adds a "Merge:" line listing short parent hashes for merge commits', () => {
      const s = vacio();
      const lane = laneFor(s, 'main');
      const c1 = nuevoCommit(s, { msg: 'p1', parents: [], tree: {}, lane, t: 1 });
      const c2 = nuevoCommit(s, { msg: 'p2', parents: [], tree: {}, lane, t: 2 });
      const merge = nuevoCommit(s, { msg: 'merge', parents: [c1.hash, c2.hash], tree: {}, lane, t: 3 });
      const lines = cabecera(s, merge);
      expect(lines[1]).toBe(`Merge: ${c1.hash.slice(0, 7)} ${c2.hash.slice(0, 7)}`);
    });
  });

  describe('trackLine', () => {
    function setup(): RepoState {
      const s = vacio();
      s.branches.main = 'h2';
      s.upstream.main = 'main';
      return s;
    }

    it('returns null when there is no upstream configured', () => {
      const s = vacio();
      s.branches.main = 'h1';
      expect(trackLine(s, 'main')).toBeNull();
    });

    it('reports up to date when local and tracking match', () => {
      const s = setup();
      s.tracking.main = 'h2';
      expect(trackLine(s, 'main')).toBe("Tu rama está actualizada con 'origin/main'.");
    });

    it('reports ahead when local has commits the tracking ref lacks', () => {
      const s = setup();
      const c1 = nuevoCommit(s, { msg: 'm1', parents: [], tree: {}, lane: 0, t: 1 });
      s.branches.main = c1.hash;
      s.tracking.main = c1.hash;
      const c2 = nuevoCommit(s, { msg: 'm2', parents: [c1.hash], tree: {}, lane: 0, t: 2 });
      s.branches.main = c2.hash;
      expect(trackLine(s, 'main')).toContain('adelantada');
    });

    it('reports behind when the tracking ref has commits local lacks', () => {
      const s = setup();
      const c1 = nuevoCommit(s, { msg: 'm1', parents: [], tree: {}, lane: 0, t: 1 });
      s.branches.main = c1.hash;
      const c2 = nuevoCommit(s, { msg: 'm2', parents: [c1.hash], tree: {}, lane: 0, t: 2 });
      s.tracking.main = c2.hash;
      expect(trackLine(s, 'main')).toContain('detrás');
    });

    it('reports divergence when both sides have unique commits', () => {
      const s = setup();
      const c1 = nuevoCommit(s, { msg: 'm1', parents: [], tree: {}, lane: 0, t: 1 });
      const c2 = nuevoCommit(s, { msg: 'local', parents: [c1.hash], tree: {}, lane: 0, t: 2 });
      const c3 = nuevoCommit(s, { msg: 'remote', parents: [c1.hash], tree: { x: '1' }, lane: 0, t: 3 });
      s.branches.main = c2.hash;
      s.tracking.main = c3.hash;
      expect(trackLine(s, 'main')).toContain('divergido');
    });
  });

  it('SUB maps staged-change kinds to their display labels', () => {
    expect(SUB).toEqual({
      nuevo: 'nuevo archivo:   ',
      modificado: 'modificados:     ',
      borrado: 'borrados:        ',
    });
  });

  it('OPNOM maps op kinds to their status-line names', () => {
    expect(OPNOM).toEqual({
      merge: 'MERGING',
      rebase: 'REBASE',
      'cherry-pick': 'CHERRY-PICKING',
      revert: 'REVERTING',
    });
  });
});
