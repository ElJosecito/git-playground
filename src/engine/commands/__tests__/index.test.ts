import { describe, it, expect } from 'vitest';
import { GIT } from '../index';

describe('commands/index (GIT dispatch table aggregation)', () => {
  it('exposes every basics/history/branches command as a callable handler', () => {
    const expected = [
      'init',
      'status',
      'add',
      'restore',
      'rm',
      'mv',
      'commit',
      'log',
      'show',
      'diff',
      'reflog',
      'branch',
      'switch',
      'checkout',
      'tag',
      'merge',
      'rebase',
      'cherry-pick',
      'revert',
      'reset',
      'stash',
      'remote',
      'push',
      'fetch',
      'pull',
      'help',
      'version',
      'clean',
    ];
    for (const name of expected) {
      expect(typeof GIT[name]).toBe('function');
    }
  });
});
