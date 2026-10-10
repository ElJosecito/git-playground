import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastStack } from '../ToastStack';
import type { ToastItem } from '../../hooks/useToasts';

// 1:1 port of the DC template's top-center toast stack
// (design-handoff/Git Playground.dc.html, lines 107-114). Phase 6,
// tasks.md 6.5/6.6.
function makeToast(overrides: Partial<ToastItem> = {}): ToastItem {
  return {
    id: 1,
    icon: '+',
    ic: 'var(--success)',
    segs: [{ t: 'Creaste un commit nuevo.', ff: 'inherit', c: 'inherit', fs: 'inherit' }],
    op: 1,
    tf: 'none',
    leaving: false,
    ...overrides,
  };
}

describe('ToastStack', () => {
  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ToastStack toasts={[]} />);
    expect(container.querySelectorAll('[data-toast]')).toHaveLength(0);
  });

  it('renders each toast icon and decoded text, with opacity/transform from op/tf', () => {
    const toasts = [
      makeToast(),
      makeToast({
        id: 2,
        icon: '!',
        ic: 'var(--danger)',
        op: 0,
        tf: 'translateY(-8px) scale(0.98)',
        segs: [{ t: 'Conflicto detectado.', ff: 'inherit', c: 'inherit', fs: 'inherit' }],
      }),
    ];
    const { container } = render(<ToastStack toasts={toasts} />);
    expect(screen.getByText('Creaste un commit nuevo.')).toBeInTheDocument();
    const nodes = container.querySelectorAll('[data-toast]');
    expect(nodes).toHaveLength(2);
    expect((nodes[0] as HTMLElement).style.opacity).toBe('1');
    expect((nodes[0] as HTMLElement).style.transform).toBe('none');
    expect((nodes[1] as HTMLElement).style.opacity).toBe('0');
    expect((nodes[1] as HTMLElement).style.transform).toBe('translateY(-8px) scale(0.98)');
  });

  it('renders monospace code segments in the mono font family', () => {
    const toasts = [
      makeToast({
        segs: [
          { t: 'Preparaste ', ff: 'inherit', c: 'inherit', fs: 'inherit' },
          { t: 'README.md', ff: "'Geist Mono',monospace", c: 'var(--text-primary)', fs: '12px' },
        ],
      }),
    ];
    render(<ToastStack toasts={toasts} />);
    const code = screen.getByText('README.md');
    expect(code.style.fontFamily).toContain('Geist Mono');
  });
});
