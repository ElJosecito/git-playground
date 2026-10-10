import { describe, it, expect } from 'vitest';
import { playgroundReducer, createInitialPlaygroundState } from '../playgroundReducer';
import { vacio, nuevoCommit, setHead } from '../../engine/state';
import type { CommandResult, RepoState } from '../../engine/types';

function repoWithOneCommit(): RepoState {
  const s = vacio();
  s.inited = true;
  const c = nuevoCommit(s, { msg: 'Primer commit', parents: [], tree: { 'a.txt': 'hola' }, lane: 0 });
  setHead(s, c.hash, 'commit');
  s.files = { 'a.txt': 'hola' };
  return s;
}

function resultFor(next: RepoState, salida: string[] = [], eventos: CommandResult['eventos'] = []): CommandResult {
  return { estado: next, salida, eventos };
}

describe('playgroundReducer', () => {
  it('starts with the documented initial shape', () => {
    const s = createInitialPlaygroundState();
    expect(s).toEqual({
      repo: null,
      lines: [],
      nextLineId: 1,
      input: '',
      editor: null,
      resolverHidden: false,
      resetOpen: false,
      live: '',
      transition: null,
    });
  });

  describe('applied', () => {
    it('appends an echo line (built from the PREVIOUS repo) plus the command output lines', () => {
      const prev = repoWithOneCommit();
      const next = repoWithOneCommit();
      const s0 = { ...createInitialPlaygroundState(), repo: prev };
      const res = resultFor(next, ['\x01g\x02OK\x03']);
      const s1 = playgroundReducer(s0, { type: 'applied', res, prefixLine: { kind: 'echo', text: 'git status' } });

      expect(s1.lines).toHaveLength(2);
      expect(s1.lines[0]!.segs.at(-1)).toEqual({ t: 'git status', c: 'var(--text-primary)', fw: 400 });
      expect(s1.lines[1]!.segs).toEqual([{ t: 'OK', c: 'var(--t-green)', fw: 400 }]);
      expect(s1.repo).toBe(next);
      expect(s1.input).toBe('');
      expect(s1.nextLineId).toBe(3);
    });

    it('does not clear input when there is no prefix line (resolver/companero path)', () => {
      const prev = repoWithOneCommit();
      const s0 = { ...createInitialPlaygroundState(), repo: prev, input: 'still typing' };
      const res = resultFor(repoWithOneCommit(), ['\x01m\x02listo\x03']);
      const s1 = playgroundReducer(s0, { type: 'applied', res, prefixLine: null });
      expect(s1.input).toBe('still typing');
      expect(s1.lines).toHaveLength(1);
    });

    it('sets resolverHidden to false when a merge-conflict event is present', () => {
      const s0 = { ...createInitialPlaygroundState(), repo: repoWithOneCommit(), resolverHidden: true };
      const res = resultFor(repoWithOneCommit(), [], [{ type: 'merge-conflict', files: ['a.txt'], kind: 'merge' }]);
      const s1 = playgroundReducer(s0, { type: 'applied', res, prefixLine: null });
      expect(s1.resolverHidden).toBe(false);
    });

    it('caps lines at 500 entries', () => {
      const manyLines = Array.from({ length: 500 }, (_, i) => ({ id: i + 1, segs: [{ t: String(i), c: 'x', fw: 400 }] }));
      const s0 = { ...createInitialPlaygroundState(), repo: repoWithOneCommit(), lines: manyLines, nextLineId: 501 };
      const res = resultFor(repoWithOneCommit(), ['\x01m\x02nueva\x03']);
      const s1 = playgroundReducer(s0, { type: 'applied', res, prefixLine: null });
      expect(s1.lines).toHaveLength(500);
      expect(s1.lines.at(-1)!.segs).toEqual([{ t: 'nueva', c: 'var(--text-muted)', fw: 400 }]);
    });

    it('assigns a fresh incrementing transition id each time', () => {
      const s0 = { ...createInitialPlaygroundState(), repo: repoWithOneCommit() };
      const res1 = resultFor(repoWithOneCommit());
      const s1 = playgroundReducer(s0, { type: 'applied', res: res1, prefixLine: null });
      expect(s1.transition?.id).toBe(1);
      const res2 = resultFor(repoWithOneCommit());
      const s2 = playgroundReducer(s1, { type: 'applied', res: res2, prefixLine: null });
      expect(s2.transition?.id).toBe(2);
      expect(s2.transition?.prev).toBe(s1.repo);
      expect(s2.transition?.next).toBe(res2.estado);
    });
  });

  it('echoed appends only the echo line and clears input', () => {
    const s0 = { ...createInitialPlaygroundState(), repo: repoWithOneCommit(), input: '' };
    const s1 = playgroundReducer(s0, { type: 'echoed', text: '' });
    expect(s1.lines).toHaveLength(1);
    expect(s1.input).toBe('');
  });

  it('cleared resets both lines and input', () => {
    const s0 = {
      ...createInitialPlaygroundState(),
      lines: [{ id: 1, segs: [{ t: 'x', c: 'y', fw: 400 }] }],
      input: 'git lo',
    };
    const s1 = playgroundReducer(s0, { type: 'cleared' });
    expect(s1.lines).toEqual([]);
    expect(s1.input).toBe('');
  });

  // Oracle parity (design-handoff/Git Playground.dc.html, line 481):
  // `if(e.key==='l'&&e.ctrlKey){this.setState({lines:[]});return;}` — Ctrl+L
  // clears ONLY the output lines, leaving any pending typed input untouched.
  // This is a DIFFERENT action from the `clear`/`cls` typed command (line
  // 290), which clears both.
  it('linesCleared resets only lines, leaving pending input untouched', () => {
    const s0 = {
      ...createInitialPlaygroundState(),
      lines: [{ id: 1, segs: [{ t: 'x', c: 'y', fw: 400 }] }],
      input: 'git lo',
    };
    const s1 = playgroundReducer(s0, { type: 'linesCleared' });
    expect(s1.lines).toEqual([]);
    expect(s1.input).toBe('git lo');
  });

  it('editorOpened reads the file text from the CURRENT repo (not from any pending result)', () => {
    const repo = repoWithOneCommit();
    repo.files['notas.txt'] = 'contenido actual';
    const s0 = { ...createInitialPlaygroundState(), repo, input: 'git edit notas.txt' };
    const s1 = playgroundReducer(s0, { type: 'editorOpened', file: 'notas.txt', echoText: 'git edit notas.txt' });
    expect(s1.editor).toEqual({ file: 'notas.txt', text: 'contenido actual' });
    expect(s1.input).toBe('');
    expect(s1.lines).toHaveLength(1);
  });

  it('editorOpened defaults to empty text for a file that does not exist yet', () => {
    const s0 = { ...createInitialPlaygroundState(), repo: repoWithOneCommit() };
    const s1 = playgroundReducer(s0, { type: 'editorOpened', file: 'nuevo.txt', echoText: 'git edit nuevo.txt' });
    expect(s1.editor).toEqual({ file: 'nuevo.txt', text: '' });
  });

  it('editorOpened with echoText: null opens the editor silently (no terminal line appended) — used by the conflict resolver\'s "Editar…" button (Phase 6)', () => {
    const repo = repoWithOneCommit();
    repo.files['conf.txt'] = 'contenido en conflicto';
    const s0 = { ...createInitialPlaygroundState(), repo, lines: [] };
    const s1 = playgroundReducer(s0, { type: 'editorOpened', file: 'conf.txt', echoText: null });
    expect(s1.editor).toEqual({ file: 'conf.txt', text: 'contenido en conflicto' });
    expect(s1.lines).toEqual([]);
  });

  it('editorChanged updates the editor text in place', () => {
    const s0 = { ...createInitialPlaygroundState(), editor: { file: 'a.txt', text: 'old' } };
    const s1 = playgroundReducer(s0, { type: 'editorChanged', text: 'new' });
    expect(s1.editor).toEqual({ file: 'a.txt', text: 'new' });
  });

  it('editorClosed clears the editor', () => {
    const s0 = { ...createInitialPlaygroundState(), editor: { file: 'a.txt', text: 'old' } };
    const s1 = playgroundReducer(s0, { type: 'editorClosed' });
    expect(s1.editor).toBeNull();
  });

  it('repoLoaded replaces the repo, closes the reset menu, reveals the resolver, and clears the transition', () => {
    const next = repoWithOneCommit();
    const s0 = {
      ...createInitialPlaygroundState(),
      repo: repoWithOneCommit(),
      resetOpen: true,
      resolverHidden: true,
      transition: { id: 1, res: resultFor(repoWithOneCommit()), prev: repoWithOneCommit(), next: repoWithOneCommit() },
    };
    const s1 = playgroundReducer(s0, { type: 'repoLoaded', repo: next });
    expect(s1.repo).toBe(next);
    expect(s1.resetOpen).toBe(false);
    expect(s1.resolverHidden).toBe(false);
    expect(s1.transition).toBeNull();
    expect(s1.lines).toEqual(s0.lines);
  });

  it('repoLoaded appends a notice line when provided', () => {
    const s0 = createInitialPlaygroundState();
    const s1 = playgroundReducer(s0, { type: 'repoLoaded', repo: vacio(), notice: '\x01m\x02Repositorio reiniciado.\x03' });
    expect(s1.lines).toEqual([{ id: 1, segs: [{ t: 'Repositorio reiniciado.', c: 'var(--text-muted)', fw: 400 }] }]);
  });

  it('inputChanged sets the input value', () => {
    const s0 = createInitialPlaygroundState();
    const s1 = playgroundReducer(s0, { type: 'inputChanged', value: 'git status' });
    expect(s1.input).toBe('git status');
  });

  it('linesAppended appends mixed echo/markup/plain entries without touching input', () => {
    const s0 = { ...createInitialPlaygroundState(), input: 'git ch' };
    const s1 = playgroundReducer(s0, {
      type: 'linesAppended',
      entries: [
        { kind: 'echo', text: 'git ch' },
        { kind: 'plain', text: 'checkout   cherry-pick' },
      ],
    });
    expect(s1.input).toBe('git ch');
    expect(s1.lines).toHaveLength(2);
    expect(s1.lines[0]!.segs.at(-1)).toEqual({ t: 'git ch', c: 'var(--text-primary)', fw: 400 });
    expect(s1.lines[1]!.segs).toEqual([{ t: 'checkout   cherry-pick', c: 'var(--text-secondary)', fw: 400 }]);
  });

  it('liveSet updates the live-region announcement text', () => {
    const s0 = createInitialPlaygroundState();
    const s1 = playgroundReducer(s0, { type: 'liveSet', text: 'Error. rama no existe' });
    expect(s1.live).toBe('Error. rama no existe');
  });

  it('resolverToggled sets resolverHidden explicitly', () => {
    const s0 = createInitialPlaygroundState();
    expect(playgroundReducer(s0, { type: 'resolverToggled', hidden: true }).resolverHidden).toBe(true);
    expect(playgroundReducer({ ...s0, resolverHidden: true }, { type: 'resolverToggled', hidden: false }).resolverHidden).toBe(
      false,
    );
  });

  it('resetMenuToggled flips resetOpen', () => {
    const s0 = createInitialPlaygroundState();
    const s1 = playgroundReducer(s0, { type: 'resetMenuToggled' });
    expect(s1.resetOpen).toBe(true);
    const s2 = playgroundReducer(s1, { type: 'resetMenuToggled' });
    expect(s2.resetOpen).toBe(false);
  });
});
