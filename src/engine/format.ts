// Log/status decoration helpers, ported from `design-handoff/git-engine.js`.
import { C, M } from './markup';
import { short, pl } from './util';
import { colorRama } from './state';
import { curName, aheadBehind } from './refs';
import type { Commit, Hash, RepoState } from './types';

export function decor(s: RepoState, h: Hash): string {
  const p: string[] = [];
  const cur = curName(s);
  if (s.head.type === 'detached' && s.head.hash === h) p.push(C('h', 'HEAD'));
  if (cur && s.branches[cur] === h) p.push(C('h', 'HEAD -> ') + C('c:' + colorRama(s, cur), cur));
  for (const b in s.branches) if (b !== cur && s.branches[b] === h) p.push(C('c:' + colorRama(s, b), b));
  for (const b in s.tracking) if (s.tracking[b] === h) p.push(C('r', 'origin/' + b));
  for (const t in s.tags) if (s.tags[t] === h) p.push(C('y', 'tag: ' + t));
  return p.length ? C('y', ' (') + p.join(C('y', ', ')) + C('y', ')') : '';
}

export function fecha(t: number): string {
  const d = new Date(t);
  return d.toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function cabecera(s: RepoState, c: Commit): string[] {
  const L = [C('y', 'commit ' + c.hash) + decor(s, c.hash)];
  if (c.parents.length > 1) L.push('Merge: ' + c.parents.map(short).join(' '));
  L.push('Autor: ' + c.author, 'Fecha: ' + fecha(c.t), '', '    ' + c.msg, '');
  return L;
}

export function trackLine(s: RepoState, b: string): string | null {
  const up = s.upstream[b];
  if (!up || !s.tracking[up] || !s.branches[b]) return null;
  const [a, bh] = aheadBehind(s, s.branches[b]!, s.tracking[up]!);
  const o = `'origin/${up}'`;
  if (!a && !bh) return `Tu rama está actualizada con ${o}.`;
  if (a && !bh) {
    return `Tu rama está adelantada a ${o} por ${pl(a, 'commit', 'commits')}.` + '\n' + M('  (usa "git push" para publicar tus commits locales)');
  }
  if (!a) {
    return (
      `Tu rama está detrás de ${o} por ${pl(bh, 'commit', 'commits')}, y puede avanzar rápido.` +
      '\n' +
      M('  (usa "git pull" para actualizar tu rama local)')
    );
  }
  return `Tu rama y ${o} han divergido: ${a} y ${bh} commits distintos.` + '\n' + M('  (usa "git pull" para unirlas)');
}

export const SUB: Record<'nuevo' | 'modificado' | 'borrado', string> = {
  nuevo: 'nuevo archivo:   ',
  modificado: 'modificados:     ',
  borrado: 'borrados:        ',
};

export const OPNOM: Record<'merge' | 'rebase' | 'cherry-pick' | 'revert', string> = {
  merge: 'MERGING',
  rebase: 'REBASE',
  'cherry-pick': 'CHERRY-PICKING',
  revert: 'REVERTING',
};
