// Shared branch-movement helpers (used by branch/switch/checkout), ported
// from `design-handoff/git-engine.js`.
import { C } from '../markup';
import { fail } from '../errors';
import { short } from '../util';
import { headHash, ensureColor, colorRama, reflogPush } from '../state';
import { curName } from '../refs';
import { cambiarArbol } from '../files';
import { trackLine } from '../format';
import type { Recorder } from '../recorder';
import type { Hash, RepoState } from '../types';

export function crearRama(s: RepoState, n: string, h: Hash, r: Recorder): void {
  if (!/^[A-Za-z0-9._/-]+$/.test(n) || n.startsWith('-') || n.includes('..') || n === 'HEAD' || n.endsWith('/')) {
    fail(`fatal: '${n}' no es un nombre válido para una rama`, 'Usa letras, números, guiones o barras, sin espacios. Ejemplo: feature/login');
  }
  if (n in s.branches) fail(`fatal: una rama llamada '${n}' ya existe`, `Para ir a ella: git switch ${n}`);
  ensureColor(s, n);
  s.branches[n] = h;
  r.ev('branch-created', { name: n, hash: h });
}

export function irARama(s: RepoState, n: string, r: Recorder): void {
  if (s.op) {
    fail(
      `error: no puedes cambiar de rama en mitad de un ${s.op.kind}`,
      `Termínalo (git add + git commit${s.op.kind === 'rebase' ? ' / git rebase --continue' : ''}) o cancélalo con git ${s.op.kind} --abort.`,
    );
  }
  if (curName(s) === n) {
    r.out(`Ya en '${n}'`);
    return;
  }
  cambiarArbol(s, s.branches[n] ?? null);
  const from = curName(s) || short(headHash(s));
  s.prev = from;
  s.head = { type: 'branch', name: n };
  reflogPush(s, `checkout: moving from ${from} to ${n}`);
  r.out(`Cambiado a rama '${C('c:' + colorRama(s, n), n)}'`);
  const tl = trackLine(s, n);
  if (tl) r.out(...tl.split('\n'));
  r.ev('switched', { name: n });
}

export function separar(s: RepoState, h: Hash, label: string, r: Recorder): void {
  if (s.op) fail(`error: no puedes moverte en mitad de un ${s.op.kind}`, `Cancélalo con git ${s.op.kind} --abort.`);
  if (s.head.type === 'detached' && s.head.hash === h) {
    r.out(`HEAD ya está en ${short(h)}`);
    return;
  }
  cambiarArbol(s, h);
  s.prev = curName(s) || short(headHash(s));
  s.head = { type: 'detached', hash: h };
  reflogPush(s, `checkout: moving to ${label}`);
  r.out(
    `Nota: cambiando a '${label}'.`,
    '',
    C('w', "Estás en estado 'HEAD separado'.") + ' Puedes mirar, experimentar y hacer commits;',
    'si quieres conservarlos, crea una rama con git switch -c <nombre>.',
    '',
    `HEAD está ahora en ${C('y', short(h))} ${s.commits[h]!.msg}`,
  );
  r.ev('detached', { hash: h });
}
