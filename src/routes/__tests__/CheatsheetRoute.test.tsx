// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CheatsheetRoute from '../CheatsheetRoute';
import { CHEATSHEET } from '../../cheatsheet/commands';
import { countCommands } from '../../cheatsheet/search';

const TOTAL = countCommands(CHEATSHEET);

function searchBox() {
  return screen.getByRole('searchbox', { name: 'Buscar comandos' });
}

describe('CheatsheetRoute', () => {
  it('renders the page heading as the route focus target', () => {
    render(<CheatsheetRoute />);
    const h1 = screen.getByRole('heading', { level: 1, name: 'Cheatsheet de Git' });
    expect(h1).toHaveAttribute('data-route-focus');
  });

  it('shares the main nav with the landing, marking the cheatsheet as current', () => {
    render(<CheatsheetRoute />);
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Cheatsheet' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Niveles' })).toHaveAttribute('href', '#/niveles');
  });

  it('groups every command under its category heading and shows the total count', () => {
    render(<CheatsheetRoute />);
    for (const category of CHEATSHEET) {
      const region = screen.getByRole('region', { name: category.title });
      expect(within(region).getAllByRole('article')).toHaveLength(category.commands.length);
    }
    expect(screen.getByRole('status')).toHaveTextContent(`${TOTAL} comandos`);
  });

  it('shows each entry with its explanation and shortcuts', () => {
    render(<CheatsheetRoute />);
    const entry = screen.getByRole('article', { name: 'git switch -c <rama>' });
    expect(within(entry).getByText(/forma moderna de git checkout -b/)).toBeInTheDocument();
    expect(within(entry).getByText('git checkout -b <rama>')).toBeInTheDocument();
  });

  it('links commands supported by the simulator to the playground, and flags the rest', () => {
    render(<CheatsheetRoute />);
    const merge = screen.getByRole('article', { name: 'git merge <rama>' });
    expect(within(merge).getByRole('link', { name: /Probar en el playground/ })).toHaveAttribute('href', '#/playground');
    const clone = screen.getByRole('article', { name: 'git clone <url>' });
    expect(within(clone).queryByRole('link', { name: /Probar en el playground/ })).toBeNull();
    expect(within(clone).getByText('Fuera del simulador')).toBeInTheDocument();
  });

  it('filters by shortcut/alias as you type and updates the count', async () => {
    const user = userEvent.setup();
    render(<CheatsheetRoute />);
    await user.type(searchBox(), 'checkout -b');
    expect(screen.getByRole('article', { name: 'git switch -c <rama>' })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'git merge <rama>' })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(`1 de ${TOTAL} comandos`);
  });

  it('matches without accents', async () => {
    const user = userEvent.setup();
    render(<CheatsheetRoute />);
    await user.type(searchBox(), 'configuracion');
    expect(screen.getByRole('region', { name: 'Configuración e inicio' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Ramas' })).toBeNull();
  });

  it('shows an empty state with a way to clear the search', async () => {
    const user = userEvent.setup();
    render(<CheatsheetRoute />);
    await user.type(searchBox(), 'zzzz');
    expect(screen.getByText(/No hay comandos que coincidan con/)).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
    expect(searchBox()).toHaveValue('');
    expect(screen.getAllByRole('article')).toHaveLength(TOTAL);
  });

  it('focuses the search with "/" when not typing elsewhere', async () => {
    const user = userEvent.setup();
    render(<CheatsheetRoute />);
    expect(searchBox()).not.toHaveFocus();
    await user.keyboard('/');
    expect(searchBox()).toHaveFocus();
    expect(searchBox()).toHaveValue('');
  });

  it('lets "/" be typed inside the search box', async () => {
    const user = userEvent.setup();
    render(<CheatsheetRoute />);
    await user.click(searchBox());
    await user.keyboard('a/b');
    expect(searchBox()).toHaveValue('a/b');
  });

  it('clears the search with Esc', async () => {
    const user = userEvent.setup();
    render(<CheatsheetRoute />);
    await user.type(searchBox(), 'rebase');
    await user.keyboard('{Escape}');
    expect(searchBox()).toHaveValue('');
    expect(screen.getAllByRole('article')).toHaveLength(TOTAL);
  });

  it('lists the page keyboard shortcuts', () => {
    render(<CheatsheetRoute />);
    const block = screen.getByRole('region', { name: 'Atajos de la página' });
    expect(within(block).getByText('/')).toBeInTheDocument();
    expect(within(block).getByText('Esc')).toBeInTheDocument();
  });

  it('no longer hosts the upcoming features, but links to "Lo que viene"', () => {
    render(<CheatsheetRoute />);
    expect(screen.queryByRole('region', { name: /CI\/CD/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Self-hosted/ })).not.toBeInTheDocument();
    const inPage = screen.getAllByRole('link', { name: /Lo que viene/ }).filter((link) => !link.closest('nav'));
    expect(inPage.length).toBeGreaterThan(0);
    expect(inPage[0]).toHaveAttribute('href', '#/roadmap');
  });

  it('scopes the page as a scrolling document while mounted', () => {
    const { unmount } = render(<CheatsheetRoute />);
    expect(document.body).toHaveAttribute('data-scroll-page', 'true');
    unmount();
    expect(document.body).not.toHaveAttribute('data-scroll-page');
  });
});
