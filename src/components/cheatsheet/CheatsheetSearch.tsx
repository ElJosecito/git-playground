// Presentational search field. The parent owns the query; Esc clears it
// (or leaves the field when it is already empty). Shared by the
// `#/cheatsheet` page and the sandbox's cheatsheet panel, so the field id
// and an extra class are configurable.
import type { KeyboardEvent, RefObject } from 'react';
import styles from './CheatsheetSearch.module.css';

interface CheatsheetSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  shown: number;
  total: number;
  /** DOM id of the field; must be unique per page. */
  id?: string;
  className?: string;
}

export function CheatsheetSearch({
  query,
  onQueryChange,
  inputRef,
  shown,
  total,
  id = 'cheatsheet-search',
  className,
}: CheatsheetSearchProps) {
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    if (query) onQueryChange('');
    else event.currentTarget.blur();
  }

  return (
    <form role="search" className={className ? `${styles.search} ${className}` : styles.search} onSubmit={(event) => event.preventDefault()}>
      <label htmlFor={id} className={styles.label}>
        Buscar comandos
      </label>
      <div className={styles.field}>
        <span className={styles.prompt} aria-hidden="true">
          $
        </span>
        <input
          ref={inputRef}
          id={id}
          type="search"
          className={styles.input}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="commit, ramas, deshacer, checkout -b…"
          autoComplete="off"
          spellCheck={false}
        />
        <kbd className={styles.hint} aria-hidden="true">
          /
        </kbd>
      </div>
      <p role="status" className={styles.count}>
        {shown === total ? `${total} comandos` : `${shown} de ${total} comandos`}
      </p>
    </form>
  );
}

export default CheatsheetSearch;
