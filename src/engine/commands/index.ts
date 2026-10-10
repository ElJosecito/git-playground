// Aggregates every `git <subcommand>` handler into the single dispatch table
// the oracle calls `GIT`. Built incrementally across Phase 2 — basics/
// history/branches land first (task 2.4), then integrate/undo (2.6) and
// remote/unsupported (2.8) are merged in.
import { basicsCommands } from './basics';
import { historyCommands } from './history';
import { branchesCommands } from './branches';
import { integrateCommands } from './integrate';
import { undoCommands } from './undo';
import { remoteCommands } from './remote';
import { help, version } from './shell';
import type { CommandFn } from '../recorder';

export const GIT: Record<string, CommandFn> = {
  ...basicsCommands,
  ...historyCommands,
  ...branchesCommands,
  ...integrateCommands,
  ...undoCommands,
  ...remoteCommands,
  help,
  version,
};
