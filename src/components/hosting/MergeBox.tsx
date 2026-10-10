// The merge box inside `PullRequestDetail`'s open-PR view: strategy
// selector, "Eliminar rama" checkbox, and "Fusionar pull request" (spec
// "hosting-web-view" domain, "Merge Box" requirement). New behavior, no
// oracle equivalent. Hidden/disabled entirely on `conflicts`/
// `missing-branch` (spec: "disabled/hidden entirely"); usable with a
// non-blocking warning on `outdated`; only the "Rebase and merge" option
// disabled when `canRebase:false` while the base merge is otherwise clean.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { SegText } from '../SegText';
import { parseLine } from '../../ui/markup';
import { mergeBlockedExplanation, mergeOutdatedWarning, rebaseDisabledHint, strategyLabel } from '../../ui/hostingSelectors';
import type { Mergeability, MergeStrategy } from '../../engine/hosting/types';
import type { HostingOutcome } from '../../app/useGitPlayground';
import styles from './MergeBox.module.css';

export interface MergeBoxProps {
  mergeability: Mergeability;
  target: string;
  onMerge(strategy: MergeStrategy, deleteBranch: boolean): HostingOutcome;
}

const STRATEGIES: MergeStrategy[] = ['merge', 'squash', 'rebase'];

export function MergeBox({ mergeability, target, onMerge }: MergeBoxProps) {
  const [strategy, setStrategy] = useState<MergeStrategy>('merge');
  const [deleteBranch, setDeleteBranch] = useState(false);
  const [errorLines, setErrorLines] = useState<string[] | null>(null);

  if (mergeability.state === 'conflicts' || mergeability.state === 'missing-branch') {
    return (
      <div role="alert" className={styles.blocked}>
        {mergeBlockedExplanation(mergeability)}
      </div>
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const outcome = onMerge(strategy, deleteBranch);
    setErrorLines(outcome.ok ? null : outcome.lines);
  }

  return (
    <form onSubmit={handleSubmit} className={styles.box}>
      {mergeability.outdated && <div className={styles.warning}>{mergeOutdatedWarning(target)}</div>}

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Estrategia de fusión</span>
          <select aria-label="Estrategia de fusión" value={strategy} onChange={(e) => setStrategy(e.target.value as MergeStrategy)} className={styles.select}>
            {STRATEGIES.map((s) => (
              <option key={s} value={s} disabled={s === 'rebase' && !mergeability.canRebase}>
                {strategyLabel(s)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!mergeability.canRebase && <div className={styles.hint}>{rebaseDisabledHint()}</div>}

      <label className={styles.checkboxField}>
        <input type="checkbox" checked={deleteBranch} onChange={(e) => setDeleteBranch(e.target.checked)} />
        Eliminar rama
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

      <button type="submit" className={styles.mergeButton}>
        Fusionar pull request
      </button>
    </form>
  );
}
