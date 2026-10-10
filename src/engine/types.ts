// Type definitions for the ported engine. Mirrors the shape of
// `design-handoff/git-engine.js` (the oracle) exactly — see design.md
// "Interfaces / Contracts" for the source of truth. These types intentionally
// keep the oracle's Spanish field names where the oracle itself used them,
// so the port can be diffed against the original line by line (design D3).

export type Hash = string;
export type Tree = Record<string, string>;
export type OpKind = 'merge' | 'rebase' | 'cherry-pick' | 'revert';

export interface Commit {
  hash: Hash;
  n: number;
  msg: string;
  parents: Hash[];
  tree: Tree;
  author: string;
  t: number;
  lane: number;
  x: number;
  local: boolean;
  dy?: number;
  copyOf?: Hash;
  cherryOf?: Hash;
  revertOf?: Hash;
}

export type Head = { type: 'branch'; name: string } | { type: 'detached'; hash: Hash };

export interface ConflictSides {
  ours?: string;
  theirs?: string;
}

export interface PickOp {
  kind: 'merge' | 'cherry-pick' | 'revert';
  other: Hash;
  otherName: string;
  conflicts: string[];
  data: Record<string, ConflictSides>;
  msg: string;
  origW: Tree;
  origI: Tree;
}

export interface RebaseOp {
  kind: 'rebase';
  onto: Hash;
  ontoName: string;
  todo: Hash[];
  pairs: [Hash, Hash][];
  branch: string | null;
  orig: Hash;
  ut: Tree;
  lane: number;
  conflicts: string[];
  current?: Hash;
  other?: Hash;
  otherName?: string;
  data?: Record<string, ConflictSides>;
}

export type OpState = PickOp | RebaseOp;

export interface Lane {
  name: string;
  color: string;
}

export interface StashEntry {
  msg: string;
  base: Hash;
  w: Record<string, string | null>;
  i: Record<string, string | null>;
}

export interface ReflogEntry {
  h: Hash | null;
  msg: string;
}

export interface RepoState {
  v: 1;
  inited: boolean;
  files: Tree;
  index: Tree;
  commits: Record<Hash, Commit>;
  order: Hash[];
  branches: Record<string, Hash>;
  colorOf: Record<string, number>;
  nColors: number;
  laneOf: Record<string, number>;
  lanes: Lane[];
  detLane: number | null;
  tags: Record<string, Hash>;
  head: Head;
  prev: string | null;
  stash: StashEntry[];
  reflog: ReflogEntry[];
  remote: { branches: Record<string, Hash>; known: Record<Hash, 1> };
  tracking: Record<string, Hash>;
  upstream: Record<string, string>;
  op: OpState | null;
  seq: number;
  tm: number;
}

/** One variant per event type emitted by `ejecutar`/diffEventos; payloads match the oracle exactly. */
export type GitEvent =
  | { type: 'repo-init' }
  | { type: 'branch-created'; name: string; hash?: Hash }
  | { type: 'branch-deleted'; name: string }
  | { type: 'branch-renamed'; from: string; to: string }
  | { type: 'switched'; name: string; created?: boolean }
  | { type: 'detached'; hash: Hash }
  | { type: 'tag-created'; name: string; hash: Hash }
  | { type: 'tag-deleted'; name: string }
  | { type: 'commit-created'; hash: Hash; files: string[]; branch: string | null; root: boolean }
  | { type: 'commit-amended'; hash: Hash; old: Hash }
  | { type: 'merge-commit'; hash: Hash; theirs: string; into: string }
  | { type: 'cherry-picked'; hash: Hash; of: Hash }
  | { type: 'reverted'; hash: Hash; of: Hash }
  | { type: 'fast-forward'; ref: string; theirs: string; from: Hash; to: Hash }
  | { type: 'up-to-date' }
  | { type: 'merge-conflict'; files: string[]; kind: OpKind; theirs?: string }
  | { type: 'rebase-done'; count: number; branch: string | null; onto: string }
  | { type: 'commits-copied'; pairs: [Hash, Hash][] }
  | { type: 'op-aborted'; kind: OpKind }
  | { type: 'reset'; mode: 'soft' | 'mixed' | 'hard'; from: Hash | null; to: Hash; count: number; ref: string; aborted: OpKind | null }
  | { type: 'stash-pushed'; files: string[] }
  | { type: 'stash-popped'; files: string[]; drop: boolean }
  | { type: 'stash-dropped' }
  | { type: 'push-sent'; branch: string; hashes: Hash[] }
  | { type: 'fetch-received'; hashes: Hash[]; count: number }
  | { type: 'pull-done'; branch: string }
  | { type: 'remote-commit'; hash: Hash; branch: string }
  | { type: 'file-restored'; files: string[] }
  | { type: 'conflict-resolved'; file: string }
  | { type: 'error' }
  | { type: 'file-created'; file: string }
  | { type: 'file-deleted'; file: string }
  | { type: 'file-modified'; file: string }
  | { type: 'file-staged'; file: string }
  | { type: 'file-unstaged'; file: string }
  | { type: 'head-moved'; from: Hash | null; to: Hash | null }
  | { type: 'head-detached'; to: Hash | null }
  | { type: 'ref-moved'; kind: 'branch' | 'tag' | 'track'; ref: string; from: Hash | null; to: Hash | null }
  | { type: 'commits-orphaned'; hashes: Hash[] }
  | { type: 'commits-restored'; hashes: Hash[] };

export interface CommandResult {
  estado: RepoState;
  salida: string[];
  eventos: GitEvent[];
  accion?: { tipo: 'editar'; archivo: string } | null;
  error?: boolean;
}

export interface Point {
  X: number;
  Y: number;
}

export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface LNode {
  h: Hash;
  X: number;
  Y: number;
  color: string;
  merge: boolean;
  ghost: boolean;
  dim: boolean;
  n: number;
  msg: string;
}

export interface LEdge {
  id: string;
  child: Hash;
  d: string;
  color: string;
  ghost: boolean;
}

export interface LLink {
  id: string;
  child: Hash;
  d: string;
  kind: 'revert' | 'cherry';
}

export interface LLabel {
  key: string;
  kind: 'track' | 'tag' | 'branch' | 'head' | 'rbranch';
  text: string;
  color?: string;
  ref?: string;
  current?: boolean;
  detached?: boolean;
  X: number;
  Y: number;
  w: number;
  h: Hash;
}

export interface RNode {
  h: Hash;
  X: number;
  Y: number;
  color: string;
  merge: boolean;
  n: number;
  msg: string;
}

export interface REdge {
  id: string;
  child: Hash;
  d: string;
  color: string;
}

export interface RLabel {
  key: string;
  kind: 'rbranch';
  text: string;
  color: string;
  X: number;
  Y: number;
  w: number;
  h: Hash;
  ref: string;
}

export interface Layout {
  pos: Record<Hash, Point>;
  nodes: LNode[];
  edges: LEdge[];
  links: LLink[];
  labels: LLabel[];
  phantom: { P: Point; edges: { id: string; d: string }[] } | null;
  rpos: Record<Hash, Point>;
  rnodes: RNode[];
  redges: REdge[];
  rlabels: RLabel[];
  rbox: Box | null;
  stash: (Point & { n: number }) | null;
  bbox: Box | null;
}

export interface ExplainResult {
  icon: string;
  tone: 'danger' | 'info' | 'success' | 'warning';
  text: string;
}

export interface CompletionResult {
  last: string;
  pool: string[];
}
