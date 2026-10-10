// Top-level session API (`envolver`, `companero`, and — from task 2.9/2.10 —
// `ejecutar`/`ejemplo`/`escribir`/`resolver`/`unaOrden`), ported from
// `design-handoff/git-engine.js`.
//
// `companero()` is built here (not in commands/remote.ts) even though it
// operates on remote state, because it shares `envolver`'s snapshot/diff
// wrapping with every other top-level session function — matching the
// oracle, where all of these live in one scope.
import { C, M } from './markup';
import { fail, GitError } from './errors';
import { cl, lev, cercano, setK } from './util';
import { vacio, ensureColor, laneFor, nuevoCommit, reflogPush } from './state';
import { diffEventos } from './events';
import { mkR, type Recorder } from './recorder';
import { tokens } from './tokens';
import { GIT } from './commands/index';
import { assertKnownGitSubcommand } from './commands/unsupported';
import { SHELL, shell } from './commands/shell';
import type { CommandResult, RepoState } from './types';

/** Wraps a pure state-mutating function with the standard snapshot/diff/error envelope. */
export function envolver(estado: RepoState, fn: (s: RepoState, r: ReturnType<typeof mkR>) => void): CommandResult {
  const s = cl(estado);
  const r = mkR();
  try {
    fn(s, r);
  } catch (e) {
    if (e instanceof GitError) return { estado, salida: e.lines, eventos: [{ type: 'error' }], error: true };
    throw e;
  }
  diffEventos(estado, s, r);
  return { estado: s, salida: r.salida, eventos: r.eventos, error: false };
}

const NOTAS = ['Añade notas de la reunión', 'Actualiza la lista de tareas', 'Corrige una errata en las notas', 'Apunta ideas para la próxima versión', 'Añade enlaces útiles'];

export function companero(estado: RepoState): CommandResult {
  return envolver(estado, (s, r) => {
    const b = s.remote.branches.main ? 'main' : Object.keys(s.remote.branches)[0];
    if (!b) fail('origin está vacío.', 'Primero sube tu rama con git push -u origin main.');
    s.tm = (s.tm || 0) + 1;
    const base = s.commits[s.remote.branches[b]!]!;
    const tree = cl(base.tree);
    tree['equipo.md'] = (tree['equipo.md'] || '# Notas del equipo') + `\n- Nota ${s.tm} de Lucía`;
    const c = nuevoCommit(s, { msg: NOTAS[(s.tm - 1) % NOTAS.length]!, parents: [base.hash], tree, lane: laneFor(s, b), author: 'Lucía <lucia@ejemplo.com>', extra: { local: false } });
    s.remote.branches[b] = c.hash;
    s.remote.known[c.hash] = 1;
    r.out(M(`Lucía subió "${c.msg}" a origin/${b}. Tu repositorio aún no lo sabe: prueba git fetch.`));
    r.ev('remote-commit', { hash: c.hash, branch: b });
  });
}

function unaOrden(s: RepoState, tk: string[], r: Recorder): void {
  const [cmd, ...a] = tk;
  if (cmd === 'git') {
    const sub = a[0];
    const rest = a.slice(1);
    if (!sub) {
      r.out('uso: git <comando> [<args>]', M('Escribe help para ver todos los comandos.'));
      return;
    }
    if (sub === '--version' || sub === '-v') return GIT.version!(s, rest, r);
    if (sub === '--help') return GIT.help!(s, rest, r);
    assertKnownGitSubcommand(sub, Object.keys(GIT));
    if (!s.inited && !['init', 'help', 'version'].includes(sub)) {
      fail('fatal: no es un repositorio git (ni ninguno de los directorios superiores): .git', 'Esta carpeta todavía no es un repositorio. Escribe git init para crearlo.');
    }
    return GIT[sub]!(s, rest, r);
  }
  if (SHELL.includes(cmd!)) return shell(s, cmd!, a, r);
  if (['gti', 'got', 'gi', 'gitt', 'tig'].includes(cmd!) || lev(cmd!, 'git') === 1) {
    fail(`comando no encontrado: ${cmd}`, `¿Quisiste decir git ${a.join(' ')}?`);
  }
  if (['vim', 'vi', 'nano', 'code', 'emacs'].includes(cmd!)) {
    fail(`${cmd} no está disponible en el simulador.`, `Usa edit ${a[0] || '<archivo>'} para abrir el mini editor.`);
  }
  if (['sudo', 'npm', 'node', 'python', 'curl', 'wget', 'ssh'].includes(cmd!)) {
    fail(`${cmd}: este terminal solo simula Git y algunos comandos de archivos.`, 'Nada se ejecuta en tu ordenador. Escribe help para ver qué puedes usar.');
  }
  const near = cercano(cmd!, SHELL.concat(['git']));
  fail(`comando no encontrado: ${cmd}`, near ? `¿Quisiste decir ${near}?` : 'Escribe help para ver los comandos disponibles.');
}

export function ejecutar(estado: RepoState, entrada: string): CommandResult {
  const raw = (entrada || '').trim();
  if (!raw) return { estado, salida: [], eventos: [] } as CommandResult;
  const tk = tokens(raw);
  if (!tk) {
    return {
      estado,
      salida: [C('e', 'Faltan comillas de cierre.'), M('Revisa que el mensaje empiece y termine con comillas: git commit -m "mi mensaje"')],
      eventos: [{ type: 'error' }],
      error: true,
    };
  }
  const s = cl(estado);
  const r = mkR();
  const groups: string[][] = [[]];
  for (const t of tk) {
    if (t === '&&' || t === ';') groups.push([]);
    else groups[groups.length - 1]!.push(t);
  }
  try {
    for (const g of groups) if (g.length) unaOrden(s, g, r);
  } catch (e) {
    if (e instanceof GitError) {
      // Oracle quirk: `r.salida.length?estado:estado` always evaluates to
      // `estado` — the whole command chain rolls back to the pre-command
      // state on error, regardless of how much output earlier groups in
      // the same `&&`/`;` chain had already produced. Ported as-is.
      return { estado, salida: r.salida.concat(e.lines), eventos: [{ type: 'error' }], error: true };
    }
    // eslint-disable-next-line no-console
    console.error(e);
    return { estado, salida: [C('e', 'Error interno del simulador: ' + (e as Error).message), M('Tu repositorio no ha cambiado.')], eventos: [{ type: 'error' }], error: true };
  }
  diffEventos(estado, s, r);
  return { estado: s, salida: r.salida, eventos: r.eventos, accion: r.accion, error: false };
}

export function ejemplo(): RepoState {
  const s = vacio();
  s.inited = true;
  ensureColor(s, 'main');
  const lane = laneFor(s, 'main');
  const t0 = Date.UTC(2026, 9, 6, 9, 12);
  const c1 = nuevoCommit(s, { msg: 'Primer commit', parents: [], tree: { 'README.md': '# Mi proyecto' }, lane, t: t0 });
  s.branches.main = c1.hash;
  reflogPush(s, 'commit (initial): Primer commit');
  const c2 = nuevoCommit(s, {
    msg: 'Añade descripción al README',
    parents: [c1.hash],
    tree: { 'README.md': '# Mi proyecto\n\nUn lugar para practicar Git sin miedo.' },
    lane,
    t: t0 + 3600e3,
  });
  s.branches.main = c2.hash;
  reflogPush(s, 'commit: Añade descripción al README');
  s.files = cl(c2.tree);
  s.index = cl(c2.tree);
  s.remote.branches.main = c2.hash;
  s.remote.known[c1.hash] = 1;
  s.remote.known[c2.hash] = 1;
  s.tracking.main = c2.hash;
  s.upstream.main = 'main';
  return s;
}

export function escribir(estado: RepoState, f: string, txt: string): CommandResult {
  return envolver(estado, (s) => {
    s.files[f] = txt;
  });
}

export function resolver(estado: RepoState, f: string, modo: 'mia' | 'suya' | 'ambas'): CommandResult {
  return envolver(estado, (s, r) => {
    const d = s.op && 'data' in s.op && s.op.data && s.op.data[f];
    if (!d) fail('No hay conflicto en ' + f);
    const v = modo === 'mia' ? d.ours : modo === 'suya' ? d.theirs : [d.ours, d.theirs].filter((x) => x != null).join('\n');
    setK(s.files, f, v);
    r.out(M(`Resolviste ${f} (${modo === 'mia' ? 'tu versión' : modo === 'suya' ? 'la otra versión' : 'ambas versiones'}). Ahora márcalo con: git add ${f}`));
  });
}
