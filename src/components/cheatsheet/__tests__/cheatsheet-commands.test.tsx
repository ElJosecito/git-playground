// Lives under components/ because vitest.config only collects tests from
// the listed project folders; it exercises the pure `src/cheatsheet` module.
import { describe, it, expect } from 'vitest';
import { CHEATSHEET } from '../../../cheatsheet/commands';
// Test-time only: the cheatsheet itself never imports the engine at runtime
// (it is a static reference); this guards that `inSimulator` stays honest.
import { GIT } from '../../../engine/commands';

const all = CHEATSHEET.flatMap((c) => c.commands);

describe('CHEATSHEET data', () => {
  it('has several categories, each with at least one command', () => {
    expect(CHEATSHEET.length).toBeGreaterThanOrEqual(6);
    for (const category of CHEATSHEET) {
      expect(category.title.trim()).not.toBe('');
      expect(category.commands.length).toBeGreaterThan(0);
    }
  });

  it('uses unique category and command ids', () => {
    const categoryIds = CHEATSHEET.map((c) => c.id);
    expect(new Set(categoryIds).size).toBe(categoryIds.length);
    const commandIds = all.map((c) => c.id);
    expect(new Set(commandIds).size).toBe(commandIds.length);
  });

  it('fills command, summary and explanation for every entry', () => {
    for (const entry of all) {
      expect(entry.command.startsWith('git ')).toBe(true);
      expect(entry.summary.trim()).not.toBe('');
      expect(entry.explanation.trim()).not.toBe('');
    }
  });

  it('only flags a command as available in the simulator when the engine implements its subcommand', () => {
    for (const entry of all) {
      const sub = entry.command.split(/\s+/)[1];
      if (entry.inSimulator) expect(Object.keys(GIT), entry.id).toContain(sub);
      if (!(sub in GIT)) expect(entry.inSimulator, entry.id).toBe(false);
    }
  });

  it('documents the classic shortcut equivalences', () => {
    const shortcuts = all.flatMap((c) => c.shortcuts);
    expect(shortcuts).toContain('git checkout -b <rama>');
    expect(all.map((c) => c.command)).toEqual(expect.arrayContaining(['git commit -am "<mensaje>"', 'git log --oneline --graph --all']));
    expect(all.map((c) => c.command)).toContain('git config --global alias.st status');
  });
});
