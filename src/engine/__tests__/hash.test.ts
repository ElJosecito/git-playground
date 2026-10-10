import { describe, it, expect } from 'vitest';
import { hashStr } from '../hash';

// Vectors derived from design-handoff/git-engine.js: each input string is the
// exact `[msg, parents.join(','), JSON.stringify(tree), author, seq].join('|')`
// built by `nuevoCommit`, and the expected output is the real commit hash the
// oracle produced for that input (verified against `ejemplo()` and a scripted
// `vacio()` + init/add/commit run). This locks `hashStr` itself to bit-exact
// parity, independent of the rest of the commit-creation pipeline.
describe('hashStr (bit-exact port of the oracle)', () => {
  it('matches the oracle hash for the first ejemplo() commit', () => {
    const input = ['Primer commit', '', JSON.stringify({ 'README.md': '# Mi proyecto' }), 'Tú <tu@ejemplo.com>', 1].join('|');
    expect(hashStr(input)).toBe('f11da2e1adbb6de63246cb16584c5ae700ef7510');
  });

  it('matches the oracle hash for the second ejemplo() commit (with a parent)', () => {
    const input = [
      'Añade descripción al README',
      'f11da2e1adbb6de63246cb16584c5ae700ef7510',
      JSON.stringify({ 'README.md': '# Mi proyecto\n\nUn lugar para practicar Git sin miedo.' }),
      'Tú <tu@ejemplo.com>',
      2,
    ].join('|');
    expect(hashStr(input)).toBe('135e841974d1b7c8858d4b8eb16575c58c709940');
  });

  it('matches the oracle hash for a root commit from a scripted vacio() session', () => {
    const input = ['hola', '', JSON.stringify({ 'a.txt': '' }), 'Tú <tu@ejemplo.com>', 1].join('|');
    expect(hashStr(input)).toBe('1967592c791ce123bc293957d433740fc2a0cced');
  });

  it('matches the oracle hash for a second commit on that session', () => {
    const input = ['segundo', '1967592c791ce123bc293957d433740fc2a0cced', JSON.stringify({ 'a.txt': 'hi' }), 'Tú <tu@ejemplo.com>', 2].join('|');
    expect(hashStr(input)).toBe('e7d5831d256dbd8dcb94cf05479fc75d967352af');
  });

  it('matches the oracle hash for the empty string', () => {
    expect(hashStr('')).toBe('7abfe8794a404fc51bf92d67969655fcc3ebfbbf');
  });

  it('matches the oracle hash for a single character', () => {
    expect(hashStr('a')).toBe('36a4d532b6bcb81e34f7925556f9994f0be782ec');
  });

  it('always returns a 40-character lowercase hex string', () => {
    expect(hashStr('anything|goes|here')).toMatch(/^[0-9a-f]{40}$/);
  });
});
