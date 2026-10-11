// @vitest-environment jsdom
import { StrictMode } from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

// The landing route's (only) h1 — the redesigned hero headline.
const LANDING_H1 = 'Aprende Git sin miedo a romper nada.';

// app-routing spec: the app root becomes a route switch (app-shell delta
// "Route Switch Owns the App Root"). Covers: no-hash = landing, deep link
// into #/playground, deep link into #/niveles, and the unknown-hash
// fallback (replace with #/) — tasks.md 1.1/1.3.
describe('App routing', () => {
  beforeEach(() => {
    window.location.hash = '';
    localStorage.clear();
  });
  afterEach(() => {
    window.location.hash = '';
    delete document.documentElement.dataset.theme;
    delete (window as { GitPlayground?: unknown }).GitPlayground;
  });

  it('shows the landing page when there is no hash', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: LANDING_H1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Empezar niveles' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Modo libre' })).toBeInTheDocument();
  });

  it('deep links into #/playground and renders the real sandbox', async () => {
    window.location.hash = '#/playground';
    render(<App />);
    expect(await screen.findByLabelText('Comando')).toBeInTheDocument();
  });

  it('deep links into #/niveles and renders the level map', async () => {
    window.location.hash = '#/niveles';
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Mapa de niveles' })).toBeInTheDocument();
  });

  it('deep links into #/niveles/:id and renders that level directly', async () => {
    // Phase 5 (tasks.md 5.2) replaced the Phase 1 placeholder's `h1` (which
    // echoed the raw id) with the real `LevelShell`/`LessonPanel`, whose
    // `h1` is the level's own Spanish title.
    window.location.hash = '#/niveles/basics-01-primer-commit';
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Tu primer commit' })).toBeInTheDocument();
  });

  it('redirects an unknown hash to the landing page via history replace', async () => {
    window.location.hash = '#/no-existe';
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: LANDING_H1 })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/');
  });

  it('is wrapped in the app-level ThemeProvider (boots dark by default)', async () => {
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: LANDING_H1 });
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('under StrictMode, the initial mount does not steal focus to the landing h1', async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    const heading = await screen.findByRole('heading', { level: 1, name: LANDING_H1 });
    expect(document.activeElement).not.toBe(heading);
  });

  it('under StrictMode, a subsequent navigation still moves focus to the new route\'s [data-route-focus]', async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await screen.findByRole('heading', { level: 1, name: LANDING_H1 });
    window.location.hash = '#/niveles';
    const heading = await screen.findByRole('heading', { level: 1, name: 'Mapa de niveles' });
    expect(document.activeElement).toBe(heading);
  });
});
