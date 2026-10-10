// Domain reducer for the playground UI (design.md "Reducer" section). This
// is a pure state machine with NO I/O — the engine is always called in
// event handlers (useGitPlayground), per design decision D1, and only the
// *result* of that call (a `CommandResult`) ever reaches this reducer.
//
// `nextLineId` lets the reducer own terminal-line id assignment
// deterministically, so the same action always produces the same ids. Lines
// are capped at 500 entries, matching the oracle's `.slice(-500)`.
import { parseLine } from '../ui/markup';
import { promptSegs } from '../ui/selectors';
import type { Seg } from '../ui/markup';
import type { CommandResult, RepoState } from '../engine/types';

export interface TerminalLine {
  id: number;
  segs: Seg[];
}

/** One line to prepend before a command's output. "echo" renders the prompt
 * (built from the repo BEFORE the command ran) followed by the raw typed
 * text; "markup" decodes oracle wire-format text; "plain" is an unstyled
 * informational line (e.g. the Tab-completion candidate list). */
export type LineInput =
  | { kind: 'echo'; text: string }
  | { kind: 'markup'; text: string }
  | { kind: 'plain'; text: string };

export interface EditorState {
  file: string;
  text: string;
}

export interface Transition {
  id: number;
  res: CommandResult;
  prev: RepoState | null;
  next: RepoState;
}

export interface PlaygroundState {
  repo: RepoState | null;
  lines: TerminalLine[];
  nextLineId: number;
  input: string;
  editor: EditorState | null;
  resolverHidden: boolean;
  resetOpen: boolean;
  live: string;
  transition: Transition | null;
}

export type PlaygroundAction =
  | { type: 'applied'; res: CommandResult; prefixLine: LineInput | null }
  | { type: 'echoed'; text: string }
  | { type: 'cleared' }
  | { type: 'linesCleared' }
  | { type: 'editorOpened'; file: string; echoText: string | null }
  | { type: 'editorChanged'; text: string }
  | { type: 'editorClosed' }
  | { type: 'repoLoaded'; repo: RepoState; notice?: string }
  | { type: 'inputChanged'; value: string }
  | { type: 'linesAppended'; entries: LineInput[] }
  | { type: 'liveSet'; text: string }
  | { type: 'resolverToggled'; hidden: boolean }
  | { type: 'resetMenuToggled' };

const MAX_LINES = 500;

export function createInitialPlaygroundState(): PlaygroundState {
  return {
    repo: null,
    lines: [],
    nextLineId: 1,
    input: '',
    editor: null,
    resolverHidden: false,
    resetOpen: false,
    live: '',
    transition: null,
  };
}

function buildSegs(repo: RepoState | null, input: LineInput): Seg[] {
  switch (input.kind) {
    case 'echo':
      return [...promptSegs(repo), { t: input.text, c: 'var(--text-primary)', fw: 400 }];
    case 'markup':
      return parseLine(input.text);
    case 'plain':
      return [{ t: input.text, c: 'var(--text-secondary)', fw: 400 }];
  }
}

/** Appends lines built from `inputs` (evaluated against `repo`, the state
 * BEFORE this action's own repo update), assigning ids from `nextLineId`. */
function appendLines(
  lines: TerminalLine[],
  nextLineId: number,
  repo: RepoState | null,
  inputs: LineInput[],
): { lines: TerminalLine[]; nextLineId: number } {
  let id = nextLineId;
  const added: TerminalLine[] = inputs.map((input) => ({ id: id++, segs: buildSegs(repo, input) }));
  return { lines: [...lines, ...added].slice(-MAX_LINES), nextLineId: id };
}

export function playgroundReducer(state: PlaygroundState, action: PlaygroundAction): PlaygroundState {
  switch (action.type) {
    case 'applied': {
      const prev = state.repo;
      const next = action.res.estado;
      const inputs: LineInput[] = [
        ...(action.prefixLine ? [action.prefixLine] : []),
        ...action.res.salida.map((text): LineInput => ({ kind: 'markup', text })),
      ];
      const { lines, nextLineId } = appendLines(state.lines, state.nextLineId, prev, inputs);
      const hasMergeConflict = action.res.eventos.some((e) => e.type === 'merge-conflict');
      return {
        ...state,
        repo: next,
        lines,
        nextLineId,
        input: action.prefixLine ? '' : state.input,
        resolverHidden: hasMergeConflict ? false : state.resolverHidden,
        transition: { id: (state.transition?.id ?? 0) + 1, res: action.res, prev, next },
      };
    }
    case 'echoed': {
      const { lines, nextLineId } = appendLines(state.lines, state.nextLineId, state.repo, [
        { kind: 'echo', text: action.text },
      ]);
      return { ...state, lines, nextLineId, input: '' };
    }
    case 'cleared':
      return { ...state, lines: [], input: '' };
    // Ctrl+L (oracle: `this.setState({lines:[]})`, no `input` touched) —
    // distinct from the `clear`/`cls` typed command's `cleared` above.
    case 'linesCleared':
      return { ...state, lines: [] };
    case 'editorOpened': {
      // `echoText: null` opens the editor silently (no terminal line) — used
      // by the conflict resolver's "Editar…" button (Phase 6), which does not
      // go through `run()`/the terminal at all.
      if (action.echoText == null) {
        return { ...state, editor: { file: action.file, text: state.repo?.files[action.file] ?? '' } };
      }
      const { lines, nextLineId } = appendLines(state.lines, state.nextLineId, state.repo, [
        { kind: 'echo', text: action.echoText },
      ]);
      return {
        ...state,
        lines,
        nextLineId,
        input: '',
        editor: { file: action.file, text: state.repo?.files[action.file] ?? '' },
      };
    }
    case 'editorChanged':
      return state.editor ? { ...state, editor: { ...state.editor, text: action.text } } : state;
    case 'editorClosed':
      return { ...state, editor: null };
    case 'repoLoaded': {
      const base = { ...state, repo: action.repo, resetOpen: false, resolverHidden: false, transition: null };
      if (action.notice == null) return base;
      const { lines, nextLineId } = appendLines(base.lines, base.nextLineId, base.repo, [
        { kind: 'markup', text: action.notice },
      ]);
      return { ...base, lines, nextLineId };
    }
    case 'inputChanged':
      return { ...state, input: action.value };
    case 'linesAppended': {
      const { lines, nextLineId } = appendLines(state.lines, state.nextLineId, state.repo, action.entries);
      return { ...state, lines, nextLineId };
    }
    case 'liveSet':
      return { ...state, live: action.text };
    case 'resolverToggled':
      return { ...state, resolverHidden: action.hidden };
    case 'resetMenuToggled':
      return { ...state, resetOpen: !state.resetOpen };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
