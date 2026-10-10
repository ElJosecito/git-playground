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
import { noOriginBranchesHint } from '../../ui/hostingSelectors';
import type { CreatePullRequestInput } from '../../engine/hosting/create';
import type { HostingOutcome } from '../../app/useGitPlayground';
import styles from './NewPullRequestForm.module.css';

export interface NewPullRequestFormProps {
  /** Branches currently pushed to origin (`Object.keys(repo.remote.branches)`),
   * offered as datalist suggestions — the user may still type any branch
   * name (including one not yet pushed), which is exactly how the "source
   * not pushed" rejection scenario is reached from this form. */
  originBranches: string[];
  onCreate(input: CreatePullRequestInput): HostingOutcome;
  /** Called after a successful creation — the caller navigates back to the list. */
  onCreated(): void;
  onCancel(): void;
}

export function NewPullRequestForm({ originBranches, onCreate, onCreated, onCancel }: NewPullRequestFormProps) {
  const [target, setTarget] = useState(originBranches.includes('main') ? 'main' : originBranches[0] ?? '');
  const [source, setSource] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errorLines, setErrorLines] = useState<string[] | null>(null);

  const hasOriginBranches = originBranches.length > 0;

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setErrorLines(null);
    const outcome = onCreate({ source, target, title, body });
    if (outcome.ok) {
      onCreated();
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
          <input
            list="hosting-origin-branches"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={!hasOriginBranches}
            className={styles.input}
            aria-label="Base"
          />
        </label>
        <span className={styles.arrow}>←</span>
        <label className={styles.field}>
          <span className={styles.label}>Comparar</span>
          <input
            list="hosting-origin-branches"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            disabled={!hasOriginBranches}
            className={styles.input}
            aria-label="Comparar"
          />
        </label>
        <datalist id="hosting-origin-branches">
          {originBranches.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
      </div>

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
