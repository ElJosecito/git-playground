// @vitest-environment jsdom
// RED (tasks.md Phase 5, 5.1): `LevelRoute`'s guard contract (app-routing
// spec "Unknown Level Fallback" / "Locked Level Guard").
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LevelRoute from '../LevelRoute';
import { ThemeProvider } from '../../app/theme/ThemeProvider';

describe('LevelRoute', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    delete (window as { GitPlayground?: unknown }).GitPlayground;
    window.location.hash = '';
  });

  it('renders the level shell for an unlocked, existing level id', () => {
    render(<ThemeProvider><LevelRoute id="basics-01-primer-commit" /></ThemeProvider>);
    expect(screen.getByText('Inicializa el repositorio y haz tu primer commit.')).toBeInTheDocument();
  });

  it('redirects to the level map for an id that does not exist in the catalog', () => {
    render(<ThemeProvider><LevelRoute id="no-existe" /></ThemeProvider>);
    expect(window.location.hash).toBe('#/niveles');
  });

  it('renders the "Nivel bloqueado" guard for an existing but still-locked level id', () => {
    render(<ThemeProvider><LevelRoute id="basics-02-status-y-stage" /></ThemeProvider>);
    expect(screen.getByRole('heading', { name: /nivel bloqueado/i })).toBeInTheDocument();
    expect(screen.queryByText('Agrega a.txt al stage y confírmalo con un commit.')).not.toBeInTheDocument();
  });
});
