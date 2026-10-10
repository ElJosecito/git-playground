// Basic git commands (init/status/add/restore/rm/mv/commit), ported from
// `design-handoff/git-engine.js`.
import { C, M } from '../markup';
import { fail } from '../errors';
import { keys, pl, setK, same, short } from '../util';
import { headHash, setHead, laneActual, nuevoCommit, ensureColor, colorRama } from '../state';
import { curName } from '../refs';
import { treeOf } from '../refs';
import { estadoArchivos, expand, untracked } from '../files';
import { trackLine, SUB } from '../format';
import type { CommandFn } from '../recorder';

export const init: CommandFn = (s, _a, r) => {
  if (s.inited) {
    r.out('Reinicializado el repositorio Git existente en /home/tu/proyecto/.git/');
    return;
  }
  s.inited = true;
  s.head = { type: 'branch', name: 'main' };
  ensureColor(s, 'main');
  r.out('Inicializado repositorio Git vacío en /home/tu/proyecto/.git/');
  r.ev('repo-init');
};

export const status: CommandFn = (s, _a, r) => {
  const { st, un, ut, conf } = estadoArchivos(s);
  const cur = curName(s);
  if (cur) r.out('En la rama ' + C('c:' + colorRama(s, cur), cur));
  else r.out(C('w', 'HEAD separado en ' + short((s.head as { type: 'detached'; hash: string }).hash)));
  if (s.op) {
    const k = s.op.kind;
    if (k === 'rebase') r.out(C('w', `Rebase en progreso sobre ${s.op.ontoName}.`));
    else if (k !== 'merge') r.out(C('w', `${k} en progreso de ${short(s.op.other)}.`));
  }
  if (cur) {
    const tl = trackLine(s, cur);
    if (tl) r.out(...tl.split('\n'));
  }
  if (!headHash(s)) r.out('', 'No hay commits todavía');
  if (s.op && s.op.kind === 'merge') {
    r.out(
      '',
      conf.length ? 'Tienes rutas no fusionadas.' : 'Todos los conflictos están resueltos, pero sigues fusionando.',
      M(conf.length ? '  (arregla los conflictos y ejecuta "git commit")' : '  (usa "git commit" para concluir la fusión)'),
      M('  (usa "git merge --abort" para cancelar la fusión)'),
    );
  }
  if (st.length) {
    r.out(
      '',
      'Cambios a ser confirmados:',
      M('  (usa "git restore --staged <archivo>..." para sacar del área de stage)'),
      ...st.map((x) => C('g', '\t' + SUB[x.t] + x.f)),
    );
  }
  if (conf.length) {
    r.out('', 'Rutas no fusionadas:', M('  (usa "git add <archivo>..." para marcar una resolución)'), ...conf.map((f) => C('r', '\tambos modificados:   ' + f)));
  }
  if (un.length) {
    r.out(
      '',
      'Cambios no rastreados para el commit:',
      M('  (usa "git add <archivo>..." para actualizar lo que será confirmado)'),
      M('  (usa "git restore <archivo>..." para descartar los cambios)'),
      ...un.map((x) => C('r', '\t' + SUB[x.t] + x.f)),
    );
  }
  if (ut.length) {
    r.out(
      '',
      'Archivos sin seguimiento:',
      M('  (usa "git add <archivo>..." para incluirlo en el próximo commit)'),
      ...ut.map((x) => C('r', '\t' + x.f)),
    );
  }
  if (!st.length && !un.length && !ut.length && !conf.length) {
    r.out('', headHash(s) ? 'nada para hacer commit, el árbol de trabajo está limpio' : 'nada para hacer commit (crea archivos y usa "git add" para rastrearlos)');
  } else if (!st.length && !conf.length) {
    r.out('', M('no hay cambios agregados al commit (usa "git add")'));
  }
};

export const add: CommandFn = (s, a, r) => {
  const all = a.some((x) => ['.', '-A', '--all'].includes(x));
  const ps = a.filter((x) => !x.startsWith('-') && x !== '.');
  if (!all && !ps.length) fail('Nada especificado, nada agregado.', 'Prueba git add <archivo> o git add . para añadirlo todo.');
  const pool = keys(s.index, s.files);
  const list = all ? pool : expand(s, ps, pool);
  const conf = s.op ? s.op.conflicts : [];
  for (const f of list) {
    if (!(f in s.files) && !(f in s.index)) fail(`fatal: la ruta '${f}' no coincide con ningún archivo`, `Mira los archivos que tienes con ls.`);
  }
  for (const f of list) {
    setK(s.index, f, s.files[f]);
    const i = conf.indexOf(f);
    if (i >= 0) {
      conf.splice(i, 1);
      if ((s.files[f] || '').includes('<<<<<<<')) r.out(C('w', `aviso: ${f} todavía contiene marcadores de conflicto (<<<<<<<).`));
      r.ev('conflict-resolved', { file: f });
    }
  }
  if (s.op && s.op.conflicts && !s.op.conflicts.length && conf === s.op.conflicts && list.length) {
    r.out(
      M(
        s.op.kind === 'rebase'
          ? 'Conflictos resueltos. Ahora: git rebase --continue'
          : s.op.kind === 'merge'
            ? 'Conflictos resueltos. Ahora: git commit para terminar el merge'
            : `Conflictos resueltos. Ahora: git ${s.op.kind} --continue`,
      ),
    );
  }
};

export const restore: CommandFn = (s, a, r) => {
  const staged = a.includes('--staged') || a.includes('-S');
  const ps = a.filter((x) => !x.startsWith('-'));
  if (!ps.length) fail('fatal: debes indicar qué archivo(s) restaurar', 'Ejemplo: git restore README.md');
  const H = treeOf(s, headHash(s));
  if (staged) {
    const list = ps.includes('.') ? keys(H, s.index) : expand(s, ps, keys(H, s.index));
    for (const f of list) {
      if (!(f in H) && !(f in s.index)) fail(`error: la ruta '${f}' no coincide con ningún archivo conocido por git`);
      setK(s.index, f, H[f]);
    }
  } else {
    const list = ps.includes('.') ? keys(s.index) : expand(s, ps, keys(s.index, s.files));
    for (const f of list) {
      if (!(f in s.index)) {
        fail(
          `error: la ruta '${f}' no coincide con ningún archivo conocido por git`,
          "Es un archivo sin seguimiento: Git no tiene una versión guardada a la que volver. Para borrarlo usa rm " + f + '.',
        );
      }
      s.files[f] = s.index[f]!;
    }
    r.ev('file-restored', { files: list });
  }
};

export const rm: CommandFn = (s, a, r) => {
  const cached = a.includes('--cached');
  const ps = a.filter((x) => !x.startsWith('-'));
  if (!ps.length) fail('uso: git rm <archivo>');
  const list = expand(s, ps, keys(s.index));
  for (const f of list) {
    if (!(f in s.index)) fail(`fatal: la ruta '${f}' no coincide con ningún archivo rastreado`, 'git rm solo funciona con archivos que Git ya conoce. Para archivos nuevos usa rm.');
  }
  for (const f of list) {
    delete s.index[f];
    if (!cached) delete s.files[f];
    r.out(`rm '${f}'`);
  }
};

export const mv: CommandFn = (s, a) => {
  const ps = a.filter((x) => !x.startsWith('-'));
  if (ps.length !== 2) fail('uso: git mv <origen> <destino>');
  const [x, y] = ps as [string, string];
  if (!(x in s.index)) fail(`fatal: no está bajo control de versiones, origen=${x}`);
  s.files[y] = s.files[x]!;
  delete s.files[x];
  s.index[y] = s.index[x]!;
  delete s.index[x];
};

export const commit: CommandFn = (s, a, r) => {
  let msg: string | null = null;
  let all = false;
  let amend = false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    if (x === '-m' || x === '--message') {
      msg = a[++i] ?? null;
      if (msg == null) fail('error: la opción -m necesita un mensaje', 'Ejemplo: git commit -m "Añade login"');
    } else if (/^-[am]{2}$/.test(x)) {
      all = true;
      msg = a[++i] ?? null;
      if (msg == null) fail('error: la opción -m necesita un mensaje');
    } else if (x === '-a' || x === '--all') all = true;
    else if (x === '--amend') amend = true;
    else if (x === '--no-edit') {
      // no-op
    } else if (x.startsWith('-m')) msg = x.slice(2);
    else fail(`error: opción desconocida '${x}'`, 'Opciones: -m "mensaje", -a, -am "mensaje", --amend');
  }
  if (s.op && s.op.kind === 'rebase') fail('Estás en mitad de un rebase.', 'Usa git add <archivo> y luego git rebase --continue (o git rebase --abort).');
  if (s.op && 'conflicts' in s.op && s.op.conflicts.length) fail('error: no es posible hacer commit porque tienes archivos sin fusionar.', 'Resuelve el conflicto, marca el archivo con git add y vuelve a intentarlo.');
  if (all) for (const f of keys(s.index)) setK(s.index, f, s.files[f]);
  const parent = headHash(s);
  const H = treeOf(s, parent);
  if (amend) {
    if (!parent) fail('fatal: no hay nada que corregir: aún no hay commits');
    const old = s.commits[parent]!;
    const m = msg ?? old.msg;
    const disp = Object.values(s.commits).filter((c) => c.lane === old.lane && c.x === old.x && c.dy).length;
    old.dy = -46 * (disp + 1);
    const c = nuevoCommit(s, { msg: m, parents: old.parents, tree: s.index, lane: old.lane });
    setHead(s, c.hash, 'commit (amend): ' + m);
    r.out(`[${curName(s) || 'HEAD separado'} ${C('y', c.hash.slice(0, 7))}] ${m}`);
    r.ev('commit-amended', { hash: c.hash, old: old.hash });
    return;
  }
  const parents = parent ? [parent] : [];
  const extra: Record<string, unknown> = {};
  const kind = s.op && s.op.kind;
  if (kind === 'merge' && 'other' in s.op!) {
    parents.push(s.op.other);
    msg = msg ?? s.op.msg;
  } else if (kind === 'cherry-pick' && 'other' in s.op!) {
    extra.cherryOf = s.op.other;
    msg = msg ?? s.op.msg;
  } else if (kind === 'revert' && 'other' in s.op!) {
    extra.revertOf = s.op.other;
    msg = msg ?? s.op.msg;
  }
  if (msg == null) fail('Git abriría un editor para escribir el mensaje, pero aquí no hay editor.', 'Usa git commit -m "tu mensaje".');
  if (!msg.trim()) fail('Abortando commit: el mensaje está vacío.');
  if (!kind && same(H, s.index)) {
    const e = estadoArchivos(s);
    fail(
      e.un.length || e.ut.length ? 'no hay cambios agregados al commit' : 'nada para hacer commit, el árbol de trabajo está limpio',
      e.un.length || e.ut.length
        ? 'Primero prepara los cambios con git add <archivo> (o usa git commit -am "msg" para los ya rastreados).'
        : 'Crea o modifica un archivo primero, por ejemplo: echo "hola" > notas.txt',
    );
  }
  const changed = keys(H, s.index).filter((f) => H[f] !== s.index[f]);
  const c = nuevoCommit(s, { msg, parents, tree: s.index, lane: laneActual(s), extra });
  setHead(s, c.hash, (parents.length ? 'commit: ' : 'commit (initial): ') + msg);
  const op = s.op;
  s.op = null;
  r.out(
    `[${curName(s) || 'HEAD separado'}${parents.length ? '' : ' (commit-raíz)'} ${C('y', c.hash.slice(0, 7))}] ${msg}`,
    ` ${pl(changed.length, 'archivo cambiado', 'archivos cambiados')}`,
  );
  if (kind === 'merge' && op && 'otherName' in op) r.ev('merge-commit', { hash: c.hash, theirs: op.otherName, into: curName(s) });
  else if (kind === 'cherry-pick' && op && 'other' in op) r.ev('cherry-picked', { hash: c.hash, of: op.other });
  else if (kind === 'revert' && op && 'other' in op) r.ev('reverted', { hash: c.hash, of: op.other });
  else r.ev('commit-created', { hash: c.hash, files: changed, branch: curName(s), root: !parents.length });
};

export const clean: CommandFn = (s, a, r) => {
  const ut = Object.keys(untracked(s));
  const dry = a.includes('-n') || a.includes('--dry-run');
  if (!dry && !a.some((x) => /^-[a-z]*f/.test(x))) fail('fatal: clean.requireForce está activo: usa -n para ver qué se borraría o -f para borrarlo.');
  for (const f of ut) {
    r.out((dry ? 'Se borraría ' : 'Borrando ') + f);
    if (!dry) delete s.files[f];
  }
  if (!ut.length) r.out(M('No hay archivos sin seguimiento.'));
};

export const basicsCommands = { init, status, add, restore, rm, mv, commit, clean };
