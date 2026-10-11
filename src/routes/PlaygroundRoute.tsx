// Lazy-loaded route entry for `#/playground` (app-routing spec
// "Route-Level Code Splitting"). Default export so `React.lazy(() =>
// import('./PlaygroundRoute'))` in `src/app/router/routes.ts` can load it —
// this is the module boundary that keeps `PlaygroundShell` (and everything
// it pulls in, including the engine) out of the landing chunk.
import { PlaygroundShell } from '../components/PlaygroundShell';

export default function PlaygroundRoute() {
  return <PlaygroundShell />;
}
