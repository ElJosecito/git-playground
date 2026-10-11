// Landing's opening section (landing-page spec "Core Sections": Hero first)
// and the first commit on the page's history rail ("Scroll-Driven History
// Narrative"). The h1 carries `data-route-focus` (App.tsx's `RouteFrame`
// focuses it on non-initial navigation) and is the page's ONLY h1.
//
// `HeroDemo` (the ONLY landing module that touches the real `GitEngine` at
// runtime) is `React.lazy`-loaded here so its chunk — engine + `GraphLayer`
// — never joins the eager entry (design.md Chunking: "HeroDemo lazy
// (engine + GraphLayer), with a static SVG skeleton as fallback."). This
// file itself imports nothing from the engine, not even a type.
import { Suspense, lazy } from 'react';
import type { CSSProperties } from 'react';
import { preloadLevelMap, preloadPlayground } from '../../app/router/routes';
import { WORLDS_META } from '../../lessons/worldsMeta';
import { accentFor } from './colors';
import { CountUp } from './CountUp';
import commit from './Commit.module.css';
import styles from './Hero.module.css';

const HeroDemoLazy = lazy(() => import('./HeroDemo'));

const LEVEL_COUNT = WORLDS_META.reduce((n, w) => n + w.levels.length, 0);

function HeroDemoSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <svg viewBox="0 0 320 160" className={styles.skeletonSvg}>
        <circle cx="40" cy="120" r="10" />
        <circle cx="140" cy="120" r="10" />
        <circle cx="240" cy="40" r="10" />
        <path d="M40,120 L140,120" />
        <path d="M140,120 L240,40" />
      </svg>
    </div>
  );
}

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.copy} style={{ '--accent': accentFor(0) } as CSSProperties}>
        <p className={`${commit.eyebrow} ${styles.eyebrow}`}>
          <span className={`${commit.node} ${styles.heroNode}`} aria-hidden="true" />
          <span className={commit.stub} aria-hidden="true" />
          <code className={commit.hash}>a1f3c9e</code>
          <span className={commit.tag}>HEAD → main</span>
          <span className={commit.message}>commit inicial</span>
        </p>

        <h1 id="hero-heading" data-route-focus tabIndex={-1} className={styles.title}>
          <span className={styles.line}>Aprende Git</span>{' '}
          <span className={styles.line}>
            <em>sin miedo</em> a romper nada.
          </span>
        </h1>

        <p className={styles.lede}>
          Un repositorio de verdad, simulado en tu navegador. Escribe comandos reales, mira cómo crece el grafo y
          equivócate todo lo que quieras: aquí no se pierde nada.
        </p>

        <div className={styles.actions}>
          <a href="#/niveles" className={styles.primary} onMouseEnter={() => preloadLevelMap()} onFocus={() => preloadLevelMap()}>
            Empezar ahora
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
          </a>
          <a
            href="#/playground"
            className={styles.secondary}
            onMouseEnter={() => preloadPlayground()}
            onFocus={() => preloadPlayground()}
          >
            Probar el modo libre
          </a>
        </div>

        <dl className={styles.stats}>
          <div>
            <dt>niveles</dt>
            <dd>
              <CountUp value={LEVEL_COUNT} />
            </dd>
          </div>
          <div>
            <dt>mundos</dt>
            <dd>
              <CountUp value={WORLDS_META.length} delay={850} />
            </dd>
          </div>
          <div>
            <dt>instalaciones</dt>
            <dd>
              <CountUp value={0} />
            </dd>
          </div>
        </dl>
      </div>

      <div className={styles.stage}>
        <div className={styles.window}>
          <div className={styles.windowBar} aria-hidden="true">
            <span className={styles.windowDots}>
              <i />
              <i />
              <i />
            </span>
            <span className={styles.windowTitle}>~/mi-proyecto</span>
            <span className={styles.live}>en vivo</span>
          </div>
          <Suspense fallback={<HeroDemoSkeleton />}>
            <HeroDemoLazy />
          </Suspense>
        </div>
      </div>

      <p className={styles.scrollCue} aria-hidden="true">
        <code>git log --reverse</code>
        <span>desliza para viajar por la historia</span>
        <span className={styles.chevron}>↓</span>
      </p>
    </section>
  );
}

export default Hero;
