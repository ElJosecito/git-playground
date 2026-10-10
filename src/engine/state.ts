// 1:1 port of the state/commit/lane/color primitives at the top of
// `design-handoff/git-engine.js`. Identifiers are kept in Spanish (design
// D3) so this stays line-by-line diffable against the oracle.
import { AUTOR, PALETA, NEUTRO } from './constants';
import { hashStr } from './hash';
import { cl } from './util';
import type { Commit, Hash, Head, RepoState, Tree } from './types';

export function vacio(): RepoState {
  return {
    v: 1,
    inited: false,
    files: {},
    index: {},
    commits: {},
    order: [],
    branches: {},
    colorOf: {},
    nColors: 0,
    laneOf: {},
    lanes: [],
    detLane: null,
    tags: {},
    head: { type: 'branch', name: 'main' },
    prev: null,
    stash: [],
    reflog: [],
    remote: { branches: {}, known: {} },
    tracking: {},
    upstream: {},
    op: null,
    seq: 0,
    tm: 0,
  };
}

export function ensureColor(s: RepoState, n: string): void {
  if (!(n in s.colorOf)) s.colorOf[n] = s.nColors++;
}

export function colorRama(s: RepoState, n: string): string {
  return n in s.colorOf ? PALETA[s.colorOf[n]! % PALETA.length]! : NEUTRO;
}

export function laneFor(s: RepoState, n: string | null): number {
  if (n == null) {
    if (s.detLane == null) {
      s.detLane = s.lanes.length;
      s.lanes.push({ name: '', color: NEUTRO });
    }
    return s.detLane;
  }
  if (!(n in s.laneOf)) {
    ensureColor(s, n);
    s.laneOf[n] = s.lanes.length;
    s.lanes.push({ name: n, color: colorRama(s, n) });
  }
  return s.laneOf[n]!;
}

export function headHash(s: RepoState): Hash | null {
  return s.head.type === 'branch' ? s.branches[s.head.name] || null : s.head.hash;
}

export function reflogPush(s: RepoState, msg: string): void {
  s.reflog.unshift({ h: headHash(s), msg });
  if (s.reflog.length > 200) s.reflog.pop();
}

export function setHead(s: RepoState, h: Hash, msg: string): void {
  if (s.head.type === 'branch') s.branches[s.head.name] = h;
  else (s.head as Extract<Head, { type: 'detached' }>).hash = h;
  reflogPush(s, msg);
}

export function laneActual(s: RepoState): number {
  return s.head.type === 'branch' ? laneFor(s, s.head.name) : laneFor(s, null);
}

export interface NuevoCommitInput {
  msg: string;
  parents: Hash[];
  tree: Tree;
  lane: number;
  author?: string;
  t?: number;
  extra?: Partial<Commit>;
}

export function nuevoCommit(s: RepoState, input: NuevoCommitInput): Commit {
  const { msg, parents, tree, lane, author = AUTOR, t, extra = {} } = input;
  s.seq++;
  const hash = hashStr([msg, parents.join(','), JSON.stringify(tree), author, s.seq].join('|'));
  let x = parents.length ? Math.max(...parents.map((p) => s.commits[p]!.x)) + 1 : 0;
  const occ = new Set(
    Object.values(s.commits)
      .filter((c) => c.lane === lane && !c.dy)
      .map((c) => c.x),
  );
  while (occ.has(x)) x++;
  const c: Commit = {
    hash,
    n: s.order.length + 1,
    msg,
    parents,
    tree: cl(tree),
    author,
    t: t || Date.now(),
    lane,
    x,
    local: true,
    ...extra,
  };
  s.commits[hash] = c;
  s.order.push(hash);
  return c;
}
