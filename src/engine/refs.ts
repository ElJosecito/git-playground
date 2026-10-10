// Ancestry graph traversal and ref resolution, ported from
// `design-handoff/git-engine.js`.
import { fail } from './errors';
import { cercano } from './util';
import { headHash } from './state';
import type { Hash, RepoState, Tree } from './types';

export function treeOf(s: RepoState, h: Hash | null): Tree {
  return h && s.commits[h] ? s.commits[h]!.tree : {};
}

/** All ancestor hashes reachable from `hs` (inclusive), following every parent edge. */
export function anc(s: RepoState, ...hs: (Hash | null | undefined)[]): Record<Hash, 1> {
  const seen: Record<Hash, 1> = {};
  const st = hs.filter((h): h is Hash => Boolean(h));
  while (st.length) {
    const x = st.pop()!;
    if (seen[x]) continue;
    seen[x] = 1;
    const c = s.commits[x];
    if (c) st.push(...c.parents);
  }
  return seen;
}

export function isAnc(s: RepoState, a: Hash, b: Hash): boolean {
  return !!anc(s, b)[a];
}

export function mergeBase(s: RepoState, a: Hash, b: Hash): Hash | null {
  const A = anc(s, a);
  let best: Hash | null = null;
  for (const x in anc(s, b)) {
    if (A[x] && (!best || s.commits[x]!.n > s.commits[best]!.n)) best = x;
  }
  return best;
}

export function aheadBehind(s: RepoState, a: Hash, b: Hash): [number, number] {
  const A = anc(s, a);
  const B = anc(s, b);
  let ah = 0;
  let bh = 0;
  for (const x in A) if (!B[x]) ah++;
  for (const x in B) if (!A[x]) bh++;
  return [ah, bh];
}

export function curName(s: RepoState): string | null {
  return s.head.type === 'branch' ? s.head.name : null;
}

export function resolve(s: RepoState, ref: string): Hash | null {
  if (!ref) return null;
  const m = /^(.+?)((?:[~^]\d*)*)$/.exec(ref);
  if (!m) return null;
  const base = m[1]!;
  const suf = m[2]!;
  let h: Hash | null = null;
  if (base === 'HEAD' || base === '@') h = headHash(s);
  else if (base in s.branches) h = s.branches[base]!;
  else if (base in s.tags) h = s.tags[base]!;
  else if (/^(remotes\/)?origin\/./.test(base)) {
    h = s.tracking[base.replace(/^(remotes\/)?origin\//, '')] || null;
  } else if (/^[0-9a-f]{4,40}$/i.test(base)) {
    const ms = s.order.filter((x) => s.commits[x]!.local && x.startsWith(base.toLowerCase()));
    if (ms.length === 1) h = ms[0]!;
    else if (ms.length > 1) fail(`error: el id corto ${base} es ambiguo`, 'Escribe algunos caracteres más del hash.');
  }
  if (!h) return null;
  const re = /([~^])(\d*)/g;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(suf))) {
    const n = mm[2] === '' ? 1 : +mm[2]!;
    if (mm[1] === '~') {
      for (let i = 0; i < n; i++) {
        h = s.commits[h]!.parents[0] ?? null;
        if (!h) return null;
      }
    } else if (n > 0) {
      h = s.commits[h]!.parents[n - 1] ?? null;
      if (!h) return null;
    }
  }
  return h;
}

export function resolveOr(s: RepoState, ref: string): Hash {
  const h = resolve(s, ref);
  if (h) return h;
  const near = cercano(ref, [...Object.keys(s.branches), ...Object.keys(s.tags)]);
  if (/[~^]/.test(ref) && resolve(s, ref.replace(/[~^].*$/, ''))) {
    fail(`fatal: '${ref}' no existe`, 'La historia no es tan larga: no hay tantos commits hacia atrás.');
  }
  fail(
    `fatal: argumento ambiguo '${ref}': revisión desconocida`,
    near ? `¿Quisiste decir ${near}?` : 'Usa un nombre de rama, un hash (mira git log --oneline) o HEAD~1.',
  );
}
