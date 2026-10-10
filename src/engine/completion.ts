// Tab-completion candidate pools, ported from `design-handoff/git-engine.js`.
import { SHELL } from './commands/shell';
import { GIT } from './commands/index';
import type { CompletionResult, RepoState } from './types';

export function completar(s: RepoState, linea: string): CompletionResult {
  const parts = linea.split(/\s+/);
  const last = parts[parts.length - 1]!;
  let pool: string[];
  if (parts.length === 1) pool = SHELL.concat(['git']);
  else if (parts[0] === 'git' && parts.length === 2) pool = Object.keys(GIT).filter((x) => x !== 'toString');
  else {
    pool = [
      ...Object.keys(s.branches),
      ...Object.keys(s.tags),
      ...Object.keys(s.files),
      ...Object.keys(s.tracking).map((b) => 'origin/' + b),
      'HEAD',
      'origin',
      '--oneline',
      '--graph',
      '--all',
      '--staged',
      '--soft',
      '--mixed',
      '--hard',
      '--amend',
      '--abort',
      '--continue',
      '--no-ff',
    ];
  }
  const dedup = [...new Set(pool)].filter((x) => x.startsWith(last)).sort();
  return { last, pool: dedup };
}
