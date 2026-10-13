// Lazy route for `#/cheatsheet`: a searchable Git command reference.
// Container: owns the query, the "/" shortcut, and filtering through the
// pure `searchCheatsheet`; the components under `components/cheatsheet`
// only render. It never imports the engine — `inSimulator` is static data.
//
// Like the landing, it is a normal scrolling document, so it scopes off
// `global.css`'s `body { overflow: hidden }` via `data-scroll-page` while
// mounted.
import { useEffect, useMemo, useRef, useState } from 'react';
import { CHEATSHEET } from '../cheatsheet/commands';
import { countCommands, searchCheatsheet } from '../cheatsheet/search';
import { SiteNav } from '../components/landing/SiteNav';
import { CheatsheetSearch } from '../components/cheatsheet/CheatsheetSearch';
import { CommandCategory } from '../components/cheatsheet/CommandCategory';
import { PageShortcuts } from '../components/cheatsheet/PageShortcuts';
import { useSlashToFocus } from '../components/cheatsheet/useSlashToFocus';
import styles from './CheatsheetRoute.module.css';

const TOTAL = countCommands(CHEATSHEET);

export default function CheatsheetRoute() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchCheatsheet(CHEATSHEET, query), [query]);
  const shown = countCommands(results);

  useSlashToFocus(inputRef);

  useEffect(() => {
    document.body.setAttribute('data-scroll-page', 'true');
    return () => {
      document.body.removeAttribute('data-scroll-page');
    };
  }, []);

  function clearSearch() {
    setQuery('');
    inputRef.current?.focus();
  }

  return (
    <main className={styles.root}>
      <div className={styles.backdrop} aria-hidden="true">
        <span className={styles.grid} />
        <span className={styles.glow} />
      </div>
      <SiteNav current="cheatsheet" />
      <div className={styles.frame}>
        <span className={styles.rail} aria-hidden="true" />

        <header className={styles.hero}>
          <p className={styles.eyebrow}>
            <span className={styles.headNode} aria-hidden="true" />
            <code className={styles.hash}>HEAD</code>
            <span>docs: referencia rápida de Git</span>
          </p>
          <h1 data-route-focus tabIndex={-1} className={styles.title}>
            Cheatsheet de <em>Git</em>
          </h1>
          <p className={styles.lead}>
            Los comandos que más vas a usar, qué hacen y sus atajos. Los que tienen enlace los puedes probar en el modo libre.
          </p>
          <div className={styles.tools}>
            <CheatsheetSearch query={query} onQueryChange={setQuery} inputRef={inputRef} shown={shown} total={TOTAL} />
            <PageShortcuts />
          </div>
        </header>

        <div className={styles.results}>
          {results.length > 0 ? (
            results.map((category, index) => <CommandCategory key={category.id} category={category} index={index} />)
          ) : (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>No hay comandos que coincidan con “{query.trim()}”.</p>
              <p>Prueba con otra palabra, una opción como -b o una categoría como “remoto”.</p>
              <button type="button" className={styles.clear} onClick={clearSearch}>
                Limpiar búsqueda
              </button>
            </div>
          )}
        </div>

        <p className={styles.next}>
          ¿Buscas CI/CD o self-hosted? Mira <a href="#/roadmap">Lo que viene</a>.
        </p>
      </div>
    </main>
  );
}
