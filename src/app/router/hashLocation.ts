// Hand-rolled hash routing (design.md "Router: hand-rolled. Pure parseRoute
// and navigate(to,{replace}). Replace uses history.replaceState plus a
// manual emit, because replaceState fires no hashchange."). No router
// dependency is added (proposal.md "In Scope"). This module only owns
// SYNTACTIC parsing + navigation — semantic checks (unknown catalog id,
// locked-world guard) are handled by the consuming route components, which
// need the level catalog/progress (Phase 4/7) this module must not depend on.
export type Route =
  | { name: 'landing' }
  | { name: 'playground' }
  | { name: 'levelMap' }
  | { name: 'level'; id: string }
  | { name: 'cheatsheet' }
  | { name: 'unknown'; fallback: 'landing' | 'levelMap' };

/** Strips the leading `#` (if any) and a leading `/` (if any), returning the
 * raw path segments, e.g. "#/niveles/x1" -> ["niveles", "x1"]; "" -> []. */
function pathSegments(hash: string): string[] {
  const withoutHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const withoutLeadingSlash = withoutHash.startsWith('/') ? withoutHash.slice(1) : withoutHash;
  return withoutLeadingSlash.length ? withoutLeadingSlash.split('/') : [];
}

export function parseRoute(hash: string): Route {
  const segments = pathSegments(hash);
  if (segments.length === 0) return { name: 'landing' };
  const [first, second, ...rest] = segments;
  if (first === 'playground' && second === undefined) return { name: 'playground' };
  if (first === 'cheatsheet' && second === undefined) return { name: 'cheatsheet' };
  if (first === 'niveles') {
    if (second === undefined) return { name: 'levelMap' };
    if (second === '' || rest.length > 0) return { name: 'unknown', fallback: 'levelMap' };
    return { name: 'level', id: second };
  }
  return { name: 'unknown', fallback: 'landing' };
}

export function buildHash(route: Route): string {
  switch (route.name) {
    case 'landing':
      return '#/';
    case 'playground':
      return '#/playground';
    case 'levelMap':
      return '#/niveles';
    case 'level':
      return `#/niveles/${route.id}`;
    case 'cheatsheet':
      return '#/cheatsheet';
    case 'unknown':
      return route.fallback === 'landing' ? '#/' : '#/niveles';
  }
}

export function getHash(): string {
  return window.location.hash;
}

export interface NavigateOptions {
  replace?: boolean;
}

export type NavKind = 'push' | 'pop' | 'replace';

/** Tracks whether the MOST RECENT route change was a push, a replace, or a
 * browser back/forward (pop) — `RouteFrame` uses this to decide whether to
 * scroll to top (push) or restore a saved scroll position (pop). The
 * browser fires `popstate` before `hashchange` for the same back/forward
 * traversal, so this is already up to date by the time `hashchange`
 * listeners (e.g. `useHashRoute`) run. */
let lastNavKind: NavKind = 'push';

export function getLastNavKind(): NavKind {
  return lastNavKind;
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    lastNavKind = 'pop';
  });
}

/** Pushes (default) or replaces (design D: no extra back-stack entry for
 * fallback redirects) the current hash. `location.hash = ...` already fires
 * a native `hashchange`; `history.replaceState` does not, so the replace
 * path dispatches a synthetic one for `subscribeHash` listeners. */
export function navigate(route: Route, options?: NavigateOptions): void {
  const hash = buildHash(route);
  if (options?.replace) {
    lastNavKind = 'replace';
    history.replaceState(history.state, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    lastNavKind = 'push';
    window.location.hash = hash;
  }
}

export function subscribeHash(listener: () => void): () => void {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}
