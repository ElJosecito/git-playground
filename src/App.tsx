// Entry component. The full assembly (terminal, graph, camera,
// choreography, panels, theme/persistence/mobile/a11y) lives in
// `PlaygroundShell` (tasks.md 7.9) — see design.md's component tree:
// `App -> PlaygroundShell(rootRef)`.
import { PlaygroundShell } from './components/PlaygroundShell';

function App() {
  return <PlaygroundShell />;
}

export default App;
