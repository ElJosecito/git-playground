// Pull-request creation: new session behavior (no oracle equivalent) that
// mirrors GitHub's own create rules — see design.md "Create rules" / spec's
// "Create Pull Request" requirement. Validates purely against `s`, mutating
// only on success; callers wrap with `envolver` so a rejected create never
// leaks a lazily-created `hosting` key into the returned `estado` (envolver
// returns the original, un-cloned `estado` on error).
import { fail } from '../errors';
import { anc } from '../refs';
import { envolver } from '../run';
import { ensureHosting } from './state';
import type { CommandResult, RepoState } from '../types';
import type { PullRequest } from './types';

function aheadCount(s: RepoState, sourceHash: string, targetHash: string | null): number {
  const A = anc(s, sourceHash);
  const B = anc(s, targetHash);
  let ahead = 0;
  for (const h in A) if (!B[h]) ahead++;
  return ahead;
}

export interface CreatePullRequestInput {
  source: string;
  target: string;
  title: string;
  body: string;
}

/** Pure validate-and-append. Throws (`fail`) on any rejected rule, in design's stated order. */
export function createPr(s: RepoState, input: CreatePullRequestInput): PullRequest {
  const { source, target } = input;
  const title = (input.title || '').trim();
  const sourceHash = s.remote.branches[source];
  if (!sourceHash) fail(`La rama ${source} no existe en origin.`, `git push -u origin ${source}`);
  if (source === target) fail('La rama de origen y la rama de destino no pueden ser la misma.');
  const targetHash = s.remote.branches[target] ?? null;
  if (aheadCount(s, sourceHash, targetHash) <= 0) {
    fail(`No hay nada que comparar entre ${target} y ${source}.`, `${source} no tiene commits por delante de ${target}.`);
  }
  const hosting = ensureHosting(s);
  if (hosting.prs.some((pr) => pr.status === 'open' && pr.source === source && pr.target === target)) {
    fail(`Ya existe un pull request abierto de ${source} hacia ${target}.`);
  }
  if (!title) fail('El título del pull request no puede estar vacío.');
  hosting.clock++;
  const pr: PullRequest = {
    id: hosting.nextId++,
    title,
    body: input.body || '',
    source,
    target,
    status: 'open',
    timeline: [{ kind: 'opened', at: hosting.clock }],
  };
  hosting.prs.push(pr);
  return pr;
}

/** `envolver`-wrapped session function exposed on `GitEngineApi`. */
export function createPullRequest(estado: RepoState, input: CreatePullRequestInput): CommandResult {
  return envolver(estado, (s, r) => {
    const pr = createPr(s, input);
    r.ev('pr-opened', { id: pr.id, source: pr.source, target: pr.target });
  });
}
