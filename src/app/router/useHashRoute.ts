// Single subscription point for the current hash route (design.md: "Router:
// hand-rolled. ... useSyncExternalStore on hashchange."). `getSnapshot`
// caches the parsed `Route` per raw hash string so repeated calls between
// actual navigations return the SAME object reference — required by
// `useSyncExternalStore` to avoid tearing warnings / redundant re-renders.
import { useCallback } from 'react';
import { useSyncExternalStore } from 'react';
import { parseRoute, getHash, subscribeHash, navigate } from './hashLocation';
import type { Route, NavigateOptions } from './hashLocation';

let cachedHash: string | null = null;
let cachedRoute: Route | null = null;

function getRouteSnapshot(): Route {
  const hash = getHash();
  if (hash !== cachedHash || !cachedRoute) {
    cachedHash = hash;
    cachedRoute = parseRoute(hash);
  }
  return cachedRoute;
}

export interface UseHashRouteResult {
  route: Route;
  navigate(to: Route, options?: NavigateOptions): void;
}

export function useHashRoute(): UseHashRouteResult {
  const route = useSyncExternalStore(subscribeHash, getRouteSnapshot);
  const navigateTo = useCallback((to: Route, options?: NavigateOptions) => navigate(to, options), []);
  return { route, navigate: navigateTo };
}
