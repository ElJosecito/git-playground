import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SegText } from '../SegText';

// Ported from the DC template's `<sc-for list="{{ ln.segs }}" as="sg"><span
// style="color:{{ sg.c }}; font-weight:{{ sg.fw }};">{{ sg.t }}</span></sc-for>`
// (design-handoff/Git Playground.dc.html, line 203).
describe('SegText', () => {
  it('renders one span per segment with the segment text', () => {
    render(<SegText segs={[{ t: 'En la rama ', c: 'var(--text-primary)', fw: 400 }, { t: 'main', c: '#FF8A3D', fw: 400 }]} />);
    expect(screen.getByText((content) => content.startsWith('En la rama'))).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('applies the segment color and font-weight as inline style', () => {
    render(<SegText segs={[{ t: 'Listo', c: 'var(--t-green)', fw: 600 }]} />);
    const span = screen.getByText('Listo');
    expect(span.style.color).toBe('var(--t-green)');
    expect(span.style.fontWeight).toBe('600');
  });

  it('renders nothing visible for an empty segment list', () => {
    const { container } = render(<SegText segs={[]} />);
    expect(container.textContent).toBe('');
  });
});
