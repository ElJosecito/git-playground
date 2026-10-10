// Branch-info and ref-lookup helpers, ported from `design-handoff/git-engine.js`.
import { curName, aheadBehind } from './refs';
import type { Hash, RepoState } from './types';

export interface BranchInfo {
  hash: Hash | null;
  msg: string;
  actual: boolean;
  vsMain?: [number, number];
}

export function infoRama(s: RepoState, b: string): BranchInfo {
  const h = s.branches[b] ?? null;
  const r: BranchInfo = { hash: h, msg: h ? s.commits[h]!.msg : '', actual: curName(s) === b };
  if (b !== 'main' && s.branches.main && h) r.vsMain = aheadBehind(s, h, s.branches.main);
  return r;
}

export function refsDe(s: RepoState, h: Hash): string[] {
  const L: string[] = [];
  for (const b in s.branches) if (s.branches[b] === h) L.push(b);
  for (const b in s.tracking) if (s.tracking[b] === h) L.push('origin/' + b);
  for (const t in s.tags) if (s.tags[t] === h) L.push('tag: ' + t);
  return L;
}
