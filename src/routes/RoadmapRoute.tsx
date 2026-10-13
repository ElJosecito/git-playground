// Lazy route for `#/roadmap` ("Lo que viene"): upcoming updates and
// improvements, drawn in the landing's git language — `main` as the history
// rail and every upcoming feature as an unmerged (dashed) branch forking off
// it. Pure presentation: no engine, no state.
//
// Like the landing and the cheatsheet, it is a normal scrolling document, so
// it scopes off `global.css`'s `body { overflow: hidden }` via
// `data-scroll-page` while mounted.
import { useEffect } from 'react';
import { SiteNav } from '../components/landing/SiteNav';
import { RoadmapSection } from '../components/roadmap/RoadmapSection';
import styles from './RoadmapRoute.module.css';

export default function RoadmapRoute() {
  useEffect(() => {
    document.body.setAttribute('data-scroll-page', 'true');
    return () => {
      document.body.removeAttribute('data-scroll-page');
    };
  }, []);

  return (
    <main className={styles.root}>
      <div className={styles.backdrop} aria-hidden="true">
        <span className={styles.grid} />
        <span className={styles.glow} />
      </div>
      <SiteNav current="roadmap" />
      <div className={styles.frame}>
        <span className={styles.rail} aria-hidden="true" />

        <header className={styles.hero}>
          <p className={styles.eyebrow}>
            <span className={styles.headNode} aria-hidden="true" />
            <code className={styles.hash}>main</code>
            <span>git branch --no-merged</span>
          </p>
          <h1 data-route-focus tabIndex={-1} className={styles.title}>
            Lo que viene
          </h1>
          <p className={styles.lead}>
            Las próximas actualizaciones y mejoras de Git Playground. Cada una vive en su propia rama hasta que esté lista para
            fusionarse con <code>main</code>.
          </p>
        </header>

        <ol className={styles.branches}>
          <li className={styles.fork}>
            <RoadmapSection id="cicd" branch="feat/ci-cd" title="CI/CD" badge="En progreso" tone="progress">
              <p>Estamos trabajando para traer CI/CD a Git Playground. Todavía no está disponible.</p>
              <ul>
                <li>Pipelines que se ejecutan con cada push.</li>
                <li>Workflows al estilo GitHub Actions, definidos en un archivo YAML.</li>
                <li>Checks en tus pull requests simulados: en verde para fusionar, en rojo para corregir.</li>
              </ul>
            </RoadmapSection>
          </li>
          <li className={styles.fork}>
            <RoadmapSection id="self-hosted" branch="feat/self-hosted" title="Self-hosted" badge="Próximamente" tone="soon">
              <p>
                Una forma sencilla de alojar Git Playground en tu propia infraestructura, por ejemplo para un aula o un equipo. Aún no
                hay fecha.
              </p>
            </RoadmapSection>
          </li>
        </ol>

        <p className={styles.note}>
          ¿Tienes una idea o echas algo en falta?{' '}
          <a href="https://github.com/ElJosecito/git-playground/issues" target="_blank" rel="noreferrer">
            Propónla en GitHub
          </a>
          .
        </p>
      </div>
    </main>
  );
}
