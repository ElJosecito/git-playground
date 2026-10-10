// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveRegion } from '../LiveRegion';

// 1:1 port of the DC template's visually-hidden announcer
// (design-handoff/Git Playground.dc.html, line 217):
// `<div aria-live="polite" style="position:absolute; width:1px; height:1px;
//   overflow:hidden; clip:rect(0 0 0 0);">{{ live }}</div>`
describe('LiveRegion', () => {
  it('renders the text inside an aria-live="polite" region', () => {
    render(<LiveRegion text="3 commits creados" />);
    const region = screen.getByText('3 commits creados');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('renders an empty region when text is empty', () => {
    const { container } = render(<LiveRegion text="" />);
    const region = container.querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region?.textContent).toBe('');
  });
});
