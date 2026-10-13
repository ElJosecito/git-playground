// Lives under components/ because vitest.config only collects tests from
// the listed project folders; it exercises the pure `src/cheatsheet` module.
import { describe, it, expect } from 'vitest';
import { normalizeText, searchCheatsheet, countCommands } from '../../../cheatsheet/search';
import type { CheatCategory } from '../../../cheatsheet/commands';

const FIXTURE: CheatCategory[] = [
  {
    id: 'ramas',
    title: 'Ramas',
    description: 'Crear y moverse entre ramas.',
    commands: [
      {
        id: 'switch-create',
        command: 'git switch -c <rama>',
        summary: 'Crea una rama y se cambia a ella.',
        explanation: 'Equivale a crear la rama y luego hacer switch.',
        shortcuts: ['git checkout -b <rama>'],
        inSimulator: true,
      },
      {
        id: 'branch-delete',
        command: 'git branch -d <rama>',
        summary: 'Borra una rama ya fusionada.',
        explanation: 'Usa -D para forzar el borrado.',
        shortcuts: [],
        inSimulator: true,
      },
    ],
  },
  {
    id: 'config',
    title: 'Configuración e inicio',
    description: 'Prepara Git.',
    commands: [
      {
        id: 'config-alias',
        command: 'git config --global alias.st status',
        summary: 'Crea un alias.',
        explanation: 'Después puedes escribir git st.',
        shortcuts: ['git st'],
        inSimulator: false,
      },
    ],
  },
];

describe('normalizeText', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeText('Configuración ÁÉÍÓÚ Ñ')).toBe('configuracion aeiou n');
  });
});

describe('searchCheatsheet', () => {
  it('returns every category untouched for an empty or blank query', () => {
    expect(searchCheatsheet(FIXTURE, '')).toEqual(FIXTURE);
    expect(searchCheatsheet(FIXTURE, '   ')).toEqual(FIXTURE);
  });

  it('matches the command text, case-insensitively', () => {
    const result = searchCheatsheet(FIXTURE, 'GIT SWITCH');
    expect(result.map((c) => c.id)).toEqual(['ramas']);
    expect(result[0].commands.map((c) => c.id)).toEqual(['switch-create']);
  });

  it('matches the summary and the explanation', () => {
    expect(searchCheatsheet(FIXTURE, 'fusionada')[0].commands.map((c) => c.id)).toEqual(['branch-delete']);
    expect(searchCheatsheet(FIXTURE, 'forzar')[0].commands.map((c) => c.id)).toEqual(['branch-delete']);
  });

  it('matches shortcuts and aliases', () => {
    expect(searchCheatsheet(FIXTURE, 'checkout -b')[0].commands.map((c) => c.id)).toEqual(['switch-create']);
    expect(searchCheatsheet(FIXTURE, 'git st')[0].commands.map((c) => c.id)).toContain('config-alias');
  });

  it('matches the category title, accent-insensitively', () => {
    const result = searchCheatsheet(FIXTURE, 'configuracion');
    expect(result.map((c) => c.id)).toEqual(['config']);
  });

  it('requires every word of the query to match (AND)', () => {
    const result = searchCheatsheet(FIXTURE, 'rama borra');
    expect(result).toHaveLength(1);
    expect(result[0].commands.map((c) => c.id)).toEqual(['branch-delete']);
  });

  it('drops categories with no matching commands and returns [] when nothing matches', () => {
    expect(searchCheatsheet(FIXTURE, 'zzz-no-existe')).toEqual([]);
  });

  it('does not mutate the input', () => {
    const before = JSON.stringify(FIXTURE);
    searchCheatsheet(FIXTURE, 'rama');
    expect(JSON.stringify(FIXTURE)).toBe(before);
  });
});

describe('countCommands', () => {
  it('counts commands across categories', () => {
    expect(countCommands(FIXTURE)).toBe(3);
    expect(countCommands([])).toBe(0);
  });
});
