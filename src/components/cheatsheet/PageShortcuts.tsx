// Presentational: the page's own keyboard shortcuts.
import styles from './PageShortcuts.module.css';

const SHORTCUTS: readonly { keys: string; action: string }[] = [
  { keys: '/', action: 'Ir a la búsqueda' },
  { keys: 'Esc', action: 'Limpiar la búsqueda (o salir del campo si ya está vacío)' },
  { keys: 'Tab', action: 'Recorrer los enlaces para probar cada comando' },
];

export function PageShortcuts() {
  return (
    <section className={styles.block} aria-labelledby="page-shortcuts">
      <h2 id="page-shortcuts" className={styles.title}>
        Atajos de la página
      </h2>
      <dl className={styles.list}>
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.keys} className={styles.row}>
            <dt>
              <kbd>{shortcut.keys}</kbd>
            </dt>
            <dd>{shortcut.action}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default PageShortcuts;
