// Presentational: one category of commands, drawn as a branch off the
// page's history rail; each command is a card with its explanation and
// shortcuts.
import type { CSSProperties } from 'react';
import type { CheatCategory, CheatCommand } from '../../cheatsheet/commands';
import styles from './CommandCategory.module.css';

const ACCENT_VARS = ['--l-blue', '--l-violet', '--l-green', '--l-pink', '--l-rail-end'] as const;

function CommandCard({ entry }: { entry: CheatCommand }) {
  const titleId = `cmd-${entry.id}`;
  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <h3 id={titleId} className={styles.command}>
        <code>{entry.command}</code>
      </h3>
      <p className={styles.summary}>{entry.summary}</p>
      <p className={styles.explanation}>{entry.explanation}</p>
      {entry.shortcuts.length > 0 && (
        <div className={styles.shortcuts}>
          <p className={styles.shortcutsLabel} id={`${titleId}-shortcuts`}>
            Atajos y equivalentes
          </p>
          <ul aria-labelledby={`${titleId}-shortcuts`}>
            {entry.shortcuts.map((shortcut) => (
              <li key={shortcut}>
                <code>{shortcut}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className={styles.footer}>
        {entry.inSimulator ? (
          <a href="#/playground" className={styles.try}>
            Probar en el playground <span aria-hidden="true">→</span>
          </a>
        ) : (
          <span className={styles.offline}>Fuera del simulador</span>
        )}
      </div>
    </article>
  );
}

interface CommandCategoryProps {
  category: CheatCategory;
  index: number;
}

export function CommandCategory({ category, index }: CommandCategoryProps) {
  const headingId = `cat-${category.id}`;
  const accent = { '--accent': `var(${ACCENT_VARS[index % ACCENT_VARS.length]})` } as CSSProperties;
  return (
    <section className={styles.category} aria-labelledby={headingId} style={accent}>
      <header className={styles.header}>
        <span className={styles.node} aria-hidden="true" />
        <p className={styles.branch}>
          <code>{category.id}</code>
          <span>· {category.commands.length}</span>
        </p>
        <h2 id={headingId} className={styles.title}>
          {category.title}
        </h2>
        <p className={styles.description}>{category.description}</p>
      </header>
      <div className={styles.grid}>
        {category.commands.map((entry) => (
          <CommandCard key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}

export default CommandCategory;
