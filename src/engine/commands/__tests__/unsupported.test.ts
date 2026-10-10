import { describe, it, expect } from 'vitest';
import { NO, assertKnownGitSubcommand } from '../unsupported';
import { GitError } from '../../errors';

describe('commands/unsupported (NO map + git-subcommand validation)', () => {
  it('NO maps known "real git" subcommands to a [description, hint] pair', () => {
    expect(NO.clone).toEqual(['copia un repositorio remoto completo', 'Aquí ya tienes un origin simulado: prueba git fetch o git pull.']);
    expect(NO.blame).toHaveLength(2);
  });

  it('fails with the curated NO-map message for a recognized-but-unsupported subcommand', () => {
    try {
      assertKnownGitSubcommand('clone', ['status', 'add']);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(GitError);
      expect((e as GitError).lines[0]).toContain('git clone');
      expect((e as GitError).lines[0]).toContain('no lo soporta todavía');
    }
  });

  it('suggests the closest known subcommand for a typo', () => {
    try {
      assertKnownGitSubcommand('stat', ['status', 'show', 'stash']);
      expect.unreachable();
    } catch (e) {
      expect((e as GitError).lines.join('\n')).toContain('status');
    }
  });

  it('falls back to a generic hint when nothing is close', () => {
    try {
      assertKnownGitSubcommand('xyzxyzxyz', ['status']);
      expect.unreachable();
    } catch (e) {
      expect((e as GitError).lines[1]).toContain('Escribe help');
    }
  });

  it('does not throw for a known subcommand', () => {
    expect(() => assertKnownGitSubcommand('status', ['status', 'add'])).not.toThrow();
  });

  it('reproduces the oracle\'s own prototype-chain bug for "toString" (NO.toString is inherited and truthy)', () => {
    // The oracle's `if(NO[sub])fail(...)` hits `Object.prototype.toString`
    // for sub==='toString', so `NO[sub][1]` is undefined and `fail()`
    // throws a raw TypeError, not a GitError. This is a verified prototype
    // bug in design-handoff/git-engine.js (confirmed by running the oracle
    // directly) — ported as-is, not "fixed" (spec: Prototype bug parity).
    // The outer `ejecutar()` try/catch (run.ts) catches this generically.
    expect(() => assertKnownGitSubcommand('toString', ['status'])).toThrow(TypeError);
    expect(() => assertKnownGitSubcommand('toString', ['status'])).not.toThrowError(GitError);
  });
});
