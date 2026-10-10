import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import userEvent from '@testing-library/user-event';
import { TerminalWindow } from '../TerminalWindow';
import type { TerminalGeometry } from '../../hooks/useTerminalWindow';

// Ported from the DC template's terminal markup (design-handoff/Git
// Playground.dc.html, lines 191-214): title bar with 3 traffic-light
// buttons, output area with colored lines, and a prompt+input row. Behavior
// (history, Tab completion, persistence) is owned by `useGitPlayground`
// (tested separately); this component only needs to wire DOM events to the
// callbacks it is given.
const geom: TerminalGeometry = {
  tLeft: '16px',
  tTop: '80px',
  tW: '580px',
  tH: '360px',
  tRadius: '14px',
  tTransition: 'none',
};

function baseProps() {
  return {
    geom,
    min: false,
    open: true,
    resizable: true,
    onDragStart: vi.fn(),
    onResizeStart: vi.fn(),
    onToggleMin: vi.fn(),
    onToggleMax: vi.fn(),
    lines: [{ id: 1, segs: [{ t: 'Bienvenido', c: 'var(--text-muted)', fw: 400 }] }],
    promptSegs: [
      { t: '~/proyecto', c: 'var(--t-cyan)', fw: 400 },
      { t: ' (', c: 'var(--text-secondary)', fw: 400 },
      { t: 'main', c: '#FF8A3D', fw: 400 },
      { t: ')', c: 'var(--text-secondary)', fw: 400 },
      { t: ' $ ', c: 'var(--text-secondary)', fw: 400 },
    ],
    input: '',
    onInputChange: vi.fn(),
    onSubmit: vi.fn(),
    onHistoryPrev: vi.fn(),
    onHistoryNext: vi.fn(),
    onComplete: vi.fn(),
    onClearLines: vi.fn(),
  };
}

describe('TerminalWindow', () => {
  it('renders past output lines and the colored prompt', () => {
    render(<TerminalWindow {...baseProps()} />);
    expect(screen.getByText('Bienvenido')).toBeInTheDocument();
    const branch = screen.getByText('main');
    expect(branch.style.color).toBe('rgb(255, 138, 61)');
  });

  it('forwards windowRef to the terminal\'s root element (useChoreography shakes it on error)', () => {
    const windowRef = createRef<HTMLDivElement>();
    render(<TerminalWindow {...baseProps()} windowRef={windowRef} />);
    expect(windowRef.current).not.toBeNull();
    expect(windowRef.current).toBe(screen.getByRole('region', { name: 'Terminal' }));
  });

  it('renders the command input with the oracle placeholder and current value', () => {
    render(<TerminalWindow {...baseProps()} input="git sta" />);
    const input = screen.getByRole('textbox', { name: 'Comando' });
    expect(input).toHaveValue('git sta');
    expect(input).toHaveAttribute('placeholder', 'Escribe un comando… prueba git status');
  });

  it('calls onSubmit with the current input and preventDefault on Enter', async () => {
    const props = baseProps();
    render(<TerminalWindow {...props} input="git status" />);
    const input = screen.getByRole('textbox', { name: 'Comando' });
    await userEvent.type(input, '{Enter}');
    expect(props.onSubmit).toHaveBeenCalledWith('git status');
  });

  it('calls onInputChange as the user types', async () => {
    const props = baseProps();
    render(<TerminalWindow {...props} />);
    const input = screen.getByRole('textbox', { name: 'Comando' });
    await userEvent.type(input, 'a');
    expect(props.onInputChange).toHaveBeenCalledWith('a');
  });

  it('calls onHistoryPrev/onHistoryNext on ArrowUp/ArrowDown', async () => {
    const props = baseProps();
    render(<TerminalWindow {...props} />);
    const input = screen.getByRole('textbox', { name: 'Comando' });
    await userEvent.type(input, '{ArrowUp}');
    expect(props.onHistoryPrev).toHaveBeenCalledTimes(1);
    await userEvent.type(input, '{ArrowDown}');
    expect(props.onHistoryNext).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete with the current input on Tab', async () => {
    const props = baseProps();
    render(<TerminalWindow {...props} input="git stat" />);
    const input = screen.getByRole('textbox', { name: 'Comando' });
    input.focus();
    await userEvent.keyboard('{Tab}');
    expect(props.onComplete).toHaveBeenCalledWith('git stat');
  });

  it('calls onClearLines on Ctrl+L', async () => {
    const props = baseProps();
    render(<TerminalWindow {...props} />);
    const input = screen.getByRole('textbox', { name: 'Comando' });
    input.focus();
    await userEvent.keyboard('{Control>}l{/Control}');
    expect(props.onClearLines).toHaveBeenCalledTimes(1);
  });

  it('wires the minimize buttons to onToggleMin and the maximize button to onToggleMax', async () => {
    const props = baseProps();
    render(<TerminalWindow {...props} />);
    const minimizeButtons = screen.getAllByRole('button', { name: 'Minimizar terminal' });
    expect(minimizeButtons).toHaveLength(2);
    await userEvent.click(minimizeButtons[0]!);
    expect(props.onToggleMin).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Ampliar terminal' }));
    expect(props.onToggleMax).toHaveBeenCalledTimes(1);
  });

  it('hides the output/input area when not open (minimized)', () => {
    render(<TerminalWindow {...baseProps()} open={false} min={true} />);
    expect(screen.queryByRole('textbox', { name: 'Comando' })).not.toBeInTheDocument();
  });

  it('shows the resize handle only when resizable', () => {
    const props = baseProps();
    const { container, rerender } = render(<TerminalWindow {...props} resizable={false} />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
    rerender(<TerminalWindow {...props} resizable />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('applies the geometry from props as inline position styles on the window', () => {
    render(<TerminalWindow {...baseProps()} />);
    const region = screen.getByRole('region', { name: 'Terminal' });
    expect(region.style.left).toBe('16px');
    expect(region.style.top).toBe('80px');
    expect(region.style.width).toBe('580px');
    expect(region.style.height).toBe('360px');
  });
});
