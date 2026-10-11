import { describe, it, expect } from 'vitest';
import { isReadOnlyCommand, countsToward, countSteps, countsLiveAction, computeBudget } from '../counting';
import type { PlayerAction, Step, LevelDef } from '../types';

describe('isReadOnlyCommand (git/shell read-only classification)', () => {
  it('classifies the documented read-only git subcommands', () => {
    for (const cmd of ['git status', 'git log', 'git log --oneline', 'git show', 'git show HEAD', 'git diff', 'git diff --staged', 'git reflog', 'git help', 'git version', 'git --version']) {
      expect(isReadOnlyCommand(cmd)).toBe(true);
    }
  });

  it('classifies git branch as read-only only with no args or list flags', () => {
    expect(isReadOnlyCommand('git branch')).toBe(true);
    expect(isReadOnlyCommand('git branch -a')).toBe(true);
    expect(isReadOnlyCommand('git branch -v')).toBe(true);
    expect(isReadOnlyCommand('git branch feature')).toBe(false);
    expect(isReadOnlyCommand('git branch -d feature')).toBe(false);
  });

  it('classifies git remote as read-only (with or without -v)', () => {
    expect(isReadOnlyCommand('git remote')).toBe(true);
    expect(isReadOnlyCommand('git remote -v')).toBe(true);
  });

  it('classifies git stash list/show as read-only but not push/pop/apply/drop', () => {
    expect(isReadOnlyCommand('git stash list')).toBe(true);
    expect(isReadOnlyCommand('git stash show')).toBe(true);
    expect(isReadOnlyCommand('git stash')).toBe(false);
    expect(isReadOnlyCommand('git stash pop')).toBe(false);
    expect(isReadOnlyCommand('git stash drop')).toBe(false);
  });

  it('classifies git tag as read-only only with no args or -l/--list', () => {
    expect(isReadOnlyCommand('git tag')).toBe(true);
    expect(isReadOnlyCommand('git tag -l')).toBe(true);
    expect(isReadOnlyCommand('git tag v1.0')).toBe(false);
  });

  it('classifies the documented read-only shell commands', () => {
    for (const cmd of ['ls', 'cat a.txt', 'pwd', 'clear', 'cls', 'help']) {
      expect(isReadOnlyCommand(cmd)).toBe(true);
    }
  });

  it('classifies mutating commands as NOT read-only', () => {
    for (const cmd of ['git init', 'git add a.txt', 'git commit -m x', 'git merge feature', 'git push -u origin main', 'touch a.txt', 'echo hola > a.txt', 'rm a.txt']) {
      expect(isReadOnlyCommand(cmd)).toBe(false);
    }
  });

  it('treats an empty/whitespace-only line as not read-only (callers filter it out separately)', () => {
    expect(isReadOnlyCommand('')).toBe(false);
    expect(isReadOnlyCommand('   ')).toBe(false);
  });
});

describe('countsToward (static Step classification, for curriculum budgeting)', () => {
  it('counts a mutating command string', () => {
    expect(countsToward('git commit -m x')).toBe(true);
  });

  it('does not count a read-only command string', () => {
    expect(countsToward('git status')).toBe(false);
  });

  it('does not count an empty command string', () => {
    expect(countsToward('')).toBe(false);
  });

  it('always counts a HostingAction step', () => {
    const step: Step = { pr: 'merge', id: 1, strategy: 'squash', deleteBranch: true };
    expect(countsToward(step)).toBe(true);
  });
});

describe('countSteps (sums countsToward over a script)', () => {
  it('sums only the counted steps', () => {
    const steps: Step[] = ['git init', 'git status', 'touch a.txt', 'git add a.txt', 'git commit -m c1'];
    // init, add, commit count; status does not; touch counts (shell mutation, not in the read-only list).
    expect(countSteps(steps)).toBe(4);
  });

  it('counts every HostingAction step', () => {
    const steps: Step[] = [{ pr: 'create', input: { source: 'a', target: 'b', title: 't', body: '' } }, { pr: 'merge', id: 1, strategy: 'merge', deleteBranch: false }];
    expect(countSteps(steps)).toBe(2);
  });
});

describe('countsLiveAction (live session classification, task 3.4: resolve/save/failed-PR all count)', () => {
  it('counts a non-empty, non-read-only command', () => {
    const action: PlayerAction = { kind: 'command', text: 'git commit -m x' };
    expect(countsLiveAction(action)).toBe(true);
  });

  it('does not count a read-only command', () => {
    const action: PlayerAction = { kind: 'command', text: 'git status' };
    expect(countsLiveAction(action)).toBe(false);
  });

  it('counts a successful hosting action', () => {
    const action: PlayerAction = { kind: 'hosting', op: 'merge', ok: true };
    expect(countsLiveAction(action)).toBe(true);
  });

  it('counts a FAILED hosting action too (task 3.4 resolution)', () => {
    const action: PlayerAction = { kind: 'hosting', op: 'merge', ok: false };
    expect(countsLiveAction(action)).toBe(true);
  });

  it('counts a conflict-resolve UI action (task 3.4 resolution)', () => {
    const action: PlayerAction = { kind: 'ui', action: 'resolve' };
    expect(countsLiveAction(action)).toBe(true);
  });

  it('counts an editor-save UI action (task 3.4 resolution)', () => {
    const action: PlayerAction = { kind: 'ui', action: 'save' };
    expect(countsLiveAction(action)).toBe(true);
  });
});

describe('computeBudget (design.md: "budget = Σ countsToward(solution) + slack (default 2)")', () => {
  const base: Pick<LevelDef, 'solution' | 'slack'> = {
    solution: ['git init', 'touch a.txt', 'git add a.txt', 'git commit -m c1'],
  };

  it('defaults slack to 2 when omitted', () => {
    expect(computeBudget(base)).toBe(4 + 2);
  });

  it('uses an explicit slack value', () => {
    expect(computeBudget({ ...base, slack: 0 })).toBe(4);
  });
});
