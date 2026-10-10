// merge/rebase/cherry-pick/revert commands + the shared op-application
// helpers, ported from `design-handoff/git-engine.js`.
import { C, M } from '../markup';
import { fail } from '../errors';
import { cl, short, same } from '../util';
import { headHash, setHead, laneActual, nuevoCommit, reflogPush } from '../state';
import { curName, isAnc, mergeBase, anc, resolveOr, treeOf } from '../refs';
import { sucio, untracked } from '../files';
import { fusionar3, aplicarResultado } from '../diff';
import { AUTOR } from '../constants';
import { commit } from './basics';
import type { CommandFn, Recorder } from '../recorder';
import type { OpKind, PickOp, RebaseOp, RepoState } from '../types';

export const merge: CommandFn = (s, a, r) => {
  if (a.includes('--abort')) {
    if (!s.op || s.op.kind !== 'merge') fail('fatal: no hay ningún merge en curso que cancelar');
    const op = s.op as PickOp;
    s.files = op.origW;
    s.index = op.origI;
    s.op = null;
    r.ev('op-aborted', { kind: 'merge' });
    return;
  }
  if (a.includes('--continue')) return commit(s, [], r);
  const noff = a.includes('--no-ff');
  let msg: string | null = null;
  const mi = a.indexOf('-m');
  if (mi >= 0) msg = a[mi + 1] ?? null;
  const t = a.filter((x, i) => (!x.startsWith('-') && i !== mi + 1) || (mi < 0 && !x.startsWith('-')))[0];
  if (!t) fail('fatal: falta la rama que quieres unir', 'Ejemplo: git merge feature');
  if (s.op) fail(`error: ya hay un ${s.op.kind} en curso`, `Termínalo o cancélalo con git ${s.op.kind} --abort.`);
  const theirs = resolveOr(s, t);
  const ours = headHash(s);
  if (!ours) fail('fatal: tu rama todavía no tiene commits');
  if (sucio(s)) fail('error: tienes cambios sin confirmar; el merge podría pisarlos.', 'Haz commit de tus cambios o guárdalos con git stash antes de unir ramas.');
  const into = curName(s) || 'HEAD';
  if (isAnc(s, theirs, ours)) {
    r.out('Ya está actualizado.');
    r.ev('up-to-date');
    return;
  }
  if (isAnc(s, ours, theirs) && !noff) {
    const T = treeOf(s, theirs);
    const ut = untracked(s);
    for (const f in ut) if (f in T) fail(`error: el archivo sin seguimiento '${f}' sería sobrescrito por el merge`, 'Muévelo, bórralo o haz commit de él primero.');
    setHead(s, theirs, `merge ${t}: Fast-forward`);
    s.index = cl(T);
    s.files = Object.assign(cl(T), ut);
    r.out(`Actualizando ${short(ours)}..${short(theirs)}`, 'Fast-forward');
    r.ev('fast-forward', { ref: into, theirs: t, from: ours, to: theirs });
    return;
  }
  const base = mergeBase(s, ours, theirs);
  const m = fusionar3(treeOf(s, base), treeOf(s, ours), treeOf(s, theirs));
  const defMsg = (msg || (t.startsWith('origin/') ? `Merge remote-tracking branch '${t}'` : `Merge branch '${t}'`)) + (into !== 'main' && into !== 'HEAD' ? ` into ${into}` : '');
  if (m.conf.length) {
    s.op = { kind: 'merge', other: theirs, otherName: t, conflicts: m.conf, data: m.data, msg: defMsg, origW: cl(s.files), origI: cl(s.index) };
    aplicarResultado(s, m, t);
    r.out(
      ...m.conf.map((f) => 'Auto-fusionando ' + f),
      ...m.conf.map((f) => C('e', 'CONFLICTO (contenido): conflicto de fusión en ' + f)),
      C('e', 'La fusión automática falló; arregla los conflictos y luego haz commit con el resultado.'),
    );
    r.ev('merge-conflict', { files: m.conf, kind: 'merge', theirs: t });
    return;
  }
  const c = nuevoCommit(s, { msg: defMsg, parents: [ours, theirs], tree: m.tree, lane: laneActual(s) });
  setHead(s, c.hash, `merge ${t}: Merge made by the 'ort' strategy.`);
  s.index = cl(m.tree);
  s.files = Object.assign(cl(m.tree), untracked(s));
  r.out("Merge hecho por la estrategia 'ort'.");
  r.ev('merge-commit', { hash: c.hash, theirs: t, into });
};

function procesarRebase(s: RepoState, r: Recorder): void {
  const op = s.op as RebaseOp;
  while (op.todo.length) {
    const h = op.todo.shift()!;
    const c = s.commits[h]!;
    const cur = treeOf(s, headHash(s));
    const m = fusionar3(treeOf(s, c.parents[0] ?? null), cur, c.tree);
    if (m.conf.length) {
      op.current = h;
      op.other = h;
      op.otherName = short(h) + ' (' + c.msg + ')';
      op.conflicts = m.conf;
      op.data = m.data;
      aplicarResultado(s, m, short(h));
      r.out(
        ...m.conf.map((f) => C('e', 'CONFLICTO (contenido): conflicto de fusión en ' + f)),
        C('e', `error: no se pudo aplicar ${short(h)}... ${c.msg}`),
        M('Resuelve el conflicto, usa git add <archivo> y luego git rebase --continue.'),
        M('Para cancelar todo: git rebase --abort.'),
      );
      r.ev('merge-conflict', { files: m.conf, kind: 'rebase' });
      return;
    }
    if (same(m.tree, cur)) {
      r.out(M(`Saltado ${short(h)}: sus cambios ya estaban.`));
      continue;
    }
    const n = nuevoCommit(s, { msg: c.msg, parents: [headHash(s)!], tree: m.tree, lane: op.lane, author: c.author, extra: { copyOf: h } });
    setHead(s, n.hash, 'rebase (pick): ' + c.msg);
    op.pairs.push([h, n.hash]);
    s.index = cl(n.tree);
    s.files = Object.assign(cl(n.tree), untracked(s));
  }
  r.out(`Rebase aplicado satisfactoriamente y actualizado ${op.branch ? 'refs/heads/' + op.branch : 'HEAD'}.`);
  r.ev('commits-copied', { pairs: op.pairs });
  r.ev('rebase-done', { count: op.pairs.length, branch: op.branch, onto: op.ontoName });
  s.op = null;
}

export const rebase: CommandFn = (s, a, r) => {
  if (a.includes('--abort')) {
    if (!s.op || s.op.kind !== 'rebase') fail('fatal: no hay ningún rebase en curso');
    const op = s.op as RebaseOp;
    if (op.branch) {
      s.head = { type: 'branch', name: op.branch };
      s.branches[op.branch] = op.orig;
    } else {
      s.head = { type: 'detached', hash: op.orig };
    }
    reflogPush(s, 'rebase (abort)');
    s.index = cl(treeOf(s, op.orig));
    s.files = Object.assign(cl(treeOf(s, op.orig)), op.ut);
    s.op = null;
    r.out('Rebase cancelado: todo vuelve a como estaba.');
    r.ev('op-aborted', { kind: 'rebase' });
    return;
  }
  if (a.includes('--continue')) {
    if (!s.op || s.op.kind !== 'rebase') fail('fatal: no hay ningún rebase en curso');
    const op = s.op as RebaseOp;
    if (op.conflicts.length) fail('error: todavía hay archivos en conflicto: ' + op.conflicts.join(', '), 'Resuélvelos y márcalos con git add <archivo>.');
    const c = s.commits[op.current!]!;
    op.conflicts = [];
    if (!same(s.index, treeOf(s, headHash(s)))) {
      const n = nuevoCommit(s, { msg: c.msg, parents: [headHash(s)!], tree: s.index, lane: op.lane, author: c.author, extra: { copyOf: op.current } });
      setHead(s, n.hash, 'rebase (continue): ' + c.msg);
      op.pairs.push([op.current!, n.hash]);
    }
    s.files = Object.assign(cl(s.index), untracked(s));
    return procesarRebase(s, r);
  }
  if (a.includes('-i') || a.includes('--interactive')) {
    fail('El rebase interactivo (-i) todavía no está en el simulador.', 'Prueba git rebase <rama>, git reset o git commit --amend para reescribir historia.');
  }
  const t = a.find((x) => !x.startsWith('-'));
  if (!t) fail('fatal: falta la rama sobre la que hacer rebase', 'Ejemplo: git rebase main');
  if (s.op) fail(`error: ya hay un ${s.op.kind} en curso`);
  const up = resolveOr(s, t);
  const ours = headHash(s);
  if (!ours) fail('fatal: tu rama todavía no tiene commits');
  if (sucio(s)) fail('error: no puedes hacer rebase: tienes cambios sin confirmar.', 'Haz commit o guárdalos con git stash primero.');
  if (isAnc(s, up, ours)) {
    r.out(`La rama actual ${curName(s) || 'HEAD'} está al día.`);
    r.ev('up-to-date');
    return;
  }
  if (isAnc(s, ours, up)) {
    setHead(s, up, 'rebase: fast-forward');
    s.index = cl(treeOf(s, up));
    s.files = Object.assign(cl(treeOf(s, up)), untracked(s));
    r.out(`Avance rápido de ${curName(s) || 'HEAD'} hasta ${t}.`);
    r.ev('fast-forward', { ref: curName(s) || 'HEAD', theirs: t, from: ours, to: up });
    return;
  }
  const U = anc(s, up);
  const O = anc(s, ours);
  const todo = s.order.filter((h) => O[h] && !U[h] && s.commits[h]!.parents.length < 2);
  s.op = { kind: 'rebase', onto: up, ontoName: t, todo, pairs: [], branch: curName(s), orig: ours, ut: untracked(s), lane: laneActual(s), conflicts: [] };
  setHead(s, up, 'rebase (start): checkout ' + t);
  s.index = cl(treeOf(s, up));
  s.files = Object.assign(cl(treeOf(s, up)), (s.op as RebaseOp).ut);
  procesarRebase(s, r);
};

function opAplicar(s: RepoState, a: string[], r: Recorder, kind: 'cherry-pick' | 'revert'): void {
  if (a.includes('--abort')) {
    if (!s.op || s.op.kind !== kind) fail(`fatal: no hay ningún ${kind} en curso`);
    const op = s.op as PickOp;
    s.files = op.origW;
    s.index = op.origI;
    s.op = null;
    r.ev('op-aborted', { kind });
    return;
  }
  if (a.includes('--continue')) {
    if (!s.op || s.op.kind !== kind) fail(`fatal: no hay ningún ${kind} en curso`);
    return commit(s, [], r);
  }
  const t = a.find((x) => !x.startsWith('-'));
  if (!t) fail(`fatal: falta el commit`, `Ejemplo: git ${kind} a1b2c3d (mira los hashes con git log --oneline --all)`);
  if (s.op) fail(`error: ya hay un ${s.op.kind} en curso`);
  const h = resolveOr(s, t);
  const c = s.commits[h]!;
  const ours = headHash(s);
  if (!ours) fail('fatal: tu rama todavía no tiene commits');
  if (c.parents.length > 1) fail(`error: ${short(h)} es un commit de merge.`, 'El simulador todavía no permite ' + kind + ' de merges (en Git real necesitarías -m 1). Prueba con un commit normal.');
  if (sucio(s)) fail(`error: tus cambios locales serían sobrescritos por ${kind}.`, 'Haz commit o guárdalos con git stash primero.');
  const P = treeOf(s, c.parents[0] ?? null);
  const m = kind === 'revert' ? fusionar3(c.tree, treeOf(s, ours), P) : fusionar3(P, treeOf(s, ours), c.tree);
  const msg = kind === 'revert' ? `Revert "${c.msg}"` : c.msg;
  if (m.conf.length) {
    s.op = { kind, other: h, otherName: short(h), conflicts: m.conf, data: m.data, msg, origW: cl(s.files), origI: cl(s.index) };
    aplicarResultado(s, m, short(h));
    r.out(
      ...m.conf.map((f) => C('e', 'CONFLICTO (contenido): conflicto de fusión en ' + f)),
      C('e', `error: no se pudo aplicar ${short(h)}... ${c.msg}`),
      M(`Resuelve el conflicto, usa git add <archivo> y luego git ${kind} --continue (o --abort).`),
    );
    r.ev('merge-conflict', { files: m.conf, kind: kind as OpKind });
    return;
  }
  if (same(m.tree, treeOf(s, ours))) fail(kind === 'revert' ? 'Nada que revertir: esos cambios ya no están.' : 'El cherry-pick quedaría vacío: esos cambios ya están en tu rama.');
  const n = nuevoCommit(s, {
    msg,
    parents: [ours],
    tree: m.tree,
    lane: laneActual(s),
    author: kind === 'revert' ? AUTOR : c.author,
    extra: kind === 'revert' ? { revertOf: h } : { cherryOf: h },
  });
  setHead(s, n.hash, `${kind}: ${msg}`);
  s.index = cl(m.tree);
  s.files = Object.assign(cl(m.tree), untracked(s));
  r.out(`[${curName(s) || 'HEAD separado'} ${C('y', short(n.hash))}] ${msg}`);
  r.ev(kind === 'revert' ? 'reverted' : 'cherry-picked', { hash: n.hash, of: h });
}

export const cherryPick: CommandFn = (s, a, r) => opAplicar(s, a, r, 'cherry-pick');
export const revert: CommandFn = (s, a, r) => opAplicar(s, a, r, 'revert');

export const integrateCommands: Record<string, CommandFn> = { merge, rebase, 'cherry-pick': cherryPick, revert };
