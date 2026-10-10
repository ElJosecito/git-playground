// @vitest-environment jsdom
//
// Regression test for the `graphHandlers` object literal in
// `PlaygroundShell` (`{ onHover: tooltip.hover, onUnhover: tooltip.unhover
// }`, built fresh every render) defeating `GraphLayer`'s `memo()` (design
// D8). Mocks `GraphLayer` itself (kept `memo()`-wrapped, same as the real
// component) so we can count how many times it actually re-renders, as
// opposed to how many times `PlaygroundShell` re-renders.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memo } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const renderSpy = vi.fn();

vi.mock('../GraphLayer', () => ({
  GraphLayer: memo(function GraphLayer() {
    renderSpy();
    return null;
  }),
}));

import { PlaygroundShell } from '../PlaygroundShell';

describe('PlaygroundShell / GraphLayer memoization', () => {
  beforeEach(() => {
    localStorage.clear();
    renderSpy.mockClear();
  });
  afterEach(() => {
    delete (window as { GitPlayground?: unknown }).GitPlayground;
    delete document.documentElement.dataset.theme;
  });

  it('does not re-render GraphLayer when unrelated shell state changes (typing in the terminal input)', async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell />);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    const input = screen.getByLabelText('Comando');
    await user.type(input, 'abc');
    // Typing dispatches `inputChanged` three times, re-rendering
    // PlaygroundShell each time — but none of those touch the repo/layout,
    // so a correctly memoized GraphLayer must not re-render at all.
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});
