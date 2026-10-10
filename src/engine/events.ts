// Diff-derived event emission, ported from `design-handoff/git-engine.js`.
// Compares a before/after state pair and emits the file/ref/commit events
// that are not already emitted directly by the command that ran.
import { keys } from './util';
import { headHash } from './state';
import { treeOf, anc } from './refs';
import type { Recorder } from './recorder';
import type { Hash, RepoState } from './types';

function reachable(x: RepoState): Record<Hash, 1> {
  return anc(x, headHash(x), ...Object.values(x.branches), ...Object.values(x.tags), ...Object.values(x.tracking));
}

export function diffEventos(p: RepoState, s: RepoState, r: Recorder): void {
  const ph = headHash(p);
  const nh = headHash(s);

  for (const f of keys(p.files, s.files)) {
    const a = p.files[f];
    const b = s.files[f];
    if (a === undefined && b !== undefined) r.ev('file-created', { file: f });
    else if (b === undefined && a !== undefined) r.ev('file-deleted', { file: f });
    else if (a !== b) r.ev('file-modified', { file: f });
  }

  if (ph === nh) {
    const H = treeOf(s, nh);
    for (const f of keys(p.index, s.index)) {
      if (p.index[f] !== s.index[f]) r.ev(s.index[f] === H[f] ? 'file-unstaged' : 'file-staged', { file: f });
    }
  }

  if (ph !== nh || JSON.stringify(p.head) !== JSON.stringify(s.head)) {
    r.ev('head-moved', { from: ph, to: nh });
    if (s.head.type === 'detached' && p.head.type !== 'detached') r.ev('head-detached', { to: nh });
  }

  const refGroups: [keyof RepoState, 'branch' | 'tag' | 'track'][] = [
    ['branches', 'branch'],
    ['tags', 'tag'],
    ['tracking', 'track'],
  ];
  for (const [k, kind] of refGroups) {
    const pk = p[k] as Record<string, Hash>;
    const sk = s[k] as Record<string, Hash>;
    for (const n of keys(pk, sk)) {
      if (pk[n] !== sk[n]) r.ev('ref-moved', { kind, ref: n, from: pk[n] || null, to: sk[n] || null });
    }
  }

  const A = reachable(p);
  const B = reachable(s);
  const orf = Object.keys(A).filter((h) => !B[h]);
  const res = Object.keys(B).filter((h) => !A[h] && p.commits[h] && p.commits[h]!.local);
  if (orf.length) r.ev('commits-orphaned', { hashes: orf });
  if (res.length) r.ev('commits-restored', { hashes: res });
}
