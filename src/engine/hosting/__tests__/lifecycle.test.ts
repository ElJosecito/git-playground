import { describe, it, expect } from 'vitest';
import { ejemplo } from '../../run';
import { createPr } from '../create';
import { commentPullRequest, closePullRequest, reopenPullRequest } from '../lifecycle';

function seedOpenPr(): ReturnType<typeof ejemplo> {
  const s = ejemplo();
  s.branches.feature = s.branches.main!;
  s.remote.branches.feature = s.remote.branches.main!;
  const parent = s.branches.main!;
  const tree = { ...s.commits[parent]!.tree, 'feature.txt': 'contenido' };
  const c = { hash: 'h-feature-1', n: s.order.length + 1, msg: 'add feature.txt', parents: [parent], tree, author: 'Tú <tu@ejemplo.com>', t: 0, lane: 0, x: s.order.length, local: true };
  s.commits[c.hash] = c;
  s.order.push(c.hash);
  s.branches.feature = c.hash;
  s.remote.branches.feature = c.hash;
  s.remote.known[c.hash] = 1;
  createPr(s, { source: 'feature', target: 'main', title: 'Mi PR', body: '' });
  return s;
}

describe('commentPullRequest (new behavior, no oracle equivalent)', () => {
  it('appends a comment authored "Tú" to the PR timeline', () => {
    const s = seedOpenPr();
    const res = commentPullRequest(s, 1, 'Buen trabajo');
    expect(res.error).toBe(false);
    const pr = res.estado.hosting!.prs[0]!;
    expect(pr.timeline.at(-1)).toEqual({ kind: 'comment', author: 'Tú', body: 'Buen trabajo', at: expect.any(Number) });
  });

  it('rejects an empty comment body', () => {
    const s = seedOpenPr();
    const res = commentPullRequest(s, 1, '   ');
    expect(res.error).toBe(true);
  });

  it('fails for an unknown PR id', () => {
    const s = seedOpenPr();
    const res = commentPullRequest(s, 999, 'hola');
    expect(res.error).toBe(true);
  });
});

describe('closePullRequest (new behavior, no oracle equivalent)', () => {
  it('closes an open PR manually', () => {
    const s = seedOpenPr();
    const res = closePullRequest(s, 1);
    expect(res.error).toBe(false);
    const pr = res.estado.hosting!.prs[0]!;
    expect(pr.status).toBe('closed');
    expect(pr.closeReason).toBe('manual');
  });

  it('rejects closing an already-closed PR', () => {
    const s = seedOpenPr();
    const r1 = closePullRequest(s, 1);
    const r2 = closePullRequest(r1.estado, 1);
    expect(r2.error).toBe(true);
  });
});

describe('reopenPullRequest (new behavior, no oracle equivalent)', () => {
  it('reopens a manually-closed PR', () => {
    const s = seedOpenPr();
    const closed = closePullRequest(s, 1);
    const reopened = reopenPullRequest(closed.estado, 1);
    expect(reopened.error).toBe(false);
    const pr = reopened.estado.hosting!.prs[0]!;
    expect(pr.status).toBe('open');
    expect(pr.closeReason).toBeUndefined();
  });

  it('rejects reopening an open PR', () => {
    const s = seedOpenPr();
    const res = reopenPullRequest(s, 1);
    expect(res.error).toBe(true);
  });

  it('blocks reopening a PR auto-closed by source deletion until the source branch exists again', () => {
    const s = seedOpenPr();
    // simulate the auto-close path directly (sync.ts is covered separately)
    const closedState = structuredClone(s);
    closedState.hosting!.prs[0]!.status = 'closed';
    closedState.hosting!.prs[0]!.closeReason = 'source-deleted';
    delete closedState.remote.branches.feature;
    const res = reopenPullRequest(closedState, 1);
    expect(res.error).toBe(true);
  });
});
