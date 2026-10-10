// branch/switch/checkout/tag commands, ported from `design-handoff/git-engine.js`.
import { C, M } from '../markup';
import { fail } from '../errors';
import { short, cercano } from '../util';
import { headHash, ensureColor, colorRama, reflogPush } from '../state';
import { curName, isAnc, resolve, resolveOr, treeOf } from '../refs';
import { cambiarArbol } from '../files';
import { crearRama, irARama, separar } from './branching';
import type { CommandFn } from '../recorder';
import type { Head } from '../types';

export const branch: CommandFn = (s, a, r) => {
  const o = a.filter((x) => x.startsWith('-'));
  const ps = a.filter((x) => !x.startsWith('-'));
  const cur = curName(s);

  if (o.some((x) => ['-d', '-D', '--delete'].includes(x))) {
    if (!ps.length) fail('fatal: falta el nombre de la rama', 'Ejemplo: git branch -d feature');
    const force = o.includes('-D');
    for (const n of ps) {
      if (!(n in s.branches)) fail(`error: rama '${n}' no encontrada.`);
      if (n === cur) fail(`error: no puedes borrar la rama '${n}' porque estás en ella`, 'Cambia antes a otra rama, por ejemplo: git switch main');
      const h = s.branches[n]!;
      const headH = headHash(s);
      const up = s.upstream[n];
      const mergedViaUpstream = !!(up && s.tracking[up] && isAnc(s, h, s.tracking[up]!));
      if (!force && !isAnc(s, h, headH ?? '') && !mergedViaUpstream) {
        fail(`error: la rama '${n}' no ha sido fusionada completamente.`, `Si la borras, sus commits quedarán sin referencia. Si estás seguro: git branch -D ${n}`);
      }
      delete s.branches[n];
      delete s.upstream[n];
      r.out(`Eliminada la rama ${n} (era ${C('y', short(h))}).`);
      r.ev('branch-deleted', { name: n });
    }
    return;
  }

  if (o.some((x) => ['-m', '-M', '--move'].includes(x))) {
    let x: string | undefined = ps[0];
    let y: string | undefined = ps[1];
    if (ps.length === 1) {
      y = x;
      x = cur ?? undefined;
    }
    if (!x || !y) fail('uso: git branch -m <viejo> <nuevo>');
    if (!(x in s.branches)) fail(`error: rama '${x}' no encontrada.`);
    if (y in s.branches) fail(`fatal: una rama llamada '${y}' ya existe`);
    s.branches[y] = s.branches[x]!;
    delete s.branches[x];
    if (x in s.colorOf) {
      s.colorOf[y] = s.colorOf[x]!;
      delete s.colorOf[x];
    }
    if (x in s.laneOf) {
      s.laneOf[y] = s.laneOf[x]!;
      delete s.laneOf[x];
      s.lanes[s.laneOf[y]]!.name = y;
    }
    if (x in s.upstream) {
      s.upstream[y] = s.upstream[x]!;
      delete s.upstream[x];
    }
    if (cur === x) (s.head as Extract<Head, { type: 'branch' }>).name = y;
    r.ev('branch-renamed', { from: x, to: y });
    return;
  }

  if (ps.length) {
    const h = ps[1] ? resolveOr(s, ps[1]) : headHash(s);
    if (!h) fail(`fatal: no es un nombre de objeto válido: '${cur}'.`, 'Una rama apunta a un commit, y todavía no hay ninguno. Haz tu primer commit.');
    crearRama(s, ps[0]!, h, r);
    return;
  }

  const names = Object.keys(s.branches).sort();
  if (!names.length && !o.includes('-a')) {
    r.out(M('(no hay ramas todavía: haz un primer commit)'));
    return;
  }
  if (s.head.type === 'detached') r.out('* ' + C('w', `(HEAD separado en ${short(s.head.hash)})`));
  if (!o.includes('-r')) for (const n of names) r.out(n === cur ? '* ' + C('g', n) : '  ' + n);
  if (o.includes('-a') || o.includes('-r')) for (const b of Object.keys(s.tracking).sort()) r.out('  ' + C('r', 'remotes/origin/' + b));
};

export const switchCmd: CommandFn = (s, a, r) => {
  const create = a.some((x) => ['-c', '-C', '--create'].includes(x));
  const det = a.some((x) => ['-d', '--detach'].includes(x));
  const ps = a.filter((x) => !x.startsWith('-') || x === '-');
  if (!ps.length) fail('fatal: falta la rama a la que cambiar', 'Ejemplo: git switch main  ·  o crea una: git switch -c nueva');

  if (create) {
    const n = ps[0]!;
    const h = ps[1] ? resolveOr(s, ps[1]) : headHash(s);
    if (!h) {
      if (n in s.branches) fail(`fatal: una rama llamada '${n}' ya existe`);
      s.head = { type: 'branch', name: n };
      ensureColor(s, n);
      r.out(`Cambiado a nueva rama '${n}'`);
      r.ev('branch-created', { name: n });
      return;
    }
    if (s.op) fail(`error: no puedes cambiar de rama en mitad de un ${s.op.kind}`);
    crearRama(s, n, h, r);
    cambiarArbol(s, h);
    s.prev = curName(s) || short(headHash(s));
    s.head = { type: 'branch', name: n };
    reflogPush(s, `checkout: moving to ${n}`);
    r.out(`Cambiado a nueva rama '${C('c:' + colorRama(s, n), n)}'`);
    r.ev('switched', { name: n, created: true });
    return;
  }

  let t = ps[0]!;
  if (t === '-') {
    if (!s.prev) fail('fatal: no hay rama anterior');
    t = s.prev;
  }
  if (t in s.branches && !det) return irARama(s, t, r);
  if (!det && s.tracking[t]) {
    crearRama(s, t, s.tracking[t]!, r);
    s.upstream[t] = t;
    irARama(s, t, r);
    r.out(`rama '${t}' configurada para rastrear 'origin/${t}'.`);
    return;
  }
  const h = resolve(s, t);
  if (h && det) return separar(s, h, t, r);
  if (h) fail(`fatal: se esperaba una rama, se obtuvo '${t}'`, `git switch solo cambia entre ramas. Para visitar un commit usa git switch --detach ${t} o git checkout ${t}.`);
  const near = cercano(t, Object.keys(s.branches));
  fail(`fatal: referencia inválida: ${t}`, near ? `¿Quisiste decir git switch ${near}?` : `Esa rama no existe. Créala con git switch -c ${t}`);
};

export const checkout: CommandFn = (s, a, r) => {
  const dd = a.indexOf('--');
  if (dd >= 0) {
    const ps = a.slice(dd + 1);
    const src = dd > 0 ? resolveOr(s, a[0]!) : null;
    if (!ps.length) fail('uso: git checkout -- <archivo>');
    const T = src ? treeOf(s, src) : s.index;
    for (const f of ps) {
      if (!(f in T)) fail(`error: la ruta '${f}' no coincide con ningún archivo conocido por git`);
      s.files[f] = T[f]!;
      if (src) s.index[f] = T[f]!;
    }
    r.ev('file-restored', { files: ps });
    return;
  }
  const bi = a.findIndex((x) => x === '-b' || x === '-B');
  if (bi >= 0) {
    const rest = a.filter((_x, i) => i !== bi);
    return switchCmd(s, ['-c', ...rest], r);
  }
  const t = a.find((x) => !x.startsWith('-'));
  if (!t) fail('uso: git checkout <rama | hash | -- archivo>');
  if (t === '-') {
    if (!s.prev) fail('fatal: no hay rama anterior');
    return checkout(s, [s.prev], r);
  }
  if (t in s.branches) return irARama(s, t, r);
  if (s.tracking[t] && !t.startsWith('origin/')) return switchCmd(s, [t], r);
  const h = resolve(s, t);
  if (h) return separar(s, h, t, r);
  if (t in s.index) {
    s.files[t] = s.index[t]!;
    r.out(`Actualizada 1 ruta desde el índice`);
    r.ev('file-restored', { files: [t] });
    return;
  }
  const near = cercano(t, [...Object.keys(s.branches), ...Object.keys(s.files)]);
  fail(`error: la ruta '${t}' no coincide con ninguna rama, commit ni archivo`, near ? `¿Quisiste decir ${near}?` : 'Mira tus ramas con git branch y tus commits con git log --oneline.');
};

export const tag: CommandFn = (s, a, r) => {
  const o = a.filter((x) => x.startsWith('-'));
  const ps: string[] = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '-m') {
      i++;
      continue;
    }
    if (!a[i]!.startsWith('-')) ps.push(a[i]!);
  }
  if (o.includes('-d')) {
    for (const n of ps) {
      if (!(n in s.tags)) fail(`error: tag '${n}' no encontrado.`);
      r.out(`Eliminado tag '${n}' (era ${short(s.tags[n]!)})`);
      delete s.tags[n];
      r.ev('tag-deleted', { name: n });
    }
    return;
  }
  if (!ps.length) {
    const t = Object.keys(s.tags).sort();
    r.out(...(t.length ? t : [M('(no hay tags todavía. Crea uno: git tag v1.0)')]));
    return;
  }
  const n = ps[0]!;
  if (!/^[A-Za-z0-9._/-]+$/.test(n)) fail(`fatal: '${n}' no es un nombre de tag válido`);
  if (n in s.tags) fail(`fatal: el tag '${n}' ya existe`);
  const h = resolveOr(s, ps[1] || 'HEAD');
  s.tags[n] = h;
  r.ev('tag-created', { name: n, hash: h });
};

export const branchesCommands: Record<string, CommandFn> = { branch, switch: switchCmd, checkout, tag };
