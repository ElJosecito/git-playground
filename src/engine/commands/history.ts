// History-viewing commands (log/show/diff/reflog), ported from
// `design-handoff/git-engine.js`.
import { C, M } from '../markup';
import { fail } from '../errors';
import { short } from '../util';
import { headHash } from '../state';
import { curName, anc, resolveOr, treeOf } from '../refs';
import { cabecera, decor } from '../format';
import { diffArboles } from '../diff';
import type { CommandFn } from '../recorder';
import type { Tree } from '../types';

export const log: CommandFn = (s, a, r) => {
  const o = new Set(a.filter((x) => x.startsWith('-')));
  const one = o.has('--oneline');
  const gr = o.has('--graph');
  const all = o.has('--all');
  const ref = a.find((x) => !x.startsWith('-'));
  let starts: (string | null)[];
  if (all) starts = [headHash(s), ...Object.values(s.branches), ...Object.values(s.tags), ...Object.values(s.tracking)];
  else {
    const h = ref ? resolveOr(s, ref) : headHash(s);
    if (!h) fail(`fatal: tu rama actual '${curName(s)}' todavía no tiene commits`, 'Haz tu primer commit: git add . y git commit -m "Primer commit"');
    starts = [h];
  }
  const A = anc(s, ...starts);
  const list = s.order.filter((h) => A[h]).reverse();
  if (!list.length) {
    r.out(M('(sin commits)'));
    return;
  }
  for (const h of list) {
    const c = s.commits[h]!;
    const g = gr ? (c.parents.length > 1 ? '*   ' : '* ') : '';
    if (one) r.out(g + C('y', short(h)) + decor(s, h) + ' ' + c.msg);
    else {
      const L = cabecera(s, c);
      r.out(...L.map((l, i) => (gr ? (i === 0 ? '* ' : '| ') : '') + l));
    }
  }
};

export const show: CommandFn = (s, a, r) => {
  const ref = a.find((x) => !x.startsWith('-')) || 'HEAD';
  const h = resolveOr(s, ref);
  const c = s.commits[h]!;
  r.out(...cabecera(s, c));
  if (c.parents.length < 2) r.out(...diffArboles(treeOf(s, c.parents[0] ?? null), c.tree));
  else r.out(M('(commit de merge: une dos historias)'));
};

export const diff: CommandFn = (s, a, r) => {
  const staged = a.includes('--staged') || a.includes('--cached');
  const ps = a.filter((x) => !x.startsWith('-'));
  let ref: string | null = null;
  let only = ps;
  if (ps[0] && !(ps[0] in s.files) && !(ps[0] in s.index)) {
    ref = resolveOr(s, ps[0]);
    only = ps.slice(1);
  }
  const tracked: Tree = {};
  for (const f in s.index) if (f in s.files) tracked[f] = s.files[f]!;
  const L = ref
    ? diffArboles(treeOf(s, ref), staged ? s.index : tracked, only)
    : staged
      ? diffArboles(treeOf(s, headHash(s)), s.index, only)
      : diffArboles(s.index, tracked, only);
  if (L.length) r.out(...L);
  else r.out(M(staged ? 'Sin diferencias entre el staging y el último commit.' : 'Sin diferencias entre tus archivos y el staging. (Prueba git diff --staged)'));
};

export const reflog: CommandFn = (s, _a, r) => {
  if (!s.reflog.length) {
    r.out(M('(el reflog está vacío)'));
    return;
  }
  s.reflog.forEach((e, i) => r.out(C('y', short(e.h)) + ' ' + C('h', `HEAD@{${i}}`) + ': ' + e.msg));
};

export const historyCommands = { log, show, diff, reflog };
