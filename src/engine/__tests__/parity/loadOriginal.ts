// Loads the untouched oracle (`design-handoff/git-engine.js`) in the SAME
// realm as the test runner (design D4: `new Function('window', src)(shim)`,
// not a `vm` context or an edited copy). The oracle references a free
// `window` identifier only once, for its final `window.GitEngine = {...}`
// assignment — passing a plain shim object as the `window` parameter lets us
// capture that assignment without touching the file on disk.
import oracleSource from '../../../../design-handoff/git-engine.js?raw';
import type {
  CommandResult,
  CompletionResult,
  ExplainResult,
  Hash,
  Layout,
  RepoState,
  Tree,
} from '../../types';

export interface OracleFilesState {
  H: Tree;
  st: { f: string; t: 'nuevo' | 'borrado' | 'modificado' }[];
  un: { f: string; t: 'borrado' | 'modificado' }[];
  ut: { f: string }[];
  conf: string[];
}

export interface OracleGitEngine {
  ejecutar(estado: RepoState, entrada: string): CommandResult;
  ejemplo(): RepoState;
  vacio(): RepoState;
  escribir(estado: RepoState, archivo: string, texto: string): CommandResult;
  resolver(estado: RepoState, archivo: string, modo: 'mia' | 'suya' | 'ambas'): CommandResult;
  companero(estado: RepoState): CommandResult;
  explicar(eventos: CommandResult['eventos'], estado: RepoState): ExplainResult | null;
  layout(estado: RepoState): Layout;
  estadoArchivos(estado: RepoState): OracleFilesState;
  headHash(estado: RepoState): Hash | null;
  treeOf(estado: RepoState, hash: Hash | null): Tree;
  cambiosCommit(estado: RepoState, hash: Hash): { f: string; t: '+' | '−' | '~' }[];
  infoRama(estado: RepoState, nombre: string): { hash: Hash | null; msg: string; actual: boolean; vsMain?: [number, number] };
  refsDe(estado: RepoState, hash: Hash): string[];
  curName(estado: RepoState): string | null;
  colorRama(estado: RepoState, nombre: string): string;
  short(hash: Hash): string;
  resolve(estado: RepoState, ref: string): Hash | null;
  tokens(linea: string): string[] | null;
  completar(estado: RepoState, linea: string): CompletionResult;
  PALETA: string[];
  DX: number;
  DY: number;
}

/**
 * Executes the oracle IIFE in-realm and returns the `window.GitEngine`
 * object it assigns. Never mutate `oracleSource` — `design-handoff/**` is
 * the frozen correctness bar.
 */
export function loadOriginal(): OracleGitEngine {
  const shim: { GitEngine?: OracleGitEngine } = {};
  const runOracle = new Function('window', oracleSource);
  runOracle(shim);
  if (!shim.GitEngine) {
    throw new Error('Oracle did not assign window.GitEngine — loadOriginal() shim is stale.');
  }
  return shim.GitEngine;
}
