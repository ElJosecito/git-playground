// The PR creation form inside `HostingView` (spec "hosting-web-view"
// domain, "Creation Form" requirement). New behavior, no oracle equivalent.
// Submission goes straight through `useGitPlayground`'s `hosting.create`
// handler (design's data-flow diagram: "error -> {ok:false,lines} -> inline
// message / ok -> applyResult"); this component never touches the engine or
// the terminal directly.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { SegText } from '../SegText';
import { parseLine } from '../../ui/markup';
import { defaultCompareBranch, noOriginBranchesHint, originBranchesPushHint } from '../../ui/hostingSelectors';
import type { CreatePullRequestInput } from '../../engine/hosting/create';
import type { CreatePrOutcome } from '../../app/useGitPlayground';
import styles from './NewPullRequestForm.module.css';

export interface NewPullRequestFormProps {
  /** Branches currently pushed to origin (`Object.keys(repo.remote.branches)`),
   * offered as the ONLY selectable options in both pickers (UX fix: a
   * free-text `<datalist>` input let the user mistype or fail to find a
   * branch that was actually there — see `defaultCompareBranch`/
   * `originBranchesPushHint`). */
  originBranches: string[];
  onCreate(input: CreatePullRequestInput): CreatePrOutcome;
  /** Called with the new PR's id after a successful creation — the caller
   * navigates straight to that PR's detail (UX fix: landing back on the
   * list made a freshly-opened PR read as "accepted immediately" since
   * there was nothing to show it was merely open). */
  onCreated(id: number): void;
  onCancel(): void;
}

/** `target`'s own default: `main` when present, else the first origin
 * branch, else `''` (no branches at all). */
function defaultBaseBranch(originBranches: string[]): string {
  return originBranches.includes('main') ? 'main' : originBranches[0] ?? '';
}

export function NewPullRequestForm({ originBranches, onCreate, onCreated, onCancel }: NewPullRequestFormProps) {
  const [target, setTarget] = useState(() => defaultBaseBranch(originBranches));
  const [source, setSource] = useState(() => defaultCompareBranch(originBranches, defaultBaseBranch(originBranches)));
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errorLines, setErrorLines] = useState<string[] | null>(null);

  // Resync `target`/`source` when the ORIGIN BRANCH LIST ITSELF changes
  // (e.g. a branch pushed/deleted from the terminal while this form stays
  // open) — "adjusting state during render" (React's documented pattern
  // for deriving state from props without an effect/extra paint). Compared
  // by CONTENT (`branchesKey`), not array identity: the real app's
  // `originBranches` prop is a fresh `Object.keys(...)` array on every
  // render, so an identity check would spuriously reset the user's
  // in-progress selection on every unrelated rerender.
  const branchesKey = originBranches.join('\u0000');
  const [prevBranchesKey, setPrevBranchesKey] = useState(branchesKey);
  if (branchesKey !== prevBranchesKey) {
    setPrevBranchesKey(branchesKey);
    const nextTarget = target && originBranches.includes(target) ? target : defaultBaseBranch(originBranches);
    const nextSource = source && source !== nextTarget && originBranches.includes(source) ? source : defaultCompareBranch(originBranches, nextTarget);
    setTarget(nextTarget);
    setSource(nextSource);
  }

  const hasOriginBranches = originBranches.length > 0;
  // Comparar never offers the current Base — selecting the same branch for
  // both is always rejected by the engine ("La rama de origen y la rama de
  // destino no pueden ser la misma."), so removing it from the list makes
  // that dead end unreachable instead of just rejecting it after submit.
  const compareBranches = originBranches.filter((b) => b !== target);

  function handleTargetChange(nextTarget: string): void {
    setTarget(nextTarget);
    // The previously-selected Comparar branch may now equal the new Base —
    // give it a fresh, valid default instead of leaving a stale selection
    // that's no longer even in the (filtered) option list.
    if (source === nextTarget) {
      setSource(defaultCompareBranch(originBranches, nextTarget));
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setErrorLines(null);
    const outcome = onCreate({ source, target, title, body });
    if (outcome.ok) {
      onCreated(outcome.id);
    } else {
      setErrorLines(outcome.lines);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.title}>Nuevo pull request</div>

      {!hasOriginBranches && <div className={styles.hint}>{noOriginBranchesHint()}</div>}

      <div className={styles.branches}>
        <label className={styles.field}>
          <span className={styles.label}>Base</span>
          <select
            value={target}
            onChange={(e) => handleTargetChange(e.target.value)}
            disabled={!hasOriginBranches}
            className={styles.select}
            aria-label="Base"
          >
            {!target && <option value="">Elige una rama</option>}
            {originBranches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <span className={styles.arrow}>←</span>
        <label className={styles.field}>
          <span className={styles.label}>Comparar</span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            disabled={!hasOriginBranches}
            className={styles.select}
            aria-label="Comparar"
          >
            {!source && <option value="">Elige una rama</option>}
            {compareBranches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.pushHint}>{originBranchesPushHint()}</div>

      <label className={styles.field}>
        <span className={styles.label}>Título</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!hasOriginBranches}
          className={styles.input}
          placeholder="Título del pull request"
          aria-label="Título"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Descripción</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={!hasOriginBranches}
          className={styles.textarea}
          placeholder="Deja un comentario"
          aria-label="Descripción"
        />
      </label>

      {errorLines && (
        <div role="alert" className={styles.error}>
          {errorLines.map((line, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i}>
              <SegText segs={parseLine(line)} />
            </div>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <button type="button" onClick={onCancel} className={styles.cancel}>
          Cancelar
        </button>
        <button type="submit" disabled={!hasOriginBranches} className={styles.submit}>
          Crear pull request
        </button>
      </div>
    </form>
  );
}
