// The canned, read-only command script the hero demo replays through the
// REAL `GitEngine` (landing-page spec "Engine-Driven Hero Demo"). Pure data
// — no engine import here — so it costs nothing to import from a test file
// and nothing extra in the lazy `HeroDemo` chunk that's the only runtime
// importer.
//
// Hard constraint (batch 5 instructions): the script must only ADD nodes —
// no command here may reposition an existing commit. `init`/`add`/`commit`
// only ever append; `switch -c` creates a branch pointer without moving
// anything; `switch` (no `-c`) just changes HEAD; `merge --no-ff` (fast
// forward IS possible here since `main` never diverged from `feature`, so
// `--no-ff` is required to force a real 2-parent merge commit instead of
// silently fast-forwarding to zero new nodes) appends one new merge commit.
// Nothing here ever calls `rebase`/`reset`/`commit --amend`/`cherry-pick`/
// `revert`, which DO reposition or rewrite existing nodes.
export const HERO_SCRIPT: readonly string[] = [
  'git init',
  'touch README.md',
  'echo "Mi proyecto" > README.md',
  'git add README.md',
  'git commit -m "Primer commit"',
  'git switch -c feature',
  'touch login.js',
  'echo "login()" > login.js',
  'git add login.js',
  'git commit -m "Agrega login"',
  'git switch main',
  'git merge feature --no-ff -m "Une feature"',
];
