import { describe, it, expect } from 'vitest';
import { DUR_FAST, DUR_BASE, DUR_SLOW, DUR_CAMERA, EASE_OUT, EASE_IN_OUT, EASE_SPRING, EASE_SPRING_SOFT } from '../motion';

// WAAPI's `.animate()` cannot read CSS `var()` custom properties, so the
// choreography (Phase 5) needs TS-side mirrors of theme.css's `--dur-*`/
// `--ease-*` tokens (design.md "Tokens (theme.css)" + file list: "ui/motion.ts
// (TS mirrors of CSS durations/eases)"). Values must stay byte-identical to
// src/styles/theme.css.
describe('motion tokens', () => {
  it('mirrors theme.css durations exactly', () => {
    expect(DUR_FAST).toBe(150);
    expect(DUR_BASE).toBe(280);
    expect(DUR_SLOW).toBe(450);
    expect(DUR_CAMERA).toBe(700);
  });

  it('mirrors theme.css easing curves exactly', () => {
    expect(EASE_OUT).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
    expect(EASE_IN_OUT).toBe('cubic-bezier(0.65, 0, 0.35, 1)');
    expect(EASE_SPRING).toBe('cubic-bezier(0.34, 1.4, 0.64, 1)');
    expect(EASE_SPRING_SOFT).toBe('cubic-bezier(0.34, 1.36, 0.64, 1)');
  });
});
