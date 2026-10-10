// Phase 1 regression safety net (task 1.7): confirms the hosting feature is
// truly additive — repos with no PR activity never gain a `hosting` key,
// and the hosting selectors tolerate an old pre-hosting `gitpg:v1`-style
// save. Golden parity itself (`parity.test.ts`) is intentionally untouched
// by this change and is re-run as part of the full suite, not duplicated
// here.
import { describe, it, expect } from 'vitest';
import { ejecutar, ejemplo, companero } from '../../run';
import { vacio } from '../../state';
import { hostingOf } from '../state';
import type { RepoState } from '../../types';

describe('hosting additivity regressions', () => {
  it('vacio() has no hosting key (exact-shape parity requirement)', () => {
    expect('hosting' in vacio()).toBe(false);
  });

  it('ejemplo() has no hosting key', () => {
    expect('hosting' in ejemplo()).toBe(false);
  });

  it('companero() never introduces a hosting key on a repo with no PR activity', () => {
    const res = companero(ejemplo());
    expect(res.estado.hosting).toBeUndefined();
  });

  it('a sequence of standard ejecutar() commands never introduces a hosting key', () => {
    let s = ejemplo();
    for (const cmd of ['git switch -c feature', 'touch a.txt', 'git add a.txt', 'git commit -m "x"', 'git push -u origin feature']) {
      const res = ejecutar(s, cmd);
      expect(res.error).toBe(false);
      s = res.estado;
    }
    expect(s.hosting).toBeUndefined();
  });

  it('hostingOf tolerates a round-tripped old gitpg:v1-style save with no hosting key, without mutating it', () => {
    const oldSave: RepoState = JSON.parse(JSON.stringify(ejemplo()));
    expect('hosting' in oldSave).toBe(false);
    expect(hostingOf(oldSave)).toEqual({ prs: [], nextId: 1, clock: 0 });
    expect('hosting' in oldSave).toBe(false);
  });
});
