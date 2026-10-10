// Working-tree / index state helpers, ported from `design-handoff/git-engine.js`.
import { C } from './markup';
import { fail } from './errors';
import { keys, setK } from './util';
import { headHash } from './state';
import { treeOf } from './refs';
import type { RepoState, Tree } from './types';

export interface StagedChange {
  f: string;
  t: 'nuevo' | 'borrado' | 'modificado';
}

export interface UnstagedChange {
  f: string;
  t: 'borrado' | 'modificado';
}

export interface FilesStatus {
  H: Tree;
  st: StagedChange[];
  un: UnstagedChange[];
  ut: { f: string }[];
  conf: string[];
}

export function estadoArchivos(s: RepoState): FilesStatus {
  const H = treeOf(s, headHash(s));
  const I = s.index;
  const W = s.files;
  const conf = (s.op && s.op.conflicts) || [];
  const st: StagedChange[] = [];
  const un: UnstagedChange[] = [];
  const ut: { f: string }[] = [];
  for (const f of keys(H, I)) {
    if (conf.includes(f)) continue;
    if (H[f] !== I[f]) {
      st.push({ f, t: H[f] === undefined ? 'nuevo' : I[f] === undefined ? 'borrado' : 'modificado' });
    }
  }
  for (const f of keys(I, W)) {
    if (conf.includes(f)) continue;
    if (!(f in I)) {
      ut.push({ f });
      continue;
    }
    if (W[f] !== I[f]) un.push({ f, t: W[f] === undefined ? 'borrado' : 'modificado' });
  }
  return { H, st, un, ut: ut.filter((x) => !(x.f in I)), conf };
}

export function sucio(s: RepoState): boolean {
  const e = estadoArchivos(s);
  return e.st.length + e.un.length + e.conf.length > 0;
}

export function untracked(s: RepoState): Tree {
  const o: Tree = {};
  for (const f in s.files) if (!(f in s.index)) o[f] = s.files[f]!;
  return o;
}

export function cambiarArbol(s: RepoState, target: string | null): void {
  const H = treeOf(s, headHash(s));
  const T = treeOf(s, target);
  const I = s.index;
  const W = s.files;
  const bad: string[] = [];
  const nI: Tree = {};
  const nW: Tree = {};
  for (const f of keys(H, I, W, T)) {
    const dI = I[f] !== H[f];
    const ut = f in W && !(f in I) && !(f in H);
    const dW = !ut && W[f] !== I[f];
    if (ut) {
      if (f in T && T[f] !== W[f]) bad.push(f);
    } else if ((dI || dW) && H[f] !== T[f]) {
      bad.push(f);
    }
    setK(nI, f, dI ? I[f] : T[f]);
    setK(nW, f, dI || dW || ut ? W[f] : T[f]);
  }
  if (bad.length) {
    fail(
      'error: tus cambios locales en los siguientes archivos serían sobrescritos:',
      ...bad.map((f) => C('r', '\t' + f)),
      'Haz commit de tus cambios o guárdalos con git stash antes de cambiar.',
    );
  }
  s.index = nI;
  s.files = nW;
}

export function expand(_s: RepoState, ps: string[], pool: string[]): string[] {
  const out: string[] = [];
  for (const p of ps) {
    if (p.includes('*')) {
      const re = new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
      const m = pool.filter((f) => re.test(f));
      if (!m.length) fail(`fatal: la ruta '${p}' no coincide con ningún archivo`);
      out.push(...m);
    } else {
      out.push(p);
    }
  }
  return [...new Set(out)];
}

export function validName(f: string): boolean {
  return /^[\w.-]+$/.test(f) && f !== '.' && f !== '..' && f !== '.git';
}
