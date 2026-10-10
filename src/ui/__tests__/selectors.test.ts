import { describe, it, expect } from 'vitest';
import { filesModel, promptSegs, resolverModel, stripSummary } from '../selectors';
import { vacio, nuevoCommit, setHead } from '../../engine/state';
import type { PickOp } from '../../engine/types';

// Ported from the DC template's `promptSegs(repo)` (design-handoff/Git
// Playground.dc.html, lines 473-476).
describe('promptSegs', () => {
  it('returns a plain prompt when there is no repo yet', () => {
    expect(promptSegs(null)).toEqual([{ t: '~/proyecto $ ', c: 'var(--text-secondary)', fw: 400 }]);
  });

  it('returns the bare project prompt when git has not been initialized', () => {
    const repo = vacio();
    repo.inited = false;
    expect(promptSegs(repo)).toEqual([
      { t: '~/proyecto', c: 'var(--t-cyan)', fw: 400 },
      { t: ' $ ', c: 'var(--text-secondary)', fw: 400 },
    ]);
  });

  it('includes the current branch name, colored by colorRama, once inited', () => {
    const repo = vacio();
    repo.inited = true;
    repo.branches.main = 'deadbeef';
    expect(promptSegs(repo)).toEqual([
      { t: '~/proyecto', c: 'var(--t-cyan)', fw: 400 },
      { t: ' (', c: 'var(--text-secondary)', fw: 400 },
      { t: 'main', c: expect.any(String), fw: 400 },
      { t: ')', c: 'var(--text-secondary)', fw: 400 },
      { t: ' $ ', c: 'var(--text-secondary)', fw: 400 },
    ]);
  });

  it('shows "HEAD separado" in warning color for a detached HEAD', () => {
    const repo = vacio();
    repo.inited = true;
    repo.head = { type: 'detached', hash: 'deadbeef' };
    expect(promptSegs(repo)).toEqual([
      { t: '~/proyecto', c: 'var(--t-cyan)', fw: 400 },
      { t: ' (', c: 'var(--text-secondary)', fw: 400 },
      { t: 'HEAD separado', c: 'var(--warning)', fw: 400 },
      { t: ')', c: 'var(--text-secondary)', fw: 400 },
      { t: ' $ ', c: 'var(--text-secondary)', fw: 400 },
    ]);
  });

  it('appends the operation suffix (e.g. MERGING) when an op is in progress', () => {
    const repo = vacio();
    repo.inited = true;
    repo.branches.main = 'deadbeef';
    repo.op = {
      kind: 'merge',
      other: 'cafebabe',
      otherName: 'feature',
      conflicts: [],
      data: {},
      msg: '',
      origW: {},
      origI: {},
    };
    const segs = promptSegs(repo);
    expect(segs[2]).toEqual({ t: 'main|MERGING', c: expect.any(String), fw: 400 });
  });
});

// Ported from the DC template's `renderVals()` files-strip block
// (design-handoff/Git Playground.dc.html, lines 46-79, 503-514).
describe('filesModel', () => {
  it('returns the "not ready" shape when there is no repo yet', () => {
    expect(filesModel(null)).toEqual({
      wd: [],
      wdEmpty: true,
      stg: [],
      stgEmpty: true,
      cm: [],
      cmEmpty: true,
      cmEmptyText: 'sin repositorio',
      headShort: '',
      stripCount: '0',
    });
  });

  it('shows the pre-init placeholder title/color for any file before git init', () => {
    const repo = vacio();
    repo.inited = false;
    repo.files = { 'a.txt': 'hi' };
    const m = filesModel(repo);
    expect(m.wd).toEqual([
      { name: 'a.txt', letter: '', dot: 'var(--text-muted)', color: 'var(--text-primary)', bg: 'transparent', title: 'Archivo (aún no hay repositorio)', deco: 'none' },
    ]);
    expect(m.cmEmptyText).toBe('sin repositorio');
    expect(m.headShort).toBe('');
    expect(m.stripCount).toBe('1');
  });

  it('classifies every working-dir/staging/commit file like the oracle (conflict/deleted/modified/untracked/clean + staged-new)', () => {
    const repo = vacio();
    repo.inited = true;
    const c = nuevoCommit(repo, {
      msg: 'first',
      parents: [],
      tree: { 'README.md': '# Hi', 'gone.txt': 'x', 'mod.txt': 'original' },
      lane: 0,
    });
    setHead(repo, c.hash, 'init');
    repo.index = { 'README.md': '# Hi', 'gone.txt': 'x', 'mod.txt': 'original', 'staged.txt': 'new content' };
    repo.files = {
      'README.md': '# Hi',
      'mod.txt': 'changed',
      'new.txt': 'content',
      'staged.txt': 'new content',
      'conf.txt': '<<<<<<< HEAD\na\n=======\nb\n>>>>>>> feature',
    };
    const op: PickOp = {
      kind: 'merge',
      other: 'deadbeef',
      otherName: 'feature',
      conflicts: ['conf.txt'],
      data: { 'conf.txt': { ours: 'a', theirs: 'b' } },
      msg: 'Merge feature',
      origW: {},
      origI: {},
    };
    repo.op = op;

    const m = filesModel(repo);
    expect(m.wd).toEqual([
      { name: 'README.md', letter: '', dot: 'var(--text-muted)', color: 'var(--text-secondary)', bg: 'transparent', title: 'Sin cambios', deco: 'none' },
      { name: 'conf.txt', letter: '!', dot: 'var(--danger)', color: 'var(--danger)', bg: 'rgba(248,113,113,0.1)', title: 'En conflicto: resuélvelo y usa git add', deco: 'none' },
      { name: 'gone.txt', letter: 'D', dot: 'var(--danger)', color: 'var(--text-muted)', title: 'Borrado, sin preparar', bg: 'transparent', deco: 'line-through' },
      { name: 'mod.txt', letter: 'M', dot: 'var(--warning)', color: 'var(--text-primary)', title: 'Modificado, sin preparar', bg: 'transparent', deco: 'none' },
      { name: 'new.txt', letter: 'U', dot: 'var(--danger)', color: 'var(--text-primary)', title: 'Sin seguimiento: Git aún no lo rastrea', bg: 'transparent', deco: 'none' },
      { name: 'staged.txt', letter: '', dot: 'var(--text-muted)', color: 'var(--text-secondary)', bg: 'transparent', title: 'Sin cambios', deco: 'none' },
    ]);
    expect(m.wdEmpty).toBe(false);
    expect(m.stg).toEqual([{ name: 'staged.txt', letter: 'A', title: 'Archivo nuevo, preparado', deco: 'none' }]);
    expect(m.stgEmpty).toBe(false);
    expect(m.cm).toEqual([{ name: 'README.md' }, { name: 'gone.txt' }, { name: 'mod.txt' }]);
    expect(m.cmEmpty).toBe(false);
    expect(m.cmEmptyText).toBe('sin commits');
    expect(m.headShort).toBe(c.hash.slice(0, 7));
    expect(m.stripCount).toBe('5');
  });
});

describe('stripSummary', () => {
  it('returns an empty string when there is no repo yet', () => {
    expect(stripSummary(null)).toBe('');
  });

  it('returns "sin repositorio" before git init', () => {
    const repo = vacio();
    repo.inited = false;
    expect(stripSummary(repo)).toBe('sin repositorio');
  });

  it('returns "todo guardado" for a clean inited repo', () => {
    const repo = vacio();
    repo.inited = true;
    expect(stripSummary(repo)).toBe('todo guardado');
  });

  it('joins the un-staged/staged/conflict counts with " · ", matching the oracle', () => {
    const repo = vacio();
    repo.inited = true;
    const c = nuevoCommit(repo, { msg: 'first', parents: [], tree: { 'gone.txt': 'x', 'mod.txt': 'original' }, lane: 0 });
    setHead(repo, c.hash, 'init');
    repo.index = { 'gone.txt': 'x', 'mod.txt': 'original', 'staged.txt': 'new content' };
    repo.files = { 'mod.txt': 'changed', 'new.txt': 'content', 'staged.txt': 'new content', 'conf.txt': '<<<<<<<' };
    repo.op = {
      kind: 'merge',
      other: 'deadbeef',
      otherName: 'feature',
      conflicts: ['conf.txt'],
      data: { 'conf.txt': { ours: 'a', theirs: 'b' } },
      msg: 'Merge feature',
      origW: {},
      origI: {},
    };
    // un: gone.txt (borrado), mod.txt (modificado) = 2; ut: new.txt = 1 -> "3 sin preparar"
    // st: staged.txt (nuevo) = 1 -> "1 preparados"; conf: conf.txt = 1 -> "1 en conflicto"
    expect(stripSummary(repo)).toBe('3 sin preparar · 1 preparados · 1 en conflicto');
  });
});

// Ported from the DC template's `renderVals()` resolver block
// (design-handoff/Git Playground.dc.html, lines 538-544).
describe('resolverModel', () => {
  it('returns null when there is no repo yet', () => {
    expect(resolverModel(null)).toBeNull();
  });

  it('is not a conflict when there is no op in progress', () => {
    const repo = vacio();
    repo.inited = true;
    const m = resolverModel(repo);
    expect(m).toEqual({ hasConflict: false, title: '', conflicts: [], hintSegs: [{ t: '', ff: 'inherit', c: 'var(--text-secondary)', fs: 'inherit' }] });
  });

  it('builds the conflict list with per-file state/stateColor and the git-commit continuation hint for a merge', () => {
    const repo = vacio();
    repo.inited = true;
    repo.files = { 'conf.txt': '<<<<<<< HEAD\na\n=======\nb\n>>>>>>> feature' };
    repo.op = {
      kind: 'merge',
      other: 'deadbeef',
      otherName: 'feature',
      conflicts: ['conf.txt'],
      data: { 'conf.txt': { ours: 'a', theirs: 'b' } },
      msg: 'Merge feature',
      origW: {},
      origI: {},
    };
    const m = resolverModel(repo)!;
    expect(m.hasConflict).toBe(true);
    expect(m.title).toBe('Conflicto de merge');
    expect(m.conflicts).toEqual([
      { file: 'conf.txt', ours: 'a', theirs: 'b', theirsName: 'feature', state: 'Pendiente', stateColor: 'var(--danger)' },
    ]);
    // `codeSegs` splits on backticks (they become segment boundaries, not
    // part of any segment's text), same as the oracle's `codeSegs`.
    const hintTextWithoutBackticks =
      'Elige una versión (o edita el archivo), márcalo con git add <archivo> y termina con git commit. Para cancelar: git merge --abort.';
    expect(m.hintSegs.map((s) => s.t).join('')).toBe(hintTextWithoutBackticks);
    expect(m.hintSegs.some((s) => s.t === 'git commit' && s.ff === "'Geist Mono',monospace")).toBe(true);
  });

  it('marks a conflict "Resuelto" once git add has cleared it from op.conflicts', () => {
    const repo = vacio();
    repo.inited = true;
    repo.files = { 'conf.txt': 'resolved content' };
    repo.op = {
      kind: 'merge',
      other: 'deadbeef',
      otherName: 'feature',
      conflicts: [],
      data: { 'conf.txt': { ours: 'a', theirs: 'b' } },
      msg: 'Merge feature',
      origW: {},
      origI: {},
    };
    const m = resolverModel(repo)!;
    expect(m.conflicts[0]!.state).toBe('Resuelto');
    expect(m.conflicts[0]!.stateColor).toBe('var(--success)');
  });

  it('renders "(borrado)" for a conflict side that was deleted (undefined, not empty string)', () => {
    const repo = vacio();
    repo.inited = true;
    repo.files = { 'conf.txt': '<<<<<<<' };
    repo.op = {
      kind: 'merge',
      other: 'deadbeef',
      otherName: 'feature',
      conflicts: ['conf.txt'],
      data: { 'conf.txt': { ours: undefined, theirs: '' } },
      msg: 'Merge feature',
      origW: {},
      origI: {},
    };
    const m = resolverModel(repo)!;
    expect(m.conflicts[0]!.ours).toBe('(borrado)');
    expect(m.conflicts[0]!.theirs).toBe('(vacío)');
  });
});
