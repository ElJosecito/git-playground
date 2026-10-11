// Pure, additive lesson-definition data model (level-engine spec "LevelDef
// Data Model" / design.md "Contracts": `LevelDef = {id, world, order,
// version, title, objective, theory[], setup, solution, goals, hints,
// slack?, hosting?}`). No React import anywhere in `src/engine/lessons/*`
// (hard constraint: "lessons engine pure, node-testable, no React") and the
// simulator engine itself (`src/engine/commands/*`,
// `design-handoff/git-engine.js`) is never modified — this module only
// layers lesson metadata ON TOP of the existing `RepoState`/`GitEngine`.
import type { RepoState } from '../types';
import type { CreatePullRequestInput } from '../hosting/create';
import type { MergeStrategy } from '../hosting/types';

/** One simulated-hosting action a level's `setup`/`solution` script can
 * take, mirroring the exact `HostingHandlers` shape `useGitPlayground`
 * exposes (design.md Contracts: "HostingAction = {pr:'create', input} |
 * {pr:'comment', id, body} | {pr:'close'|'reopen', id} | {pr:'merge', id,
 * strategy, deleteBranch}"). */
export type HostingAction =
  | { pr: 'create'; input: CreatePullRequestInput }
  | { pr: 'comment'; id: number; body: string }
  | { pr: 'close'; id: number }
  | { pr: 'reopen'; id: number }
  | { pr: 'merge'; id: number; strategy: MergeStrategy; deleteBranch: boolean };

/** A single entry in a level's `setup`/`solution` script: either a raw
 * command line (replayed through `GitEngine.ejecutar`) or a hosting action
 * (dispatched through the matching `GitEngine.*PullRequest` call). */
export type Step = string | HostingAction;

/** A single checklist item. `check` MUST be pure (design.md level-engine
 * "Pure Checklist Predicates": "no engine mutation") — it only reads `s`. */
export interface Goal {
  id: string;
  label: string;
  check(s: RepoState): boolean;
}

/** The data shape for one level (level-engine spec "LevelDef Data Model").
 * Spanish display content lives in `title`/`objective`/`theory`/`hints`
 * (the field NAMES are English per design.md's literal Contracts section,
 * which wins over the spec's shorthand Spanish field names
 * `titulo`/`objetivo`/`teoria` — the VALUES assigned to these fields are
 * Spanish text, matching the spec's intent).
 *
 * There is no stored `budget` field: design.md's Key Decisions state
 * "budget = Σ countsToward(solution) + slack (default 2)" — i.e. the
 * budget is DERIVED from `solution` and `slack` via `counting.ts`'s
 * `computeBudget`, not authored as a separate number that could drift out
 * of sync with the solution script. */
export interface LevelDef {
  id: string;
  world: number;
  order: number;
  version: number;
  title: string;
  objective: string;
  theory: string[];
  setup: Step[];
  solution: Step[];
  goals: Goal[];
  hints: string[];
  /** Extra allowance added on top of the solution's counted length when
   * deriving the budget. Defaults to 2 (design.md: "slack (default 2)"). */
  slack?: number;
  /** Whether this level exposes the hosting (PR) web-view entry point at
   * all (level-engine spec "Level without the hosting flag hides PR UI").
   * Named `hosting` (not `allowHostingUI`) per design.md's literal
   * Contracts section. */
  hosting?: boolean;
}

export interface GoalResult {
  id: string;
  label: string;
  done: boolean;
}

/** `evaluateLevel`'s pure, derived result (design.md Contracts: "Evaluation
 * = {goals[{id, label, done}], solved}"). */
export interface Evaluation {
  goals: GoalResult[];
  solved: boolean;
}

/** A player action worth classifying for the command-budget counter
 * (design.md Contracts: "PlayerAction = command | hosting{op, ok} |
 * ui{resolve|save}"). Structurally identical to (but intentionally NOT
 * imported from) `useGitPlayground.ts`'s `PlayerActionEvent` — importing
 * from `src/app/useGitPlayground.ts` here would pull React into this pure,
 * node-testable module. */
export type PlayerAction =
  | { kind: 'command'; text: string }
  | { kind: 'hosting'; op: 'create' | 'comment' | 'close' | 'reopen' | 'merge'; ok: boolean }
  | { kind: 'ui'; action: 'resolve' | 'save' };
