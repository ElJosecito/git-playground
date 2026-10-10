import { describe, it, expect } from 'vitest';
import { tokens } from '../tokens';

describe('tokens (shell-style tokenizer, ported from git-engine.js)', () => {
  it('splits on whitespace', () => {
    expect(tokens('git commit -m hola')).toEqual(['git', 'commit', '-m', 'hola']);
  });

  it('preserves spaces inside double or single quotes', () => {
    expect(tokens('git commit -m "hola mundo"')).toEqual(['git', 'commit', '-m', 'hola mundo']);
    expect(tokens("git commit -m 'hola mundo'")).toEqual(['git', 'commit', '-m', 'hola mundo']);
  });

  it('merges a lone ">" followed immediately by another ">" into ">>"', () => {
    expect(tokens('echo hola > a.txt')).toEqual(['echo', 'hola', '>', 'a.txt']);
    expect(tokens('echo hola >> a.txt')).toEqual(['echo', 'hola', '>>', 'a.txt']);
  });

  it('returns null for an unterminated quote', () => {
    expect(tokens('git commit -m "sin cerrar')).toBeNull();
  });

  it('returns an empty array for blank input', () => {
    expect(tokens('   ')).toEqual([]);
  });
});
