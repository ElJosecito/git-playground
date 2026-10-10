// The `GitEngine` facade — same keys as the oracle's `window.GitEngine`
// (design-handoff/git-engine.js), assembled from the ported modules. This
// is the single entry point consumed by the parity harness and, later, by
// the React app's hooks.
import { ejecutar, ejemplo, escribir, resolver, companero } from './run';
import { vacio, colorRama, headHash } from './state';
import { treeOf, curName, resolve } from './refs';
import { cambiosCommit } from './diff';
import { explicar } from './explain';
import { layout } from './layout';
import { estadoArchivos } from './files';
import { infoRama, refsDe } from './info';
import { short } from './util';
import { tokens } from './tokens';
import { completar } from './completion';
import { PALETA, DX, DY } from './constants';
import type {
  CommandResult,
  CompletionResult,
  ExplainResult,
  GitEvent,
  Hash,
  Layout,
  RepoState,
  Tree,
} from './types';
import type { FilesStatus } from './files';
import type { BranchInfo } from './info';

export interface GitEngineApi {
  ejecutar(estado: RepoState, entrada: string): CommandResult;
  ejemplo(): RepoState;
  vacio(): RepoState;
  escribir(estado: RepoState, f: string, txt: string): CommandResult;
  resolver(estado: RepoState, f: string, modo: 'mia' | 'suya' | 'ambas'): CommandResult;
  companero(estado: RepoState): CommandResult;
  explicar(eventos: GitEvent[], estado: RepoState): ExplainResult | null;
  layout(estado: RepoState): Layout;
  estadoArchivos(estado: RepoState): FilesStatus;
  headHash(estado: RepoState): Hash | null;
  treeOf(estado: RepoState, hash: Hash | null): Tree;
  cambiosCommit(estado: RepoState, hash: Hash): { f: string; t: '+' | '−' | '~' }[];
  infoRama(estado: RepoState, nombre: string): BranchInfo;
  refsDe(estado: RepoState, hash: Hash): string[];
  curName(estado: RepoState): string | null;
  colorRama(estado: RepoState, nombre: string): string;
  short(hash: Hash | null | undefined): string;
  resolve(estado: RepoState, ref: string): Hash | null;
  tokens(linea: string): string[] | null;
  completar(estado: RepoState, linea: string): CompletionResult;
  PALETA: string[];
  DX: number;
  DY: number;
}

export const GitEngine: GitEngineApi = {
  ejecutar,
  ejemplo,
  vacio,
  escribir,
  resolver,
  companero,
  explicar,
  layout,
  estadoArchivos,
  headHash,
  treeOf,
  cambiosCommit,
  infoRama,
  refsDe,
  curName,
  colorRama,
  short,
  resolve,
  tokens,
  completar,
  PALETA,
  DX,
  DY,
};
