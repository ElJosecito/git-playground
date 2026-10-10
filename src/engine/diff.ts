// LCS diff + 3-way merge, ported from `design-handoff/git-engine.js`.
import { C } from './markup';
import { cl, keys, setK } from './util';
import { treeOf } from './refs';
import { untracked } from './files';
import type { ConflictSides, Hash, RepoState, Tree } from './types';

export function diffTxt(a: string | null, b: string | null): string[] {
  const A = a == null || a === '' ? [] : a.split('\n');
  const B = b == null || b === '' ? [] : b.split('\n');
  const n = A.length;
  const m = B.length;
  const d: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      d[i]![j] = A[i] === B[j] ? d[i + 1]![j + 1]! + 1 : Math.max(d[i + 1]![j]!, d[i]![j + 1]!);
    }
  }
  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) {
      out.push(' ' + A[i]);
      i++;
      j++;
    } else if (i < n && (j >= m || d[i + 1]![j]! >= d[i]![j + 1]!)) {
      out.push('-' + A[i]);
      i++;
    } else {
      out.push('+' + B[j]);
      j++;
    }
  }
  return out;
}

export interface Hunk {
  s: number;
  e: number;
  lines: string[];
}

export function hunks(b: string, x: string): Hunk[] {
  const ops = diffTxt(b, x);
  const H: Hunk[] = [];
  let i = 0;
  let cur: Hunk | null = null;
  for (const op of ops) {
    if (op[0] === ' ') {
      if (cur) {
        H.push(cur);
        cur = null;
      }
      i++;
    } else {
      if (!cur) cur = { s: i, e: i, lines: [] };
      if (op[0] === '-') {
        i++;
        cur.e = i;
      } else {
        cur.lines.push(op.slice(1));
      }
    }
  }
  if (cur) H.push(cur);
  return H;
}

export function fusionLineas(b: string, o: string, t: string): string | null {
  const A = hunks(b, o);
  const Bh = hunks(b, t);
  for (const x of A) {
    for (const y of Bh) {
      if ((x.s < y.e && y.s < x.e) || x.s === y.s || (x.e === y.s && x.s !== x.e && y.s !== y.e) || (y.e === x.s && x.s !== x.e && y.s !== y.e)) {
        if (x.s === y.s && x.e === y.e && x.lines.join('\n') === y.lines.join('\n')) continue;
        return null;
      }
    }
  }
  const base = b === '' ? [] : b.split('\n');
  const all = A.concat(Bh.filter((y) => !A.some((x) => x.s === y.s && x.e === y.e && x.lines.join('\n') === y.lines.join('\n')))).sort(
    (p, q) => q.s - p.s || q.e - p.e,
  );
  for (const h of all) base.splice(h.s, h.e - h.s, ...h.lines);
  return base.join('\n');
}

export interface FusionResult {
  tree: Tree;
  conf: string[];
  data: Record<string, ConflictSides>;
}

export function fusionar3(B: Tree, O: Tree, T: Tree): FusionResult {
  const tree: Tree = {};
  const conf: string[] = [];
  const data: Record<string, ConflictSides> = {};
  for (const f of keys(B, O, T)) {
    const b = B[f];
    const o = O[f];
    const t = T[f];
    let v: string | undefined;
    if (o === t) v = o;
    else if (o === b) v = t;
    else if (t === b) v = o;
    else if (b != null && o != null && t != null && (v = fusionLineas(b, o, t) ?? undefined) != null) {
      // v assigned via fusionLineas
    } else {
      conf.push(f);
      data[f] = { ours: o, theirs: t };
      continue;
    }
    if (v !== undefined) tree[f] = v;
  }
  return { tree, conf, data };
}

export function marcadores(o: string | undefined, t: string | undefined, name: string): string {
  return '<<<<<<< HEAD\n' + (o == null ? '' : o) + '\n=======\n' + (t == null ? '' : t) + '\n>>>>>>> ' + name;
}

export function aplicarResultado(s: RepoState, m: FusionResult, name: string): void {
  const ut = untracked(s);
  s.index = cl(m.tree);
  const W: Tree = Object.assign(cl(m.tree), ut);
  for (const f of m.conf) {
    setK(s.index, f, m.data[f]!.ours);
    W[f] = marcadores(m.data[f]!.ours, m.data[f]!.theirs, name);
  }
  s.files = W;
}

export function cambiosCommit(s: RepoState, h: Hash): { f: string; t: '+' | '−' | '~' }[] {
  const c = s.commits[h]!;
  const P = treeOf(s, c.parents[0] ?? null);
  return keys(P, c.tree)
    .filter((f) => P[f] !== c.tree[f])
    .map((f) => ({ f, t: P[f] === undefined ? '+' : c.tree[f] === undefined ? '−' : '~' }) as { f: string; t: '+' | '−' | '~' });
}

export function diffArboles(A: Tree, B: Tree, only?: string[]): string[] {
  const L: string[] = [];
  for (const f of keys(A, B)) {
    if (only && only.length && !only.includes(f)) continue;
    if (A[f] === B[f]) continue;
    L.push(C('bold', 'diff --git a/' + f + ' b/' + f));
    if (A[f] === undefined) L.push(C('bold', 'nuevo archivo'));
    if (B[f] === undefined) L.push(C('bold', 'archivo borrado'));
    L.push(C('bold', '--- ' + (A[f] === undefined ? '/dev/null' : 'a/' + f)), C('bold', '+++ ' + (B[f] === undefined ? '/dev/null' : 'b/' + f)), C('cy', '@@'));
    for (const l of diffTxt(A[f] ?? null, B[f] ?? null)) L.push(l[0] === '+' ? C('g', l) : l[0] === '-' ? C('r', l) : l);
  }
  return L;
}
