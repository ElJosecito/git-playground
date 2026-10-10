import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

// 1:1 port of the DC template's empty-state placeholder
// (design-handoff/Git Playground.dc.html, lines 29-35), shown when
// `!estado.inited` or the graph has no nodes. Phase 6, tasks.md 6.5/6.6.
describe('EmptyState', () => {
  it('renders the given title and text', () => {
    render(<EmptyState title="Esta carpeta todavía no es un repositorio" text="Escribe git init en la terminal para que Git empiece a vigilarla." />);
    expect(screen.getByText('Esta carpeta todavía no es un repositorio')).toBeInTheDocument();
    expect(screen.getByText('Escribe git init en la terminal para que Git empiece a vigilarla.')).toBeInTheDocument();
  });

  it('renders the "aún no hay commits" copy for an inited-but-empty repo', () => {
    render(<EmptyState title="Aún no hay commits" text='Crea un archivo (echo "hola" > notas.txt), prepáralo con git add y guárdalo con git commit -m "Primer commit".' />);
    expect(screen.getByText('Aún no hay commits')).toBeInTheDocument();
  });
});
