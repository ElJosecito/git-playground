// Full SVG geometry assembly for the commit graph, ported from `layout(s)`
// in `design-handoff/git-engine.js`. Edge-path math lives in `graph.ts`.
import { DX, DY, RY, RDY } from './constants';
import { colorRama } from './state';
import { curName, anc } from './refs';
import { buildEdgePath } from './graph';
import type { Box, Layout, Point, RepoState } from './types';

export function layout(s: RepoState): Layout {
  const hh = s.head.type === 'branch' ? s.branches[s.head.name] || null : s.head.hash;
  const extra = s.op && 'other' in s.op && s.op.other ? [s.op.other] : [];
  const R = anc(s, hh, ...Object.values(s.branches), ...Object.values(s.tags), ...extra);
  const T = anc(s, ...Object.values(s.tracking));
  const pos: Layout['pos'] = {};
  const nodes: Layout['nodes'] = [];
  const edges: Layout['edges'] = [];
  const links: Layout['links'] = [];
  const labels: Layout['labels'] = [];

  for (const h of s.order) {
    const c = s.commits[h]!;
    if (!c.local) continue;
    const X = c.x * DX;
    const Y = c.lane * DY + (c.dy || 0);
    pos[h] = { X, Y };
    nodes.push({ h, X, Y, color: s.lanes[c.lane]!.color, merge: c.parents.length > 1, ghost: !R[h] && !T[h], dim: !R[h] && !!T[h], n: c.n, msg: c.msg });
  }

  for (const nd of nodes) {
    const c = s.commits[nd.h]!;
    c.parents.forEach((p, i) => {
      if (!pos[p]) return;
      const pc = s.commits[p]!;
      edges.push({
        id: p + '>' + nd.h,
        child: nd.h,
        d: buildEdgePath(pos[p]!, pos[nd.h]!, i, pc.lane === c.lane && !c.dy && !pc.dy),
        color: i === 0 ? nd.color : s.lanes[pc.lane]!.color,
        ghost: nd.ghost,
      });
    });
    const ref = c.revertOf || c.cherryOf;
    if (ref && pos[ref]) {
      links.push({
        id: 'l' + nd.h,
        child: nd.h,
        d: `M${pos[ref]!.X},${pos[ref]!.Y} Q${(pos[ref]!.X + nd.X) / 2},${Math.min(pos[ref]!.Y, nd.Y) - 70} ${nd.X},${nd.Y}`,
        kind: c.revertOf ? 'revert' : 'cherry',
      });
    }
  }

  const at: Record<string, Layout['labels']> = {};
  const add = (h: string | null, l: Layout['labels'][number]): void => {
    if (!h || !pos[h]) return;
    (at[h] = at[h] || []).push(l);
  };
  for (const b in s.tracking) add(s.tracking[b]!, { key: 't:' + b, kind: 'track', text: 'origin/' + b, color: colorRama(s, b), ref: b, X: 0, Y: 0, w: 0, h: '' });
  for (const t in s.tags) add(s.tags[t]!, { key: 'g:' + t, kind: 'tag', text: t, ref: t, X: 0, Y: 0, w: 0, h: '' });
  const cur = curName(s);
  for (const b in s.branches) if (b !== cur) add(s.branches[b]!, { key: 'b:' + b, kind: 'branch', text: b, color: colorRama(s, b), ref: b, X: 0, Y: 0, w: 0, h: '' });
  if (cur && s.branches[cur]) add(s.branches[cur]!, { key: 'b:' + cur, kind: 'branch', text: cur, color: colorRama(s, cur), ref: cur, current: true, X: 0, Y: 0, w: 0, h: '' });
  if (hh) add(hh, { key: 'HEAD', kind: 'head', text: s.head.type === 'detached' ? 'HEAD (separado)' : 'HEAD', detached: s.head.type === 'detached', X: 0, Y: 0, w: 0, h: '' });
  for (const h in at) {
    const p = pos[h]!;
    at[h]!.forEach((l, i) => {
      l.X = p.X;
      l.Y = p.Y - 36 - i * 25;
      l.w = Math.round(l.text.length * 7.3 + (l.kind === 'tag' ? 30 : 18));
      l.h = h;
      labels.push(l);
    });
  }

  let phantom: Layout['phantom'] = null;
  if (s.op && 'conflicts' in s.op && s.op.conflicts.length && hh && pos[hh]) {
    const o = pos[hh]!;
    const other = 'other' in s.op ? s.op.other : undefined;
    const t = other ? pos[other] : undefined;
    const P: Point = { X: Math.max(o.X, t ? t.X : o.X) + DX, Y: o.Y };
    phantom = { P, edges: [{ id: 'po', d: buildEdgePath(o, P, 0, true) }].concat(t && t !== o ? [{ id: 'pt', d: buildEdgePath(t, P, 1, false) }] : []) };
  }

  const RR = anc(s, ...Object.values(s.remote.branches));
  const rpos: Layout['rpos'] = {};
  const rnodes: Layout['rnodes'] = [];
  const redges: Layout['redges'] = [];
  const rlabels: Layout['rlabels'] = [];
  for (const h of s.order) {
    if (RR[h]) {
      const c = s.commits[h]!;
      const X = c.x * DX;
      const Y = RY - c.lane * RDY;
      rpos[h] = { X, Y };
      rnodes.push({ h, X, Y, color: s.lanes[c.lane]!.color, merge: c.parents.length > 1, n: c.n, msg: c.msg });
    }
  }
  for (const nd of rnodes) {
    s.commits[nd.h]!.parents.forEach((p, i) => {
      if (rpos[p]) {
        redges.push({
          id: 'r' + p + '>' + nd.h,
          child: nd.h,
          d: buildEdgePath(rpos[p]!, rpos[nd.h]!, i, s.commits[p]!.lane === s.commits[nd.h]!.lane),
          color: nd.color,
        });
      }
    });
  }
  const rat: Record<string, string[]> = {};
  for (const b in s.remote.branches) {
    const h = s.remote.branches[b]!;
    (rat[h] = rat[h] || []).push(b);
  }
  for (const h in rat) {
    rat[h]!.forEach((b, i) => rlabels.push({ key: 'r:' + b, kind: 'rbranch', text: b, color: colorRama(s, b), X: rpos[h]!.X, Y: rpos[h]!.Y - 30 - i * 24, w: Math.round(b.length * 7.3 + 18), h, ref: b }));
  }
  let rbox: Box | null = null;
  if (rnodes.length) {
    const xs = rnodes.map((n) => n.X);
    const ys = rnodes.map((n) => n.Y).concat(rlabels.map((l) => l.Y));
    rbox = { x0: Math.min(...xs) - 60, x1: Math.max(...xs) + 60, y0: Math.min(...ys) - 44, y1: Math.max(...rnodes.map((n) => n.Y)) + 40 };
  }

  let stash: Layout['stash'] = null;
  if (s.stash.length) {
    const minX = nodes.length ? Math.min(...nodes.map((n) => n.X)) : 0;
    stash = { X: minX - 160, Y: 0, n: s.stash.length };
  }

  const pts: [number, number][] = [];
  nodes.forEach((n) => pts.push([n.X, n.Y]));
  labels.forEach((l) => pts.push([l.X - l.w / 2, l.Y - 10], [l.X + l.w / 2, l.Y]));
  if (rbox) pts.push([rbox.x0, rbox.y0], [rbox.x1, rbox.y1]);
  if (stash) pts.push([stash.X - 50, stash.Y]);
  if (phantom) pts.push([phantom.P.X, phantom.P.Y]);
  const bbox: Box | null = pts.length
    ? { x0: Math.min(...pts.map((p) => p[0])) - 30, x1: Math.max(...pts.map((p) => p[0])) + 30, y0: Math.min(...pts.map((p) => p[1])) - 20, y1: Math.max(...pts.map((p) => p[1])) + 40 }
    : null;

  return { pos, nodes, edges, links, labels, phantom, rpos, rnodes, redges, rlabels, rbox, stash, bbox };
}
