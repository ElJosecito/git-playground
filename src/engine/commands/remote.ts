// remote/push/fetch/pull commands, ported from `design-handoff/git-engine.js`.
// The simulator has exactly one fixed remote named "origin".
import { C, M } from '../markup';
import { pl, short } from '../util';
import { curName, isAnc, anc } from '../refs';
import { fail } from '../errors';
import { merge, rebase } from './integrate';
import type { CommandFn } from '../recorder';

export const remote: CommandFn = (_s, a, r) => {
  if (a[0] === 'add' || a[0] === 'remove' || a[0] === 'rm') {
    fail('El simulador tiene un único remoto fijo llamado origin.', 'Úsalo con git push, git fetch y git pull.');
  }
  if (a.includes('-v')) r.out('origin\thttps://example.com/tu/proyecto.git (fetch)', 'origin\thttps://example.com/tu/proyecto.git (push)');
  else r.out('origin');
};

export const push: CommandFn = (s, a, r) => {
  const u = a.includes('-u') || a.includes('--set-upstream');
  const force = a.includes('-f') || a.includes('--force');
  const ps = a.filter((x) => !x.startsWith('-'));
  const rem = ps[0];
  let b = ps[1];
  if (rem && rem !== 'origin') fail(`fatal: '${rem}' no parece ser un repositorio git`, 'El único remoto es origin. Ejemplo: git push -u origin main');
  const cur = curName(s);
  if (!b) {
    if (!cur) fail('fatal: no estás en una rama.', 'Crea una con git switch -c <nombre> y vuelve a intentarlo.');
    b = cur;
    if (!rem && !s.upstream[cur]) {
      fail(`fatal: la rama actual ${cur} no tiene rama remota (upstream).`, '', C('m', 'Para subirla y enlazarla con origin, usa:'), '', `    git push -u origin ${cur}`);
    }
  }
  const loc = s.branches[b];
  if (!loc) fail(`error: src refspec ${b} no coincide con ninguna rama`, 'Mira tus ramas con git branch.');
  const rh = s.remote.branches[b];
  if (rh === loc) {
    r.out('Todo actualizado');
  } else if (rh && !isAnc(s, rh, loc) && !force) {
    fail(
      `! [rechazado]        ${b} -> ${b} (fetch first)`,
      C('e', "error: falló el push de algunas referencias a 'origin'"),
      'origin tiene commits que tú no tienes. Primero tráelos con git pull y luego vuelve a hacer push.',
    );
  } else {
    const nuevos = s.order.filter((h) => anc(s, loc)[h] && !s.remote.known[h]);
    nuevos.forEach((h) => (s.remote.known[h] = 1));
    s.remote.branches[b] = loc;
    s.tracking[b] = loc;
    r.out(
      `Enviando ${pl(nuevos.length, 'commit', 'commits')}...`,
      'To https://example.com/tu/proyecto.git',
      rh ? `   ${short(rh)}..${short(loc)}  ${b} -> ${b}${force && !isAnc(s, rh, loc) ? ' (forzado)' : ''}` : ` * [nueva rama]      ${b} -> ${b}`,
    );
    r.ev('push-sent', { branch: b, hashes: nuevos });
  }
  if (u) {
    s.upstream[b] = b;
    r.out(`rama '${b}' configurada para rastrear 'origin/${b}'.`);
  }
};

export const fetch: CommandFn = (s, _a, r) => {
  const got: string[] = [];
  const lines: string[] = [];
  for (const b in s.remote.branches) {
    const h = s.remote.branches[b]!;
    for (const x of s.order) {
      if (anc(s, h)[x] && !s.commits[x]!.local) {
        s.commits[x]!.local = true;
        got.push(x);
      }
    }
    if (s.tracking[b] !== h) {
      lines.push(s.tracking[b] ? `   ${short(s.tracking[b]!)}..${short(h)}  ${b.padEnd(10)} -> origin/${b}` : ` * [nueva rama]      ${b.padEnd(10)} -> origin/${b}`);
      s.tracking[b] = h;
    }
  }
  if (lines.length) r.out('Desde https://example.com/tu/proyecto', ...lines);
  else r.out(M('Nada nuevo en origin.'));
  r.ev('fetch-received', { hashes: got, count: lines.length });
};

export const pull: CommandFn = (s, a, r) => {
  const cur = curName(s);
  if (!cur) fail('No estás en ninguna rama.', 'Cambia a una rama con git switch <rama>.');
  const up = s.upstream[cur] || (s.remote.branches[cur] ? cur : null);
  if (!up) fail(`No hay información de rastreo para la rama actual (${cur}).`, `Sube la rama primero con git push -u origin ${cur}.`);
  if (s.op) fail(`error: hay un ${s.op.kind} en curso`);
  fetch(s, [], r);
  if (a.includes('--rebase')) rebase(s, ['origin/' + up], r);
  else merge(s, ['origin/' + up], r);
  r.ev('pull-done', { branch: cur });
};

export const remoteCommands: Record<string, CommandFn> = { remote, push, fetch, pull };
