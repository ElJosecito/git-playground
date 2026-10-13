// App root: a route switch by `window.location.hash` (app-shell spec delta
// "Route Switch Owns the App Root"). Landing is eager; the sandbox, level
// map, a level, and the cheatsheet are React.lazy (app-routing spec "Route-Level Code
// Splitting") so visiting `#/` never pulls them into the initial chunk.
// `ThemeProvider` wraps the whole switch so theme stays app-wide across
// every route (app-shell spec delta "Theme Toggle").
import { Suspense, useLayoutEffect, useRef } from 'react';
import { useHashRoute } from './app/router/useHashRoute';
import { getLastNavKind } from './app/router/hashLocation';
import type { Route } from './app/router/hashLocation';
import { ThemeProvider } from './app/theme/ThemeProvider';
import { RouteFrame } from './app/router/RouteFrame';
import { Redirect } from './app/router/Redirect';
import { LandingRoute } from './routes/LandingRoute';
import { PlaygroundRouteLazy, LevelMapRouteLazy, LevelRouteLazy, CheatsheetRouteLazy } from './app/router/routes';

/** In-memory scroll-position ledger, keyed by route (design.md: "pop
 * navigation: restores scrollY from an in-memory Map"). Module-level since
 * there is exactly one route switch for the lifetime of the page. */
const scrollPositions = new Map<string, number>();

function routeKeyOf(route: Route): string {
  return route.name === 'level' ? `level:${route.id}` : route.name;
}

function titleOf(route: Route): string {
  switch (route.name) {
    case 'landing':
      return 'Git Playground';
    case 'playground':
      return 'Git Playground — Modo libre';
    case 'levelMap':
      return 'Git Playground — Niveles';
    case 'level':
      return `Git Playground — Nivel ${route.id}`;
    case 'cheatsheet':
      return 'Git Playground — Cheatsheet';
    case 'unknown':
      return 'Git Playground';
  }
}

function RouteContent({ route }: { route: Route }) {
  switch (route.name) {
    case 'landing':
      return <LandingRoute />;
    case 'playground':
      return <PlaygroundRouteLazy />;
    case 'levelMap':
      return <LevelMapRouteLazy />;
    case 'level':
      return <LevelRouteLazy id={route.id} />;
    case 'cheatsheet':
      return <CheatsheetRouteLazy />;
    case 'unknown':
      return <Redirect to={{ name: route.fallback }} />;
  }
}

function AppShell() {
  const { route } = useHashRoute();
  const isInitialRef = useRef(true);
  const key = routeKeyOf(route);

  // Captured in the cleanup of the PREVIOUS route's effect — i.e. right as
  // we leave it — so `scrollPositions` holds that route's last scrollY by
  // the time the user comes back to it via a `pop` navigation.
  useLayoutEffect(() => {
    return () => {
      scrollPositions.set(key, window.scrollY);
    };
  }, [key]);

  // Read-only during render — never mutated here. Under <StrictMode>, React
  // double-invokes the render phase; mutating a ref mid-render would let the
  // SECOND throwaway call observe the mutation from the first, so the
  // initial mount's own commit would see `isInitial` already flipped to
  // `false` and RouteFrame would wrongly scroll/steal focus on first paint.
  // The flip happens in a layout effect (below) instead, which only runs
  // once the initial mount has actually committed.
  const isInitial = isInitialRef.current;

  useLayoutEffect(() => {
    isInitialRef.current = false;
  }, []);

  return (
    <RouteFrame title={titleOf(route)} routeKey={key} navKind={getLastNavKind()} isInitial={isInitial} scrollY={scrollPositions.get(key)}>
      <Suspense fallback={<div role="status">Cargando…</div>}>
        <RouteContent route={route} />
      </Suspense>
    </RouteFrame>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

export default App;
