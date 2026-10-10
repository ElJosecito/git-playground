// Shell-level commands (ls/cat/touch/echo/rm/mv/edit/pwd/cd/mkdir/clear) plus
// `GIT.help`/`GIT.version`, ported from `design-handoff/git-engine.js`.
import { C, M } from '../markup';
import { fail } from '../errors';
import { validName } from '../files';
import type { CommandFn, Recorder } from '../recorder';
import type { RepoState } from '../types';

const AYUDA = [
  C('bold', 'Comandos disponibles') + M('  (todo ocurre en el simulador)'),
  M('Archivos  ') + 'ls · cat · touch · echo "texto" > archivo · echo … >> archivo · rm · mv · edit · clear',
  M('Básico    ') + 'git init · status · add <archivo|.> · restore [--staged] · rm · commit -m / -am / --amend',
  M('Historia  ') + 'git log [--oneline --graph --all] · show [ref] · diff [--staged] · reflog',
  M('Ramas     ') + 'git branch [-d -D -m -a] · switch [-c] · checkout [-b | hash | -- archivo] · tag',
  M('Integrar  ') + 'git merge [--no-ff --abort] · rebase [--continue --abort] · cherry-pick <hash>',
  M('Deshacer  ') + 'git reset --soft|--mixed|--hard <ref> · revert <hash> · stash [list pop apply drop]',
  M('Remoto    ') + 'git remote -v · push [-u origin rama] · fetch · pull',
  M('Refs      ') + 'hashes cortos, ramas, HEAD, HEAD~2, HEAD^, origin/main',
  M('Atajos    ') + '↑/↓ historial · Tab autocompleta · Ctrl+L limpia',
];

export const help: CommandFn = (_s, _a, r) => {
  r.out(...AYUDA);
};

export const version: CommandFn = (_s, _a, r) => {
  r.out('git version 2.47.0 (simulado)');
};

export const SHELL = ['ls', 'cat', 'touch', 'echo', 'rm', 'mv', 'clear', 'help', 'edit', 'pwd', 'cd', 'mkdir'];

export function shell(s: RepoState, cmd: string, a: string[], r: Recorder): void {
  switch (cmd) {
    case 'help':
      return help(s, a, r);
    case 'ls': {
      const fs = Object.keys(s.files).sort();
      const all = a.some((x) => /^-\w*a/.test(x));
      const L = all && s.inited ? ['.git', ...fs] : fs;
      if (L.length) r.out(L.map((f) => (f === '.git' ? M(f) : f)).join('   '));
      return;
    }
    case 'pwd':
      r.out('/home/tu/proyecto');
      return;
    case 'cd':
      r.out(M('En el simulador trabajas siempre en ~/proyecto (sin carpetas).'));
      return;
    case 'mkdir':
      fail('mkdir: el simulador todavía no admite carpetas.', 'Crea archivos sueltos con touch o echo.');
      return;
    case 'cat': {
      if (!a.length) fail('uso: cat <archivo>');
      for (const f of a) {
        if (!(f in s.files)) fail(`cat: ${f}: No existe el archivo`, 'Mira qué archivos hay con ls.');
        const t = s.files[f]!;
        r.out(...(t === '' ? [M('(archivo vacío)')] : t.split('\n')));
      }
      return;
    }
    case 'touch': {
      if (!a.length) fail('uso: touch <archivo>');
      for (const f of a) {
        if (!validName(f)) fail(`touch: nombre no válido: ${f}`, 'Usa letras, números, puntos y guiones (sin carpetas).');
        if (!(f in s.files)) s.files[f] = '';
      }
      return;
    }
    case 'edit': {
      const f = a[0];
      if (!f) fail('uso: edit <archivo>');
      if (!validName(f)) fail(`edit: nombre no válido: ${f}`);
      r.accion = { tipo: 'editar', archivo: f };
      return;
    }
    case 'echo': {
      const i = a.findIndex((x) => x === '>' || x === '>>');
      const text = (i < 0 ? a : a.slice(0, i)).join(' ');
      if (i < 0) {
        r.out(text);
        return;
      }
      const f = a[i + 1];
      if (!f) fail('echo: falta el archivo después de ' + a[i]);
      if (!validName(f)) fail(`echo: nombre de archivo no válido: ${f}`);
      if (a[i] === '>') s.files[f] = text;
      else s.files[f] = (s.files[f] ? s.files[f] + '\n' : '') + text;
      return;
    }
    case 'rm': {
      const ps = a.filter((x) => !x.startsWith('-'));
      if (!ps.length) fail('uso: rm <archivo>');
      for (const f of ps) {
        if (f === '.git') fail('rm: mejor no: borrarías todo el historial.', 'Si quieres empezar de cero usa el botón "Reiniciar repositorio".');
        if (!(f in s.files)) fail(`rm: no se puede borrar '${f}': No existe el archivo`);
        delete s.files[f];
      }
      return;
    }
    case 'mv': {
      if (a.length !== 2) fail('uso: mv <origen> <destino>');
      const [x, y] = a as [string, string];
      if (!(x in s.files)) fail(`mv: no se puede mover '${x}': No existe el archivo`);
      if (!validName(y)) fail('mv: nombre de destino no válido');
      s.files[y] = s.files[x]!;
      delete s.files[x];
      return;
    }
    // 'clear' is listed in SHELL but intentionally has no case here — the
    // oracle's `shell()` switch falls through with no effect; clearing the
    // terminal is handled by the UI layer dispatching a 'cleared' action.
  }
}
