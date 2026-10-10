// Confirms the simulated-hosting session functions are wired onto the
// public `GitEngine` facade (task 1.6/2.4 "expose ops on engine/index.ts").
import { describe, it, expect } from 'vitest';
import { GitEngine } from '../index';
import { ejemplo } from '../run';

describe('GitEngine hosting facade (new behavior, no oracle equivalent)', () => {
  it('createPullRequest/listPullRequests round-trip through the public facade', () => {
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

    const res = GitEngine.createPullRequest(s, { source: 'feature', target: 'main', title: 'Mi PR', body: '' });
    expect(res.error).toBe(false);
    expect(GitEngine.listPullRequests(res.estado)).toHaveLength(1);
  });

  it('commentPullRequest/closePullRequest/reopenPullRequest round-trip through the public facade', () => {
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
    const created = GitEngine.createPullRequest(s, { source: 'feature', target: 'main', title: 'Mi PR', body: '' });

    const commented = GitEngine.commentPullRequest(created.estado, 1, 'hola');
    expect(commented.error).toBe(false);
    const closed = GitEngine.closePullRequest(commented.estado, 1);
    expect(closed.estado.hosting!.prs[0]!.status).toBe('closed');
    const reopened = GitEngine.reopenPullRequest(closed.estado, 1);
    expect(reopened.estado.hosting!.prs[0]!.status).toBe('open');
  });

  it('mergePullRequest/prView round-trip through the public facade', () => {
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
    const created = GitEngine.createPullRequest(s, { source: 'feature', target: 'main', title: 'Mi PR', body: '' });

    const viewBefore = GitEngine.prView(created.estado, 1)!;
    expect(viewBefore.mergeability).toMatchObject({ state: 'clean' });

    const merged = GitEngine.mergePullRequest(created.estado, 1, 'squash', false);
    expect(merged.error).toBe(false);
    expect(merged.estado.hosting!.prs[0]!.status).toBe('merged');
    const viewAfter = GitEngine.prView(merged.estado, 1)!;
    expect(viewAfter.mergeability).toBeNull();
  });
});
