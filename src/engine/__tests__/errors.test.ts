import { describe, it, expect } from 'vitest';
import { GitError, fail } from '../errors';

describe('errors (GitError + fail, ported from git-engine.js)', () => {
  it('GitError is a plain class with .lines and is NOT an instanceof Error', () => {
    const e = new GitError(['a', 'b']);
    expect(e.lines).toEqual(['a', 'b']);
    expect(e instanceof Error).toBe(false);
  });

  it('fail throws a GitError, wrapping the main line in "e" markup when unmarked', () => {
    expect(() => fail('fatal: boom')).toThrowError(GitError);
    try {
      fail('fatal: boom');
    } catch (e) {
      expect((e as GitError).lines[0]).toBe('\x01e\x02fatal: boom\x03');
    }
  });

  it('leaves an already-marked main line untouched', () => {
    try {
      fail('\x01r\x02already marked\x03');
    } catch (e) {
      expect((e as GitError).lines[0]).toBe('\x01r\x02already marked\x03');
    }
  });

  it('wraps rest lines in "m" markup unless already marked or empty', () => {
    try {
      fail('fatal: boom', 'hint one', '', '\x01y\x02already\x03');
    } catch (e) {
      const lines = (e as GitError).lines;
      expect(lines[1]).toBe('\x01m\x02hint one\x03');
      expect(lines[2]).toBe('');
      expect(lines[3]).toBe('\x01y\x02already\x03');
    }
  });
});
