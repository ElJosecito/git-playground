// Pure command-budget classification (level-player spec "Command Budget
// Counter" + its task-3.4 amendment: resolveConflict/editor-save/a failed
// PR action all count). Classification is pure, built only on
// `GitEngine.tokens` (design.md Key Decisions: "Classification is pure:
// isReadOnly/countsToward via GitEngine.tokens.") — never touches a
// `RepoState`.
import { tokens as tokenize } from '../tokens';
import type { HostingAction, LevelDef, PlayerAction, Step } from './types';

const READ_ONLY_GIT_SUBCOMMANDS = new Set(['status', 'log', 'show', 'diff', 'reflog', 'help', 'version']);
const READ_ONLY_SHELL_COMMANDS = new Set(['ls', 'cat', 'pwd', 'clear', 'cls', 'help']);
const BRANCH_LIST_FLAGS = new Set(['-a', '-v', '--list']);

function isReadOnlyGitGroup(tk: readonly string[]): boolean {
  const [cmd, sub, ...rest] = tk;
  if (cmd !== 'git') return false;
  if (sub === '--version' || sub === '-v' || sub === '--help') return true;
  if (sub === undefined) return false;
  if (READ_ONLY_GIT_SUBCOMMANDS.has(sub)) return true;
  if (sub === 'branch') return rest.length === 0 || rest.every((a) => BRANCH_LIST_FLAGS.has(a));
  if (sub === 'remote') return rest.length === 0 || rest.every((a) => a === '-v');
  if (sub === 'stash') return rest[0] === 'list' || rest[0] === 'show';
  if (sub === 'tag') return rest.length === 0 || rest[0] === '-l' || rest[0] === '--list';
  return false;
}

function isReadOnlyShellGroup(tk: readonly string[]): boolean {
  const cmd = tk[0];
  return !!cmd && READ_ONLY_SHELL_COMMANDS.has(cmd);
}

/** Splits `tk` on the same `&&`/`;` chaining `GitEngine.ejecutar` itself
 * splits on (`src/engine/run.ts`'s `unaOrden` groups), so a chained line is
 * classified group by group instead of as one opaque blob. */
function groupsOf(tk: readonly string[]): string[][] {
  const groups: string[][] = [[]];
  for (const t of tk) {
    if (t === '&&' || t === ';') groups.push([]);
    else groups[groups.length - 1]!.push(t);
  }
  return groups.filter((g) => g.length > 0);
}

/** True when `text` (a single submitted command line, possibly
 * `&&`/`;`-chained) consists ENTIRELY of read-only sub-commands from the
 * documented list (level-player spec "Command Budget Counter"). An empty
 * or unparsable (unterminated-quote) line is NOT read-only — callers that
 * need to skip empty input do so themselves before classifying. */
export function isReadOnlyCommand(text: string): boolean {
  const tk = tokenize(text);
  if (!tk || !tk.length) return false;
  const groups = groupsOf(tk);
  if (!groups.length) return false;
  return groups.every((g) => isReadOnlyGitGroup(g) || isReadOnlyShellGroup(g));
}

/** Classifies a single static `Step` (used when summing a level's
 * `solution` script for budgeting — see `computeBudget`). A `HostingAction`
 * always counts; a command string counts unless it is empty or read-only. */
export function countsToward(step: Step): boolean {
  if (typeof step === 'string') {
    const trimmed = step.trim();
    return trimmed.length > 0 && !isReadOnlyCommand(trimmed);
  }
  return true;
}

export function countSteps(steps: readonly Step[]): number {
  return steps.reduce((n, step) => n + (countsToward(step) ? 1 : 0), 0);
}

/** Classifies a LIVE `PlayerAction` fired during an actual session
 * (`useGitPlayground`'s `onAction`). Per design.md + task 3.4's resolution
 * of the design's own open question: every hosting action counts
 * REGARDLESS of `ok` (a failed/rejected PR action still counts), and every
 * `ui` action (`resolveConflict`, editor `saveFile`) counts as 1. Only the
 * `command` kind can be filtered out, via the same read-only rule as
 * `countsToward`. */
export function countsLiveAction(action: PlayerAction): boolean {
  if (action.kind !== 'command') return true;
  const trimmed = action.text.trim();
  return trimmed.length > 0 && !isReadOnlyCommand(trimmed);
}

/** `budget = Σ countsToward(solution) + slack (default 2)` (design.md Key
 * Decisions). There is no stored `budget` field on `LevelDef` — it is
 * always derived from the solution script so it can never drift out of
 * sync with it. */
export function computeBudget(level: Pick<LevelDef, 'solution' | 'slack'>): number {
  return countSteps(level.solution) + (level.slack ?? 2);
}

// Re-exported so curriculum/level-session code can type a bare hosting step
// without reaching into `./types` for just this one case.
export type { HostingAction };
