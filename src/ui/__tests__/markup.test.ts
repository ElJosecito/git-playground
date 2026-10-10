import { describe, it, expect } from 'vitest';
import { codeSegs, parseLine, segColor } from '../markup';

// Ported from the DC template's inline `segColor`/`parseLine` functions
// (design-handoff/Git Playground.dc.html, lines 227-230). These decode the
// oracle's `\x01kind\x02text\x03` output markup into colored terminal segs.
describe('segColor', () => {
  it('maps every known single-letter kind to its CSS variable', () => {
    expect(segColor('g')).toBe('var(--t-green)');
    expect(segColor('r')).toBe('var(--t-red)');
    expect(segColor('y')).toBe('var(--t-yellow)');
    expect(segColor('w')).toBe('var(--warning)');
    expect(segColor('e')).toBe('var(--danger)');
    expect(segColor('m')).toBe('var(--text-muted)');
    expect(segColor('h')).toBe('var(--t-cyan)');
    expect(segColor('cy')).toBe('var(--t-cyan)');
    expect(segColor('bold')).toBe('var(--text-primary)');
  });

  it('returns the literal color for "c:" branch-color kinds', () => {
    expect(segColor('c:#FF8A3D')).toBe('#FF8A3D');
  });

  it('falls back to the primary text color for unknown kinds', () => {
    expect(segColor('unknown-kind')).toBe('var(--text-primary)');
  });
});

describe('parseLine', () => {
  it('returns a single plain segment for text with no markup', () => {
    expect(parseLine('hola mundo')).toEqual([{ t: 'hola mundo', c: 'var(--text-primary)', fw: 400 }]);
  });

  it('decodes a single marked-up segment', () => {
    expect(parseLine('\x01g\x02Listo\x03')).toEqual([{ t: 'Listo', c: 'var(--t-green)', fw: 400 }]);
  });

  it('gives bold kind a 600 font-weight', () => {
    expect(parseLine('\x01bold\x02Importante\x03')).toEqual([{ t: 'Importante', c: 'var(--text-primary)', fw: 600 }]);
  });

  it('interleaves plain and marked-up text, matching the oracle insertion order', () => {
    const input = 'En la rama \x01c:#FF8A3D\x02main\x03';
    expect(parseLine(input)).toEqual([
      { t: 'En la rama ', c: 'var(--text-primary)', fw: 400 },
      { t: 'main', c: '#FF8A3D', fw: 400 },
    ]);
  });

  it('returns a single space segment for an empty string (oracle fallback)', () => {
    expect(parseLine('')).toEqual([{ t: ' ', c: 'inherit', fw: 400 }]);
  });

  it('handles the welcome banner text with a stray unmatched marker, like the oracle', () => {
    const input = '\x01m\x02Nada se rompe: puedes equivocarte y volver atrás. \x03help\x01m\x02 muestra la lista de comandos.\x03';
    expect(parseLine(input)).toEqual([
      { t: 'Nada se rompe: puedes equivocarte y volver atrás. ', c: 'var(--text-muted)', fw: 400 },
      { t: 'help', c: 'var(--text-primary)', fw: 400 },
      { t: ' muestra la lista de comandos.', c: 'var(--text-muted)', fw: 400 },
    ]);
  });
});

// Ported from the DC template's inline `codeSegs(text,color)` helper
// (design-handoff/Git Playground.dc.html, line 230), used for toast text and
// the conflict-resolver hint — backtick-delimited runs render in monospace.
describe('codeSegs', () => {
  it('returns a single plain segment for text with no backticks', () => {
    expect(codeSegs('todo guardado')).toEqual([{ t: 'todo guardado', ff: 'inherit', c: 'inherit', fs: 'inherit' }]);
  });

  it('uses the given color for the plain runs', () => {
    expect(codeSegs('hola', 'var(--text-primary)')).toEqual([
      { t: 'hola', ff: 'inherit', c: 'var(--text-primary)', fs: 'inherit' },
    ]);
  });

  it('alternates plain and monospace runs on backtick boundaries', () => {
    expect(codeSegs('Usa `git add` ahora', 'var(--text-secondary)')).toEqual([
      { t: 'Usa ', ff: 'inherit', c: 'var(--text-secondary)', fs: 'inherit' },
      { t: 'git add', ff: "'Geist Mono',monospace", c: 'var(--text-primary)', fs: '12px' },
      { t: ' ahora', ff: 'inherit', c: 'var(--text-secondary)', fs: 'inherit' },
    ]);
  });
});
