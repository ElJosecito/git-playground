// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import RoadmapRoute from '../RoadmapRoute';

describe('RoadmapRoute', () => {
  it('renders the page heading as the route focus target with an upcoming-updates subtitle', () => {
    render(<RoadmapRoute />);
    const h1 = screen.getByRole('heading', { level: 1, name: 'Lo que viene' });
    expect(h1).toHaveAttribute('data-route-focus');
    expect(screen.getByText(/actualizaciones y mejoras/i)).toBeInTheDocument();
  });

  it('shares the main nav, marking "Lo que viene" as current', () => {
    render(<RoadmapRoute />);
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Lo que viene' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Cheatsheet' })).toHaveAttribute('href', '#/cheatsheet');
  });

  it('announces CI/CD as in progress and self-hosting as coming soon', () => {
    render(<RoadmapRoute />);
    const cicd = screen.getByRole('region', { name: /CI\/CD/ });
    expect(within(cicd).getByText('En progreso')).toBeInTheDocument();
    expect(within(cicd).getByText(/GitHub Actions/)).toBeInTheDocument();
    expect(within(cicd).getByText('feat/ci-cd')).toBeInTheDocument();
    const selfHosted = screen.getByRole('region', { name: /Self-hosted/ });
    expect(within(selfHosted).getByText('Próximamente')).toBeInTheDocument();
  });

  it('scopes the page as a scrolling document while mounted', () => {
    const { unmount } = render(<RoadmapRoute />);
    expect(document.body).toHaveAttribute('data-scroll-page', 'true');
    unmount();
    expect(document.body).not.toHaveAttribute('data-scroll-page');
  });
});
