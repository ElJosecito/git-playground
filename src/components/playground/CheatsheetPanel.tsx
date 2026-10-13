// The sandbox's cheatsheet side panel: the same data and search as
// `#/cheatsheet`, in a compact list. Commands the simulator supports get a
// "Usar" action that hands the command text to the parent (which drops it
// into the terminal input without running it). The parent owns whether the
// panel is open; this component owns only the query.
//
// It is a non-modal dialog: focus moves to the search on open, Esc (with an
// empty search) asks the parent to close, and "/" refocuses the search when
// the user is not typing somewhere else.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { CHEATSHEET } from '../../cheatsheet/commands';
import type { CheatCommand } from '../../cheatsheet/commands';
import { countCommands, searchCheatsheet } from '../../cheatsheet/search';
import { CheatsheetSearch } from '../cheatsheet/CheatsheetSearch';
import { useSlashToFocus } from '../cheatsheet/useSlashToFocus';
import styles from './CheatsheetPanel.module.css';

export const CHEATSHEET_PANEL_ID = 'playground-cheatsheet';
const TITLE_ID = `${CHEATSHEET_PANEL_ID}-title`;
const TOTAL = countCommands(CHEATSHEET);

export interface CheatsheetPanelProps {
  onClose(): void;
  onUse(command: string): void;
}

function CommandRow({ entry, onUse }: { entry: CheatCommand; onUse(command: string): void }) {
  return (
    <li className={styles.item}>
      <div className={styles.row}>
        <code className={styles.command}>{entry.command}</code>
        {entry.inSimulator && (
          <button
            type="button"
            className={styles.use}
            aria-label={`Usar ${entry.command}`}
            title="Escribir en la terminal"
            onClick={() => onUse(entry.command)}
          >
            Usar
          </button>
        )}
      </div>
      <p className={styles.summary}>{entry.summary}</p>
      <details className={styles.details}>
        <summary className={styles.more}>Ver detalles</summary>
        <p className={styles.explanation}>{entry.explanation}</p>
        {entry.shortcuts.length > 0 && (
          <>
            <p className={styles.shortcutsLabel}>Atajos y equivalentes</p>
            <ul className={styles.shortcuts}>
              {entry.shortcuts.map((shortcut) => (
                <li key={shortcut}>
                  <code>{shortcut}</code>
                </li>
              ))}
            </ul>
          </>
        )}
        {!entry.inSimulator && <p className={styles.offline}>Fuera del simulador</p>}
      </details>
    </li>
  );
}

export function CheatsheetPanel({ onClose, onUse }: CheatsheetPanelProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchCheatsheet(CHEATSHEET, query), [query]);

  useSlashToFocus(inputRef);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return;
    // The first Esc in a non-empty search only clears it (CheatsheetSearch).
    if (event.target === inputRef.current && query) return;
    event.preventDefault();
    onClose();
  }

  return (
    <div id={CHEATSHEET_PANEL_ID} role="dialog" aria-modal="false" aria-labelledby={TITLE_ID} className={styles.panel} onKeyDown={onKeyDown}>
      <header className={styles.header}>
        <h2 id={TITLE_ID} className={styles.title}>
          Cheatsheet
        </h2>
        <a href="#/cheatsheet" className={styles.full}>
          Ver completo
        </a>
        <button type="button" className={styles.close} aria-label="Cerrar cheatsheet" title="Cerrar (Esc)" onClick={onClose}>
          ×
        </button>
      </header>
      <CheatsheetSearch
        id={`${CHEATSHEET_PANEL_ID}-search`}
        className={styles.search}
        query={query}
        onQueryChange={setQuery}
        inputRef={inputRef}
        shown={countCommands(results)}
        total={TOTAL}
      />
      <div className={styles.list}>
        {results.length > 0 ? (
          results.map((category) => (
            <section key={category.id} className={styles.category} aria-labelledby={`${CHEATSHEET_PANEL_ID}-cat-${category.id}`}>
              <h3 id={`${CHEATSHEET_PANEL_ID}-cat-${category.id}`} className={styles.categoryTitle}>
                {category.title}
              </h3>
              <ul className={styles.items}>
                {category.commands.map((entry) => (
                  <CommandRow key={entry.id} entry={entry} onUse={onUse} />
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className={styles.empty}>No hay comandos que coincidan con “{query.trim()}”.</p>
        )}
      </div>
    </div>
  );
}

export default CheatsheetPanel;
