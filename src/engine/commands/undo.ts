// reset/stash commands, ported from `design-handoff/git-engine.js`.
import { C, M } from '../markup';
import { fail } from '../errors';
import { cl, short, setK } from '../util';
import { headHash, setHead } from '../state';
import { curName, anc, resolve, resolveOr, treeOf } from '../refs';
import { estadoArchivos, untracked } from '../files';
import { restore, status } from './basics';
import type { CommandFn } from '../recorder';
import type { StashEntry, Tree } from '../types';

export const reset: CommandFn = (s, a, r) => {
  let mode: 'soft' | 'mixed' | 'hard' = 'mixed';
  if (a.includes('--soft')) mode = 'soft';
  if (a.includes('--hard')) mode = 'hard';
  const ps = a.filter((x) => !x.startsWith('-'));
  if (s.op && s.op.kind === 'rebase') fail('Estás en mitad de un rebase.', 'Primero cancélalo con git rebase --abort.');
  if (!headHash(s)) fail('fatal: todavía no hay commits a los que volver');
  if (ps.length && !resolve(s, ps[0]!) && (ps[0]! in s.index || ps[0]! in treeOf(s, headHash(s)))) {
    return restore(s, ['--staged', ...ps], r);
  }
  const ref = ps[0] || 'HEAD';
  const to = resolveOr(s, ref);
  const from = headHash(s);
  const ut = untracked(s);
  const count = Object.keys(anc(s, from)).filter((h) => !anc(s, to)[h]).length;
  const prevOp = s.op;
  s.op = null;
  setHead(s, to, `reset: moving to ${ref}`);
  const T = treeOf(s, to);
  if (mode !== 'soft') s.index = cl(T);
  if (mode === 'hard') {
    s.files = Object.assign(cl(T), ut);
    r.out(`HEAD está ahora en ${C('y', short(to))} ${s.commits[to]!.msg}`);
  } else if (mode === 'mixed') {
    const e = estadoArchivos(s);
    if (e.un.length) r.out('Cambios fuera del área de stage tras el reset:', ...e.un.map((x) => C('r', 'M\t' + x.f)));
  }
  r.ev('reset', { mode, from, to, count, ref, aborted: prevOp && prevOp.kind });
};

export const stash: CommandFn = (s, a, r) => {
  const sub = a[0] && !a[0].startsWith('-') ? a[0] : 'push';
  const rest = sub === a[0] ? a.slice(1) : a;
  const idx = (): number => {
    const x = rest.find((y) => !y.startsWith('-'));
    if (!x) return 0;
    const m = /(\d+)/.exec(x);
    const i = m ? +m[1]! : 0;
    if (!s.stash[i]) fail(`error: ${x} no es una referencia de stash válida`, 'Mira tus stashes con git stash list.');
    return i;
  };

  if (sub === 'list') {
    s.stash.forEach((e, i) => r.out(C('y', `stash@{${i}}`) + ': ' + e.msg));
    if (!s.stash.length) r.out(M('(el stash está vacío)'));
    return;
  }
  if (sub === 'show') {
    if (!s.stash.length) fail('error: no hay entradas en el stash');
    const e = s.stash[idx()]!;
    r.out(...Object.keys(e.w).map((f) => ' ' + f));
    return;
  }
  if (sub === 'drop' || sub === 'clear') {
    if (!s.stash.length) fail('error: no hay entradas en el stash');
    if (sub === 'clear') {
      s.stash = [];
      r.ev('stash-dropped');
      return;
    }
    const i = idx();
    s.stash.splice(i, 1);
    r.out(`Descartado refs/stash@{${i}}`);
    r.ev('stash-dropped');
    return;
  }
  if (sub === 'pop' || sub === 'apply') {
    if (!s.stash.length) fail('error: no hay entradas en el stash', 'Guarda cambios primero con git stash.');
    const i = idx();
    const e = s.stash[i]!;
    const H = treeOf(s, headHash(s));
    for (const f in e.w) {
      if ((s.files[f] !== s.index[f] && (f in s.index || f in s.files) && s.files[f] !== (e.w[f] ?? undefined)) || s.index[f] !== H[f]) {
        fail(`error: tus cambios locales en '${f}' serían sobrescritos`, 'Haz commit o descarta esos cambios antes de recuperar el stash.');
      }
    }
    for (const f in e.w) {
      setK(s.files, f, e.w[f]);
      if (e.i[f] != null && H[f] === undefined) s.index[f] = e.i[f]!;
    }
    if (sub === 'pop') {
      s.stash.splice(i, 1);
      r.out(`Descartado refs/stash@{${i}}`);
    }
    r.ev('stash-popped', { files: Object.keys(e.w), drop: sub === 'pop' });
    status(s, [], r);
    return;
  }
  if (sub !== 'push' && sub !== 'save') fail(`error: subcomando de stash desconocido: ${sub}`, 'Usa git stash, stash list, stash pop, stash apply o stash drop.');
  const h = headHash(s);
  if (!h) fail('No puedes hacer stash antes del primer commit.');
  const e0 = estadoArchivos(s);
  if (e0.conf.length) fail('error: no puedes hacer stash con conflictos sin resolver.');
  const inclU = rest.includes('-u') || rest.includes('--include-untracked');
  const fs = [...new Set([...e0.st, ...e0.un].map((x) => x.f).concat(inclU ? e0.ut.map((x) => x.f) : []))];
  if (!fs.length) {
    r.out('No hay cambios locales para guardar' + (e0.ut.length ? M(' (los archivos sin seguimiento no se guardan; usa git stash -u)') : ''));
    return;
  }
  const mi = rest.indexOf('-m');
  const c = s.commits[h]!;
  const e: StashEntry = {
    msg: mi >= 0 && rest[mi + 1] ? `On ${curName(s) || 'HEAD'}: ${rest[mi + 1]}` : `WIP en ${curName(s) || 'HEAD'}: ${short(h)} ${c.msg}`,
    base: h,
    w: {},
    i: {},
  };
  const H: Tree = c.tree;
  for (const f of fs) {
    e.w[f] = s.files[f] ?? null;
    e.i[f] = s.index[f] ?? null;
    setK(s.files, f, H[f]);
    setK(s.index, f, H[f]);
  }
  s.stash.unshift(e);
  r.out('Directorio de trabajo y estado de índice guardados: ' + e.msg);
  r.ev('stash-pushed', { files: fs });
};

export const undoCommands: Record<string, CommandFn> = { reset, stash };
