// Comment/close/reopen session operations for pull requests: new behavior
// (no oracle equivalent) — see design.md "Close and Reopen" / spec's "Pull
// Request Comments" and "Close and Reopen" requirements.
import { fail } from '../errors';
import { envolver } from '../run';
import { ensureHosting } from './state';
import type { CommandResult, RepoState } from '../types';
import type { HostingState, PullRequest } from './types';

function requirePr(hosting: HostingState, id: number): PullRequest {
  const pr = hosting.prs.find((p) => p.id === id);
  if (!pr) fail(`No existe el pull request #${id}.`);
  return pr;
}

export function commentPullRequest(estado: RepoState, id: number, body: string): CommandResult {
  return envolver(estado, (s, r) => {
    const text = (body || '').trim();
    if (!text) fail('El comentario no puede estar vacío.');
    const hosting = ensureHosting(s);
    const pr = requirePr(hosting, id);
    hosting.clock++;
    pr.timeline.push({ kind: 'comment', author: 'Tú', body: text, at: hosting.clock });
    r.ev('pr-commented', { id });
  });
}

export function closePullRequest(estado: RepoState, id: number): CommandResult {
  return envolver(estado, (s, r) => {
    const hosting = ensureHosting(s);
    const pr = requirePr(hosting, id);
    if (pr.status !== 'open') {
      fail(`El pull request #${id} ya está ${pr.status === 'merged' ? 'fusionado' : 'cerrado'}.`);
    }
    hosting.clock++;
    pr.status = 'closed';
    pr.closeReason = 'manual';
    pr.timeline.push({ kind: 'closed', reason: 'manual', at: hosting.clock });
    r.ev('pr-closed', { id, reason: 'manual' });
  });
}

export function reopenPullRequest(estado: RepoState, id: number): CommandResult {
  return envolver(estado, (s, r) => {
    const hosting = ensureHosting(s);
    const pr = requirePr(hosting, id);
    if (pr.status !== 'closed') fail(`El pull request #${id} no está cerrado.`);
    if (pr.closeReason === 'source-deleted' && !s.remote.branches[pr.source]) {
      fail(`No puedes reabrir el pull request #${id}: la rama ${pr.source} ya no existe en origin.`, `git push -u origin ${pr.source}`);
    }
    hosting.clock++;
    pr.status = 'open';
    delete pr.closeReason;
    pr.timeline.push({ kind: 'reopened', at: hosting.clock });
    r.ev('pr-reopened', { id });
  });
}
