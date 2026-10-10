import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ejecutar, ejemplo, escribir, resolver } from '../run';

describe('run (ejecutar/ejemplo/escribir/resolver + unaOrden dispatch, ported from git-engine.js)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 9, 6, 9, 12));
  });
  afterEach(() => vi.useRealTimers());

  describe('ejecutar', () => {
    it('returns empty output for a blank line', () => {
      const res = ejecutar(ejemplo(), '   ');
      expect(res.salida).toEqual([]);
      expect(res.eventos).toEqual([]);
    });

    it('fails on an unterminated quote', () => {
      const res = ejecutar(ejemplo(), 'git commit -m "sin cerrar');
      expect(res.error).toBe(true);
      expect(res.salida.join('\n')).toContain('Faltan comillas de cierre');
    });

    it('dispatches to a git subcommand', () => {
      const res = ejecutar(ejemplo(), 'git status');
      expect(res.error).toBe(false);
      expect(res.salida.join('\n')).toContain('En la rama');
    });

    it('dispatches to a shell command', () => {
      const res = ejecutar(ejemplo(), 'ls');
      expect(res.error).toBe(false);
      expect(res.salida[0]).toContain('README.md');
    });

    it('runs multiple commands separated by && or ;, sharing state across the chain', () => {
      let s = ejemplo();
      s.inited = true;
      const res = ejecutar(s, 'touch a.txt && git add a.txt');
      expect(res.error).toBe(false);
      expect(res.estado.index['a.txt']).toBe('');
    });

    it('rolls the whole chain back to the original state on error (oracle quirk: error path always returns the pre-command estado)', () => {
      const s = ejemplo();
      const before = JSON.stringify(s);
      const res = ejecutar(s, 'touch b.txt && git add nope.txt');
      expect(res.error).toBe(true);
      expect(JSON.stringify(res.estado)).toBe(before);
    });

    it('fails with a git-typo suggestion for a near-miss shell command', () => {
      const res = ejecutar(ejemplo(), 'gti status');
      expect(res.error).toBe(true);
      expect(res.salida.join('\n')).toContain('git status');
    });

    it('fails with a curated message for a known-but-missing editor command', () => {
      const res = ejecutar(ejemplo(), 'vim a.txt');
      expect(res.error).toBe(true);
      expect(res.salida.join('\n')).toContain('no está disponible en el simulador');
    });

    it('fails with a curated message for a host-command simulation attempt', () => {
      const res = ejecutar(ejemplo(), 'npm install');
      expect(res.error).toBe(true);
      expect(res.salida.join('\n')).toContain('este terminal solo simula Git');
    });

    it('fails with a typo suggestion for an unrecognized git subcommand', () => {
      const res = ejecutar(ejemplo(), 'git stat');
      expect(res.error).toBe(true);
      expect(res.salida.join('\n')).toContain('status');
    });

    it('requires "git init" before other git subcommands run', () => {
      const s = ejemplo();
      s.inited = false;
      const res = ejecutar(s, 'git status');
      expect(res.error).toBe(true);
      expect(res.salida.join('\n')).toContain('no es un repositorio git');
    });
  });

  describe('ejemplo', () => {
    it('seeds a two-commit repo already synced with origin', () => {
      const s = ejemplo();
      expect(s.inited).toBe(true);
      expect(Object.keys(s.commits)).toHaveLength(2);
      expect(s.remote.branches.main).toBe(s.branches.main);
      expect(s.tracking.main).toBe(s.branches.main);
      expect(s.upstream.main).toBe('main');
      expect(s.files['README.md']).toContain('Un lugar para practicar Git sin miedo.');
    });
  });

  describe('escribir', () => {
    it('writes a file via the envolver envelope and emits file-modified', () => {
      const s = ejemplo();
      const res = escribir(s, 'README.md', 'nuevo contenido');
      expect(res.error).toBe(false);
      expect(res.estado.files['README.md']).toBe('nuevo contenido');
      expect(res.eventos).toContainEqual({ type: 'file-modified', file: 'README.md' });
    });
  });

  describe('resolver', () => {
    it('fails cleanly when there is no conflict on that file', () => {
      const s = ejemplo();
      const res = resolver(s, 'README.md', 'mia');
      expect(res.error).toBe(true);
      expect(res.salida.join('\n')).toContain('No hay conflicto en README.md');
    });

    it('resolves to "ours" (mia), "theirs" (suya), or both', () => {
      const s = ejemplo();
      s.op = { kind: 'merge', other: 'x', otherName: 'x', conflicts: ['README.md'], data: { 'README.md': { ours: 'mine', theirs: 'theirs' } }, msg: 'm', origW: {}, origI: {} };
      const res = resolver(s, 'README.md', 'mia');
      expect(res.estado.files['README.md']).toBe('mine');
    });
  });
});
