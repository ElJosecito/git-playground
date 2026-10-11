// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Redirect } from '../Redirect';
import * as hashLocation from '../hashLocation';

// app-routing spec "Unknown Route Fallback"/"Unknown Level Fallback": both
// MUST redirect using history REPLACE (no extra back-stack entry).
describe('Redirect', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('replaces the hash with the target route on mount', () => {
    const navigateSpy = vi.spyOn(hashLocation, 'navigate');
    render(<Redirect to={{ name: 'landing' }} />);
    expect(navigateSpy).toHaveBeenCalledWith({ name: 'landing' }, { replace: true });
  });

  it('renders nothing visible', () => {
    const { container } = render(<Redirect to={{ name: 'levelMap' }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
