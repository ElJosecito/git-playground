import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CameraControls } from '../CameraControls';

// 1:1 port of the DC template's camera control bar (design-handoff/Git
// Playground.dc.html, lines 184-189): zoom out/in, "Encuadrar" (fit), and
// "HEAD" (center on HEAD). Spanish copy must match the oracle byte-for-byte.
describe('CameraControls', () => {
  it('renders the four controls with the oracle Spanish labels/titles', () => {
    render(<CameraControls bottom="16px" onZoomIn={() => {}} onZoomOut={() => {}} onFit={() => {}} onCenterHead={() => {}} />);
    expect(screen.getByLabelText('Alejar')).toBeInTheDocument();
    expect(screen.getByLabelText('Acercar')).toBeInTheDocument();
    expect(screen.getByTitle('Encuadrar todo')).toBeInTheDocument();
    expect(screen.getByText('Encuadrar')).toBeInTheDocument();
    expect(screen.getByTitle('Centrar en HEAD')).toBeInTheDocument();
    expect(screen.getByText('HEAD')).toBeInTheDocument();
  });

  it('calls each handler when its button is clicked', async () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    const onFit = vi.fn();
    const onCenterHead = vi.fn();
    render(<CameraControls bottom="16px" onZoomIn={onZoomIn} onZoomOut={onZoomOut} onFit={onFit} onCenterHead={onCenterHead} />);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText('Acercar'));
    await user.click(screen.getByLabelText('Alejar'));
    await user.click(screen.getByText('Encuadrar'));
    await user.click(screen.getByText('HEAD'));
    expect(onZoomIn).toHaveBeenCalledTimes(1);
    expect(onZoomOut).toHaveBeenCalledTimes(1);
    expect(onFit).toHaveBeenCalledTimes(1);
    expect(onCenterHead).toHaveBeenCalledTimes(1);
  });

  it('positions itself using the bottom offset (safe-area aware, e.g. above a mobile bottom-sheet)', () => {
    const { container } = render(<CameraControls bottom="220px" onZoomIn={() => {}} onZoomOut={() => {}} onFit={() => {}} onCenterHead={() => {}} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.bottom).toBe('220px');
  });
});
