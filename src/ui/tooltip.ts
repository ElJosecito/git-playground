// Commit/branch/HEAD/track/tag/stash/phantom tooltip content and on-screen
// placement. 1:1 port of the DC template's `tipData(t, repo)` and the
// tooltip-placement math inside `renderVals()` (design-handoff/Git
// Playground.dc.html, lines 416-427, 517-519). Phase 6, tasks.md 6.1/6.2.
import { layoutOf } from './layoutCache';
import { headHash, colorRama } from '../engine/state';
import { refsDe, infoRama } from '../engine/info';
import { cambiosCommit } from '../engine/diff';
import { short } from '../engine/util';
import { clamp } from './geometry';
import type { HoverKind } from '../components/GraphLayer';
import type { RepoState } from '../engine/types';

const MONO = "'Geist Mono',monospace";

/** The target the pointer/keyboard focus is currently hovering, same shape
 * as `GraphHandlers.onHover`'s arguments. */
export interface TipTarget {
  kind: HoverKind;
  id: string;
  X: number;
  Y: number;
  r: number;
  touch?: boolean;
}

export interface TipRow {
  k: string;
  v: string;
  ff: string;
}

export interface TipData {
  title: string;
  titleColor: string;
  hash: string;
  msg: string;
  hasMsg: boolean;
  rows: TipRow[];
  note: string;
  hasNote: boolean;
}

/** Builds the tooltip content for `t`, or `null` when the target no longer
 * exists (e.g. a commit tooltip lingering after its commit was GC'd from
 * view — matches the oracle returning `null` from `tipData`). */
export function tipData(t: TipTarget, repo: RepoState): TipData | null {
  if (t.kind === 'commit' || t.kind === 'rcommit') {
    const c = repo.commits[t.id];
    if (!c) return null;
    const nd = t.kind === 'commit' ? layoutOf(repo).nodes.find((n) => n.h === t.id) : null;
    const refs =
      t.kind === 'commit'
        ? refsDe(repo, t.id)
        : Object.keys(repo.remote.branches)
            .filter((b) => repo.remote.branches[b] === t.id)
            .map((b) => 'origin/' + b);
    if (t.kind === 'commit' && headHash(repo) === t.id) refs.unshift('HEAD');
    const tipo =
      nd && nd.ghost
        ? 'Huérfano (sin rama que lo apunte)'
        : c.parents.length > 1
          ? 'Merge (dos padres)'
          : c.revertOf
            ? 'Revert de ' + short(c.revertOf)
            : c.cherryOf
              ? 'Copia de ' + short(c.cherryOf)
              : c.copyOf
                ? 'Copia (rebase) de ' + short(c.copyOf)
                : 'Normal';
    const ch = cambiosCommit(repo, t.id);
    const rows: TipRow[] = [
      { k: 'Autor', v: c.author.replace(/\s*<.*>/, ''), ff: 'inherit' },
      { k: 'Tipo', v: tipo, ff: 'inherit' },
    ];
    if (refs.length) rows.push({ k: 'Apuntan', v: refs.join(', '), ff: MONO });
    if (ch.length && c.parents.length < 2) rows.push({ k: 'Archivos', v: ch.map((x) => x.t + ' ' + x.f).join('  '), ff: MONO });
    const note =
      nd && nd.ghost
        ? 'Ya no forma parte de ninguna rama. Puedes recuperarlo con git reflog y git switch -c.'
        : nd && nd.dim
          ? 'Solo lo conoce origin/' + (Object.keys(repo.tracking).find((b) => repo.tracking[b] === t.id) || 'main') + '. Únelo con git merge.'
          : '';
    return {
      title: (t.kind === 'rcommit' ? 'origin · ' : '') + 'Commit #' + c.n,
      titleColor: 'var(--text-primary)',
      hash: short(c.hash),
      msg: c.msg,
      hasMsg: true,
      rows,
      note,
      hasNote: !!(nd && (nd.ghost || nd.dim)),
    };
  }

  if (t.kind === 'branch') {
    const i = infoRama(repo, t.id);
    const rows: TipRow[] = [
      { k: 'Apunta a', v: short(i.hash) + ' · ' + i.msg, ff: 'inherit' },
      { k: 'Actual', v: i.actual ? 'Sí, HEAD está aquí' : 'No', ff: 'inherit' },
    ];
    if (i.vsMain) rows.push({ k: 'vs. main', v: `${i.vsMain[0]} por delante · ${i.vsMain[1]} por detrás`, ff: 'inherit' });
    const up = repo.upstream[t.id];
    if (up) rows.push({ k: 'Remoto', v: 'origin/' + up, ff: MONO });
    return {
      title: t.id,
      titleColor: colorRama(repo, t.id),
      hash: '',
      msg: '',
      hasMsg: false,
      rows,
      note: 'Una rama es solo una etiqueta móvil: avanza con cada commit.',
      hasNote: true,
    };
  }

  if (t.kind === 'head') {
    const det = repo.head.type === 'detached';
    const h = headHash(repo);
    const headName = repo.head.type === 'branch' ? repo.head.name : null;
    return {
      title: det ? 'HEAD (separado)' : 'HEAD',
      titleColor: det ? 'var(--warning)' : 'var(--text-primary)',
      hash: '',
      msg: '',
      hasMsg: false,
      rows: [
        { k: 'Apunta a', v: det ? short(h) + ' (commit directo)' : `${headName ?? ''} → ${short(h)}`, ff: MONO },
        { k: 'Separado', v: det ? 'Sí' : 'No', ff: 'inherit' },
      ],
      note: det
        ? 'No estás en ninguna rama. Los commits que hagas aquí no tendrán rama: créala con git switch -c.'
        : 'HEAD indica dónde estás. El próximo commit nacerá aquí y la rama lo seguirá.',
      hasNote: true,
    };
  }

  if (t.kind === 'track' || t.kind === 'rbranch') {
    const h = t.kind === 'track' ? repo.tracking[t.id] : repo.remote.branches[t.id];
    return {
      title: t.kind === 'track' ? 'origin/' + t.id : t.id + ' en origin',
      titleColor: colorRama(repo, t.id),
      hash: h ? short(h) : '',
      msg: h && repo.commits[h] ? repo.commits[h]!.msg : '',
      hasMsg: true,
      rows: [],
      note: t.kind === 'track' ? 'Lo último que sabes de origin. Se actualiza con fetch, pull y push.' : 'La rama tal como está en el servidor.',
      hasNote: true,
    };
  }

  if (t.kind === 'tag') {
    const h = repo.tags[t.id]!;
    return {
      title: 'Tag ' + t.id,
      titleColor: 'var(--text-primary)',
      hash: short(h),
      msg: repo.commits[h]!.msg,
      hasMsg: true,
      rows: [],
      note: 'Un tag marca un commit para siempre (por ejemplo, una versión).',
      hasNote: true,
    };
  }

  if (t.kind === 'stash') {
    return {
      title: 'Stash',
      titleColor: 'var(--text-primary)',
      hash: '',
      msg: '',
      hasMsg: false,
      rows: repo.stash.slice(0, 4).map((e, i) => ({ k: `stash@{${i}}`, v: e.msg, ff: 'inherit' })),
      note: 'Cambios guardados aparte. Recupéralos con git stash pop.',
      hasNote: true,
    };
  }

  if (t.kind === 'phantom') {
    return {
      title: 'Merge pendiente',
      titleColor: 'var(--danger)',
      hash: '',
      msg: '',
      hasMsg: false,
      rows: [],
      note: 'Resuelve los conflictos, márcalos con git add y termina con git commit (o cancela con --abort).',
      hasNote: true,
    };
  }

  return null;
}

export interface TipPlacement {
  x: string;
  y: string;
  transform: string;
  arrowX: string;
  arrowY: string;
  arrowShadow: string;
}

/** Where to draw the tooltip (and its arrow) on screen, given the hovered
 * point already projected to screen space (`w2s`). Flips below the point
 * when too close to the top edge, and clamps horizontally to stay fully
 * inside the viewport, nudging the arrow to compensate. 1:1 port of the
 * `renderVals()` tooltip-placement block (design-handoff/Git
 * Playground.dc.html, lines 517-519). */
export function tipPlacement(screenPos: { x: number; y: number }, r: number, camK: number, viewportWidth: number): TipPlacement {
  const off = (r || 14) * camK + 12;
  const below = screenPos.y < 210;
  const cx = clamp(screenPos.x, 140, viewportWidth - 140);
  return {
    x: `${cx}px`,
    y: `${below ? screenPos.y + off : screenPos.y - off}px`,
    transform: below ? 'translateX(-50%)' : 'translate(-50%,-100%)',
    arrowX: `calc(50% + ${screenPos.x - cx}px)`,
    arrowY: below ? '-5px' : 'calc(100% - 5px)',
    arrowShadow: below ? '-1px -1px 0 0 var(--border)' : '1px 1px 0 0 var(--border)',
  };
}
