// Pure choreography planner. 1:1 port of the DC template's `mkPlan(evs,prev,
// next)` (design-handoff/Git Playground.dc.html, line 316): given the two
// layouts either side of a command, decides which commits/remote-commits are
// "new" and how long each entrance should be delayed (staggered by `step`),
// whether new ref labels appeared or old ones are "leaving", and whether the
// camera should pull back for a "wide" shot (a merge/rebase/push/etc. the
// user hasn't been actively steering the camera through).
//
// Deviation from the oracle: `Date.now()` and `this.reduced`/`this.lastManual`
// are explicit `now`/`reduced`/`lastManual` parameters instead of being read
// off `this` — this keeps `mkPlan` a pure function of its inputs (design.md
// explicitly calls it "a pure function in `ui/plan.ts`"), so `useChoreography`
// (the impure hook) is the only place that reads the clock/refs.
//
// Skipped dead code (kept out on purpose, not a missed port): the oracle
// computes `const ffSteps=evs.filter(...).length;` and never reads it again
// anywhere in the file — genuinely unused in the original too.
import { estadoArchivos } from '../engine/files';
import type { GitEvent, Hash, Layout, LLabel, Point, RepoState } from '../engine/types';

const WIDE: ReadonlyArray<GitEvent['type']> = [
  'merge-commit',
  'merge-conflict',
  'rebase-done',
  'cherry-picked',
  'push-sent',
  'fetch-received',
  'pull-done',
  'reverted',
];

const COMMIT_EVENT_TYPES: ReadonlyArray<GitEvent['type']> = ['commit-created', 'commit-amended', 'merge-commit', 'cherry-picked', 'reverted'];

export interface Plan {
  births: Record<Hash, number>;
  from: Record<Hash, Point>;
  rbirths: Record<Hash, number>;
  labelDelay: number;
  newLabels: Record<string, 1>;
  leaving: LLabel[];
  wide: boolean;
  base: number;
  newNodes: Hash[];
  newR: Hash[];
  Lp: Layout;
  Ln: Layout;
  isCommit: boolean;
  end: number;
  evs: GitEvent[];
  push: boolean;
}

export interface MkPlanInput {
  evs: GitEvent[];
  prev: RepoState;
  next: RepoState;
  /** `layoutOf(prev)` (or an equivalent `layout(prev)` call) — the layout
   * from BEFORE this command ran. */
  Lp: Layout;
  /** `layoutOf(next)` — the layout AFTER this command ran. */
  Ln: Layout;
  reduced: boolean;
  /** `camera.lastManualRef.current` — ms timestamp of the last manual pan/zoom. */
  lastManual: number;
  /** `Date.now()`, injected so this function stays pure. */
  now: number;
}

export function mkPlan({ evs, prev, next, Lp, Ln, reduced, lastManual, now }: MkPlanInput): Plan {
  const auto = !reduced && now - lastManual > 4000;
  const newNodes = Ln.nodes.filter((n) => !Lp.pos[n.h]).map((n) => n.h);
  const newR = Ln.rnodes.filter((n) => !Lp.rpos[n.h]).map((n) => n.h);
  const wide = auto && (evs.some((e) => WIDE.includes(e.type)) || evs.some((e) => e.type === 'reset' && e.count > 1) || evs.some((e) => e.type === 'fast-forward'));
  const isCommit = evs.some((e) => COMMIT_EVENT_TYPES.includes(e.type));
  const staged = estadoArchivos(prev).st.length;

  let base = wide ? 650 : 0;
  if (isCommit && staged && !reduced) base += 320;

  const births: Record<Hash, number> = {};
  const from: Record<Hash, Point> = {};
  const rbirths: Record<Hash, number> = {};
  const step = reduced ? 0 : 120;

  newNodes.forEach((h, i) => {
    births[h] = reduced ? 0 : base + 200 + i * step;
    const c = next.commits[h]!;
    const src = c.copyOf || c.cherryOf;
    if (src && Ln.pos[src]) from[h] = Ln.pos[src]!;
    else if (Lp.rpos[h]) from[h] = Lp.rpos[h]!;
  });

  const push = !!evs.find((e) => e.type === 'push-sent');
  newR.forEach((h, i) => {
    rbirths[h] = reduced ? 0 : base + (push ? 520 : 200) + i * step;
  });

  const last = Math.max(0, ...Object.values(births), ...Object.values(rbirths));
  const labelDelay = reduced ? 0 : newNodes.length ? last + (Object.keys(from).length ? 560 : 260) : base;

  const newLabels: Record<string, 1> = {};
  Ln.labels.forEach((l) => {
    if (!Lp.labels.find((q) => q.key === l.key)) newLabels[l.key] = 1;
  });
  const leaving = Lp.labels.filter((l) => l.kind !== 'head' && !Ln.labels.find((q) => q.key === l.key));

  return { births, from, rbirths, labelDelay, newLabels, leaving, wide, base, newNodes, newR, Lp, Ln, isCommit, end: labelDelay + 520, evs, push };
}
