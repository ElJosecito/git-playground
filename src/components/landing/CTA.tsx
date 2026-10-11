// landing-page spec "Core Sections": "a dual CTA ('Empezar niveles' ->
// #/niveles, 'Modo libre' -> #/playground)". Preloaded on hover/focus
// (design.md: "Route loaders live in routes.ts and are preloaded on CTA
// hover/focus.") so the chunk is already in flight by the time the click
// lands.
import { preloadLevelMap, preloadPlayground } from '../../app/router/routes';
import styles from './CTA.module.css';

export function CTA() {
  return (
    <section className={styles.commit} aria-labelledby="cta-heading">
      <span className={styles.dot} />
      <p className={styles.hash}>
        <code>#c9</code> <span className={styles.branchTag}>HEAD</span>
      </p>
      <h2 id="cta-heading" className={styles.title}>
        ¿Por dónde empezamos?
      </h2>
      <div className={styles.ctas}>
        <a
          href="#/niveles"
          className={styles.primary}
          onMouseEnter={() => preloadLevelMap()}
          onFocus={() => preloadLevelMap()}
        >
          Empezar niveles
        </a>
        <a
          href="#/playground"
          className={styles.secondary}
          onMouseEnter={() => preloadPlayground()}
          onFocus={() => preloadPlayground()}
        >
          Modo libre
        </a>
      </div>
    </section>
  );
}

export default CTA;
