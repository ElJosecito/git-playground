// `window.GitPlayground` debug API, kept exactly shaped like the oracle's
// `{estado, ejecutar, motor, cargar}` (design-handoff/Git Playground.dc.html,
// componentDidMount; see design.md app-shell domain, "window.GitPlayground
// Debug API"). `createDebugApi` is pure/DI-based so it is testable without a
// real DOM; `installDebugApi` is the thin adapter that attaches it to an
// actual global object (normally `window`) from `useGitPlayground`.
import { GitEngine, type GitEngineApi } from '../engine';
import type { RepoState } from '../engine/types';

export interface DebugApi {
  estado(): RepoState | null;
  ejecutar(comando: string): void;
  motor(): GitEngineApi;
  cargar(estado: RepoState): void;
}

export interface DebugApiDeps {
  getRepo(): RepoState | null;
  run(comando: string): void;
  loadRepo(estado: RepoState): void;
}

export function createDebugApi(deps: DebugApiDeps): DebugApi {
  return {
    estado: () => deps.getRepo(),
    ejecutar: (comando) => deps.run(comando),
    motor: () => GitEngine,
    cargar: (estado) => deps.loadRepo(estado),
  };
}

export interface DebugApiTarget {
  GitPlayground?: DebugApi;
}

/** Attaches the debug API to `target` (normally `window`) and returns a
 * function that removes it again — used to clean up on unmount in tests.
 *
 * Guarded cleanup (app-shell spec delta "Debug API rebinds on navigation";
 * design.md: "The cleanup deletes only if target.GitPlayground === api."):
 * the active ROUTE owns `window.GitPlayground`. If a newer instance (e.g.
 * the level route, mounting as the sandbox route unmounts) has already
 * replaced it by the time this one's cleanup runs, deleting unconditionally
 * would wipe out that newer, still-live binding — so the uninstaller only
 * deletes when it's still ITS OWN api installed. */
export function installDebugApi(target: DebugApiTarget, deps: DebugApiDeps): () => void {
  const api = createDebugApi(deps);
  target.GitPlayground = api;
  return () => {
    if (target.GitPlayground === api) {
      delete target.GitPlayground;
    }
  };
}
