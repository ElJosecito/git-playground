// Pure UI selectors derived from the oracle's `RepoState`. 1:1 port of the
// DC template's `renderVals()`-adjacent `promptSegs(repo)` (design-handoff/Git
// Playground.dc.html, lines 473-476), and (Phase 6, tasks.md 6.1/6.2) the
// files-strip and conflict-resolver portions of `renderVals()` itself
// (lines 503-514, 538-544).
import { headHash, colorRama } from '../engine/state';
import { estadoArchivos } from '../engine/files';
import { short } from '../engine/util';
import type { RepoState } from '../engine/types';
import { codeSegs } from './markup';
import type { CodeSeg, Seg } from './markup';

const OP_SUFFIX: Record<'merge' | 'rebase' | 'cherry-pick' | 'revert', string> = {
  merge: 'MERGING',
  rebase: 'REBASE',
  'cherry-pick': 'CHERRY-PICKING',
  revert: 'REVERTING',
};

/** Builds the colored terminal prompt segments for the current repo state. */
export function promptSegs(repo: RepoState | null): Seg[] {
  if (!repo) return [{ t: '~/proyecto $ ', c: 'var(--text-secondary)', fw: 400 }];
  const segs: Seg[] = [{ t: '~/proyecto', c: 'var(--t-cyan)', fw: 400 }];
  if (repo.inited) {
    const op = repo.op ? '|' + OP_SUFFIX[repo.op.kind] : '';
    if (repo.head.type === 'branch') {
      segs.push(
        { t: ' (', c: 'var(--text-secondary)', fw: 400 },
        { t: repo.head.name + op, c: colorRama(repo, repo.head.name), fw: 400 },
        { t: ')', c: 'var(--text-secondary)', fw: 400 },
      );
    } else {
      segs.push(
        { t: ' (', c: 'var(--text-secondary)', fw: 400 },
        { t: 'HEAD separado' + op, c: 'var(--warning)', fw: 400 },
        { t: ')', c: 'var(--text-secondary)', fw: 400 },
      );
    }
  }
  segs.push({ t: ' $ ', c: 'var(--text-secondary)', fw: 400 });
  return segs;
}

export interface FileChip {
  name: string;
  letter: string;
  dot: string;
  color: string;
  bg: string;
  title: string;
  deco: 'none' | 'line-through';
}

export interface StagedChip {
  name: string;
  letter: string;
  title: string;
  deco: 'none' | 'line-through';
}

export interface CommittedChip {
  name: string;
}

export interface FilesModel {
  wd: FileChip[];
  wdEmpty: boolean;
  stg: StagedChip[];
  stgEmpty: boolean;
  cm: CommittedChip[];
  cmEmpty: boolean;
  cmEmptyText: string;
  headShort: string;
  stripCount: string;
}

const STAGED_LETTER: Record<'nuevo' | 'modificado' | 'borrado', string> = { nuevo: 'A', modificado: 'M', borrado: 'D' };
const STAGED_TITLE: Record<'nuevo' | 'modificado' | 'borrado', string> = {
  nuevo: 'Archivo nuevo, preparado',
  modificado: 'Modificación preparada',
  borrado: 'Borrado preparado',
};

/** Builds the three files-strip columns (working directory, staging, last
 * commit) + the mobile button's count. 1:1 port of the DC template's
 * `renderVals()` files-strip block (design-handoff/Git Playground.dc.html,
 * lines 503-514). */
export function filesModel(repo: RepoState | null): FilesModel {
  if (!repo) {
    return { wd: [], wdEmpty: true, stg: [], stgEmpty: true, cm: [], cmEmpty: true, cmEmptyText: 'sin repositorio', headShort: '', stripCount: '0' };
  }
  const ef = estadoArchivos(repo);
  const H = ef.H;

  const names = [...new Set([...Object.keys(repo.files), ...Object.keys(repo.index).filter((f) => !(f in repo.files))])].sort();
  const wd: FileChip[] = names.map((f) => {
    const del = !(f in repo.files);
    const conf = ef.conf.includes(f);
    const ut = !(f in repo.index) && !del;
    const mod = !del && !ut && repo.files[f] !== repo.index[f];
    let letter = '';
    let dot = 'var(--text-muted)';
    let color = 'var(--text-secondary)';
    let bg = 'transparent';
    let title = 'Sin cambios';
    if (!repo.inited) {
      dot = 'var(--text-muted)';
      color = 'var(--text-primary)';
      title = 'Archivo (aún no hay repositorio)';
    } else if (conf) {
      letter = '!';
      dot = 'var(--danger)';
      color = 'var(--danger)';
      bg = 'rgba(248,113,113,0.1)';
      title = 'En conflicto: resuélvelo y usa git add';
    } else if (ut) {
      letter = 'U';
      dot = 'var(--danger)';
      color = 'var(--text-primary)';
      title = 'Sin seguimiento: Git aún no lo rastrea';
    } else if (del) {
      letter = 'D';
      dot = 'var(--danger)';
      color = 'var(--text-muted)';
      title = 'Borrado, sin preparar';
    } else if (mod) {
      letter = 'M';
      dot = 'var(--warning)';
      color = 'var(--text-primary)';
      title = 'Modificado, sin preparar';
    }
    return { name: f, letter, dot, color, bg, title, deco: del ? 'line-through' : 'none' };
  });

  const stg: StagedChip[] = ef.st.map((x) => ({
    name: x.f,
    letter: STAGED_LETTER[x.t],
    title: STAGED_TITLE[x.t],
    deco: x.t === 'borrado' ? 'line-through' : 'none',
  }));

  const cm: CommittedChip[] = Object.keys(H)
    .sort()
    .map((f) => ({ name: f }));

  const hh = headHash(repo);
  return {
    wd,
    wdEmpty: !wd.length,
    stg,
    stgEmpty: !stg.length,
    cm,
    cmEmpty: !cm.length,
    cmEmptyText: repo.inited ? 'sin commits' : 'sin repositorio',
    headShort: hh ? short(hh) : '',
    stripCount: String(Object.keys(repo.files).length),
  };
}

/** The files-strip header summary (e.g. "2 sin preparar · 1 preparados").
 * 1:1 port of the DC template's `stripSummary` formula
 * (design-handoff/Git Playground.dc.html, line 506). */
export function stripSummary(repo: RepoState | null): string {
  if (!repo) return '';
  if (!repo.inited) return 'sin repositorio';
  const ef = estadoArchivos(repo);
  const parts = [
    ef.un.length + ef.ut.length ? `${ef.un.length + ef.ut.length} sin preparar` : '',
    ef.st.length ? `${ef.st.length} preparados` : '',
    ef.conf.length ? `${ef.conf.length} en conflicto` : '',
  ].filter(Boolean);
  return parts.join(' · ') || 'todo guardado';
}

export interface ConflictChip {
  file: string;
  ours: string;
  theirs: string;
  theirsName: string;
  state: string;
  stateColor: string;
}

export interface ResolverModel {
  hasConflict: boolean;
  title: string;
  conflicts: ConflictChip[];
  hintSegs: CodeSeg[];
}

const RESOLVER_TITLE: Record<'merge' | 'rebase' | 'cherry-pick' | 'revert', string> = {
  merge: 'Conflicto de merge',
  rebase: 'Conflicto en el rebase',
  'cherry-pick': 'Conflicto en el cherry-pick',
  revert: 'Conflicto en el revert',
};

/** The conflict-resolver panel's data (title, per-file sides/state, and the
 * continuation-command hint). 1:1 port of the DC template's `renderVals()`
 * resolver block (design-handoff/Git Playground.dc.html, lines 538-544).
 * Side effects (the `resolver(...)`/edit button callbacks) are NOT part of
 * this selector — callers wire those themselves. */
export function resolverModel(repo: RepoState | null): ResolverModel | null {
  if (!repo) return null;
  const op = repo.op;
  const hasConflict = !!(
    op &&
    op.data &&
    Object.keys(op.data).length &&
    (op.conflicts.length || Object.keys(op.data).some((f) => (repo.files[f] || '').includes('<<<<<<<')))
  );
  const conflicts: ConflictChip[] = op
    ? Object.keys(op.data ?? {}).map((f) => {
        const d = op.data![f]!;
        const cur = repo.files[f];
        const pending = op.conflicts.includes(f);
        const marked = (cur || '').includes('<<<<<<<');
        return {
          file: f,
          ours: d.ours == null ? '(borrado)' : d.ours || '(vacío)',
          theirs: d.theirs == null ? '(borrado)' : d.theirs || '(vacío)',
          theirsName: op.otherName ?? '',
          state: !pending ? 'Resuelto' : marked ? 'Pendiente' : 'Falta git add',
          stateColor: !pending ? 'var(--success)' : marked ? 'var(--danger)' : 'var(--warning)',
        };
      })
    : [];
  const fin = op ? (op.kind === 'rebase' ? '`git rebase --continue`' : op.kind === 'merge' ? '`git commit`' : `\`git ${op.kind} --continue\``) : '';
  const hintText = op
    ? `Elige una versión (o edita el archivo), márcalo con \`git add <archivo>\` y termina con ${fin}. Para cancelar: \`git ${op.kind} --abort\`.`
    : '';
  return {
    hasConflict,
    title: op ? RESOLVER_TITLE[op.kind] : '',
    conflicts,
    hintSegs: codeSegs(hintText, 'var(--text-secondary)'),
  };
}
