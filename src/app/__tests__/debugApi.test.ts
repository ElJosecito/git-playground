import { describe, it, expect, vi } from 'vitest';
import { createDebugApi, installDebugApi } from '../debugApi';
import type { DebugApiTarget } from '../debugApi';
import { GitEngine } from '../../engine';
import { vacio } from '../../engine/state';
import type { RepoState } from '../../engine/types';

// Ported from `window.GitPlayground={estado:()=>this.state.repo,
// ejecutar:c=>this.run(c), motor:()=>this.GE, cargar:(estado)=>this.loadRepo(estado)}`
// (design-handoff/Git Playground.dc.html, componentDidMount). Target is
// injected (not read from the real `window`) so this stays DOM-free in the
// `node` test project — `installDebugApi` is what wires it to the real
// `window` from `useGitPlayground`.
describe('createDebugApi', () => {
  it('estado() delegates to the injected repo getter', () => {
    const repo = vacio();
    const api = createDebugApi({ getRepo: () => repo, run: vi.fn(), loadRepo: vi.fn() });
    expect(api.estado()).toBe(repo);
  });

  it('ejecutar(cmd) delegates to the injected run function', () => {
    const run = vi.fn();
    const api = createDebugApi({ getRepo: () => null, run, loadRepo: vi.fn() });
    api.ejecutar('git status');
    expect(run).toHaveBeenCalledWith('git status');
  });

  it('motor() returns the real GitEngine facade', () => {
    const api = createDebugApi({ getRepo: () => null, run: vi.fn(), loadRepo: vi.fn() });
    expect(api.motor()).toBe(GitEngine);
  });

  it('cargar(estado) delegates to the injected loadRepo function', () => {
    const loadRepo = vi.fn();
    const api = createDebugApi({ getRepo: () => null, run: vi.fn(), loadRepo });
    const repo: RepoState = vacio();
    api.cargar(repo);
    expect(loadRepo).toHaveBeenCalledWith(repo);
  });
});

describe('installDebugApi', () => {
  it('attaches GitPlayground to the given target and returns an uninstaller', () => {
    const target: DebugApiTarget = {};
    const uninstall = installDebugApi(target, { getRepo: () => null, run: vi.fn(), loadRepo: vi.fn() });
    expect(target.GitPlayground).toBeDefined();
    uninstall();
    expect(target.GitPlayground).toBeUndefined();
  });
});
