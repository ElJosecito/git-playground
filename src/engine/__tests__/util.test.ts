import { describe, it, expect } from 'vitest';
import { cl, keys, short, pl, same, setK, lev, cercano } from '../util';

describe('util (generic helpers ported from git-engine.js)', () => {
  it('cl deep-clones so mutating the source does not affect the clone', () => {
    const src = { a: { b: 1 } };
    const clone = cl(src);
    src.a.b = 2;
    expect(clone).toEqual({ a: { b: 1 } });
  });

  it('keys returns the sorted union across objects, treating null/undefined as empty', () => {
    expect(keys({ b: 1, a: 1 }, { c: 1 }, null, undefined)).toEqual(['a', 'b', 'c']);
  });

  it('short slices to 7 chars, and is empty for falsy input', () => {
    expect(short('0123456789abcdef')).toBe('0123456');
    expect(short(null)).toBe('');
    expect(short(undefined)).toBe('');
    expect(short('')).toBe('');
  });

  it('pl pluralizes based on n===1', () => {
    expect(pl(1, 'commit', 'commits')).toBe('1 commit');
    expect(pl(2, 'commit', 'commits')).toBe('2 commits');
    expect(pl(0, 'commit', 'commits')).toBe('0 commits');
  });

  it('same compares the union of keys for strict equality', () => {
    expect(same({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(same({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(same({}, {})).toBe(true);
  });

  it('setK sets a value, or deletes the key for null/undefined', () => {
    const o: Record<string, string> = { a: '1' };
    setK(o, 'a', 'x');
    expect(o.a).toBe('x');
    setK(o, 'a', null);
    expect('a' in o).toBe(false);
    setK(o, 'b', undefined);
    expect('b' in o).toBe(false);
  });

  it('lev computes edit distance', () => {
    expect(lev('git', 'git')).toBe(0);
    expect(lev('git', 'gt')).toBe(1);
    expect(lev('', 'abc')).toBe(3);
  });

  it('cercano finds the closest candidate within distance < 3, else null', () => {
    expect(cercano('stat', ['status', 'show', 'stash'])).toBe('status');
    expect(cercano('stah', ['status', 'show', 'stash'])).toBe('stash');
    expect(cercano('xyzxyzxyz', ['status', 'show'])).toBeNull();
  });
});
