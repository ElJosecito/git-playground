import { describe, it, expect } from 'vitest';
import { C, M } from '../markup';

describe('markup (C/M segment encoding)', () => {
  it('C wraps text with \\x01kind\\x02...\\x03', () => {
    expect(C('g', 'hola')).toBe('\x01g\x02hola\x03');
  });

  it('M is shorthand for C("m", text)', () => {
    expect(M('texto')).toBe('\x01m\x02texto\x03');
  });

  it('supports color-coded kinds like c:<hex>', () => {
    expect(C('c:#60A5FA', 'main')).toBe('\x01c:#60A5FA\x02main\x03');
  });
});
