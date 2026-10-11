// @vitest-environment jsdom
// RED (tasks.md Phase 6, 6.1): `LevelMapRoute` wraps `LevelMap` in its own
// `ProgressProvider` fed by the catalog's unlock metadata.
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LevelMapRoute from '../LevelMapRoute';

describe('LevelMapRoute', () => {
  beforeEach(() => localStorage.clear());

  it('renders the real level map', () => {
    render(<LevelMapRoute />);
    expect(screen.getByRole('heading', { name: 'Mapa de niveles' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tu primer commit/ })).toBeInTheDocument();
  });
});
