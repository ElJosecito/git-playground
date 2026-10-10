import { describe, it, expect } from 'vitest';
import { mkPlan } from '../plan';
import { layout } from '../../engine/layout';
import { GitEngine } from '../../engine';

// Ported 1:1 from the DC template's `mkPlan(evs,prev,next)`
// (design-handoff/Git Playground.dc.html, line 316). Pure: given the two
// layouts either side of a command plus timing context, it decides which
// nodes/labels are "new", how long each entrance should be delayed, and
// whether the camera should pull back for a "wide" shot. `Date.now()` and
// `this.lastManual`/`this.reduced` are injected as explicit `now`/
// `lastManual`/`reduced` params (deviation: the oracle reads them off
// `this` directly) so this module stays a pure function of its inputs.
describe('mkPlan', () => {
  it('delays a newly created commit by base(0)+200, with no "from" (born in place)', () => {
    let s = GitEngine.ejemplo();
    s = GitEngine.ejecutar(s, 'echo hi > a.txt').estado;
    const prev = GitEngine.ejecutar(s, 'git add a.txt').estado;
    const res = GitEngine.ejecutar(prev, 'git commit -m hi');
    const next = res.estado;
    const Lp = layout(prev);
    const Ln = layout(next);
    const plan = mkPlan({ evs: res.eventos, prev, next, Lp, Ln, reduced: false, lastManual: 0, now: 10_000 });

    const newHash = Ln.nodes.map((n) => n.h).find((h) => !Lp.pos[h])!;
    expect(plan.newNodes).toEqual([newHash]);
    expect(plan.isCommit).toBe(true);
    expect(plan.wide).toBe(false);
    // isCommit && staged(1) && !reduced -> base = 0 + 320
    expect(plan.base).toBe(320);
    expect(plan.births[newHash]).toBe(plan.base + 200);
    expect(plan.from[newHash]).toBeUndefined();
    // newNodes.length>0, from empty -> labelDelay = last + 260; end = labelDelay + 520
    const last = plan.births[newHash]!;
    expect(plan.labelDelay).toBe(last + 260);
    expect(plan.end).toBe(plan.labelDelay + 520);
  });

  it('reduced motion zeroes every delay (step=0, base=0, labelDelay=0) but keeps end=labelDelay+520', () => {
    let s = GitEngine.ejemplo();
    s = GitEngine.ejecutar(s, 'echo hi > a.txt').estado;
    const prev = GitEngine.ejecutar(s, 'git add a.txt').estado;
    const res = GitEngine.ejecutar(prev, 'git commit -m hi');
    const next = res.estado;
    const Lp = layout(prev);
    const Ln = layout(next);
    const plan = mkPlan({ evs: res.eventos, prev, next, Lp, Ln, reduced: true, lastManual: 0, now: 10_000 });

    const newHash = plan.newNodes[0]!;
    expect(plan.wide).toBe(false);
    expect(plan.base).toBe(0);
    expect(plan.births[newHash]).toBe(0);
    expect(plan.labelDelay).toBe(0);
    expect(plan.end).toBe(520);
  });

  it('goes "wide" for a WIDE-listed event when the camera has been idle > 4000ms', () => {
    const s = GitEngine.ejemplo();
    const L = layout(s);
    const evs = [{ type: 'push-sent', branch: 'main', hashes: [] }] as Parameters<typeof mkPlan>[0]['evs'];
    const plan = mkPlan({ evs, prev: s, next: s, Lp: L, Ln: L, reduced: false, lastManual: 0, now: 10_000 });
    expect(plan.wide).toBe(true);
    expect(plan.push).toBe(true);
    // not a commit event -> no +320
    expect(plan.base).toBe(650);
  });

  it('does not go "wide" when the camera moved recently (now - lastManual <= 4000)', () => {
    const s = GitEngine.ejemplo();
    const L = layout(s);
    const evs = [{ type: 'push-sent', branch: 'main', hashes: [] }] as Parameters<typeof mkPlan>[0]['evs'];
    const plan = mkPlan({ evs, prev: s, next: s, Lp: L, Ln: L, reduced: false, lastManual: 9000, now: 10_000 });
    expect(plan.wide).toBe(false);
    expect(plan.base).toBe(0);
  });

  it('stages new remote nodes with the push offset (520) instead of the plain offset (200)', () => {
    let s = GitEngine.ejemplo();
    s = GitEngine.ejecutar(s, 'echo hi > a.txt').estado;
    s = GitEngine.ejecutar(s, 'git add a.txt').estado;
    const prev = GitEngine.ejecutar(s, 'git commit -m hi').estado;
    const res = GitEngine.ejecutar(prev, 'git push');
    const next = res.estado;
    const Lp = layout(prev);
    const Ln = layout(next);
    const plan = mkPlan({ evs: res.eventos, prev, next, Lp, Ln, reduced: false, lastManual: 0, now: 10_000 });

    expect(plan.push).toBe(true);
    const newRHash = plan.newR[0]!;
    expect(plan.rbirths[newRHash]).toBe(plan.base + 520);
  });

  it('marks a newly created branch label in newLabels', () => {
    const prev = GitEngine.ejemplo();
    const res = GitEngine.ejecutar(prev, 'git branch demo');
    const next = res.estado;
    const Lp = layout(prev);
    const Ln = layout(next);
    const plan = mkPlan({ evs: res.eventos, prev, next, Lp, Ln, reduced: false, lastManual: 0, now: 10_000 });
    expect(plan.newLabels['b:demo']).toBe(1);
  });

  it('lists a deleted branch\'s old label in "leaving" (excluding HEAD)', () => {
    const afterCreate = GitEngine.ejecutar(GitEngine.ejemplo(), 'git branch demo').estado;
    const res = GitEngine.ejecutar(afterCreate, 'git branch -d demo');
    const next = res.estado;
    const Lp = layout(afterCreate);
    const Ln = layout(next);
    const plan = mkPlan({ evs: res.eventos, prev: afterCreate, next, Lp, Ln, reduced: false, lastManual: 0, now: 10_000 });
    expect(plan.leaving.some((l) => l.key === 'b:demo')).toBe(true);
    expect(plan.leaving.every((l) => l.kind !== 'head')).toBe(true);
  });

  it('sets "from" to the copied-from commit\'s new position for a rebase-copied commit', () => {
    let s = GitEngine.ejemplo();
    s = GitEngine.ejecutar(s, 'git switch -c feature').estado;
    s = GitEngine.ejecutar(s, 'echo feature-file > b.txt').estado;
    s = GitEngine.ejecutar(s, 'git add b.txt').estado;
    s = GitEngine.ejecutar(s, 'git commit -m feature-work').estado;
    const originalFeatHash = s.branches.feature!;
    s = GitEngine.ejecutar(s, 'git switch main').estado;
    s = GitEngine.ejecutar(s, 'echo main-file > c.txt').estado;
    s = GitEngine.ejecutar(s, 'git add c.txt').estado;
    s = GitEngine.ejecutar(s, 'git commit -m main-work').estado;
    const prev = GitEngine.ejecutar(s, 'git switch feature').estado;
    const res = GitEngine.ejecutar(prev, 'git rebase main');
    const next = res.estado;
    const Lp = layout(prev);
    const Ln = layout(next);
    const plan = mkPlan({ evs: res.eventos, prev, next, Lp, Ln, reduced: false, lastManual: 0, now: 10_000 });

    expect(plan.newNodes).toHaveLength(1);
    const copyHash = plan.newNodes[0]!;
    expect(next.commits[copyHash]!.copyOf).toBe(originalFeatHash);
    expect(plan.from[copyHash]).toEqual(Ln.pos[originalFeatHash]);
  });
});
