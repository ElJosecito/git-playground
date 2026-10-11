// Landing's opening section (landing-page spec "Core Sections": Hero first;
// design.md UI "commit-log editorial": "a vertical graph rail; sections as
// commits with mono hash and branch-color tags"). The hero's own h1 carries
// `data-route-focus` (App.tsx's `RouteFrame` focuses it on non-initial
// navigation).
//
// `HeroDemo` (the ONLY landing module that touches the real `GitEngine` at
// runtime) is `React.lazy`-loaded here so its chunk — engine + `GraphLayer`
// — never joins the eager entry (design.md Chunking: "HeroDemo lazy
// (engine + GraphLayer), with a static SVG skeleton as fallback."). This
// file itself imports nothing from the engine, not even a type, since it
// needs none.
import { Suspense, lazy } from 'react';
import type { CSSProperties } from 'react';
import { accentFor } from './colors';
import styles from './Hero.module.css';

const HeroDemoLazy = lazy(() => import('./HeroDemo'));

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
    <section className={styles.commit} style={{ '--accent': accentFor(0) } as CSSProperties} aria-labelledby="hero-heading">
      <span className={styles.dot} />
      <p className={styles.hash}>
        <code>#a1</code> <span className={styles.branchTag}>main</span>
      </p>
      {/* Literal "Git Playground" is load-bearing: `src/__tests__/App.test.tsx`
          (baseline, not owned by this batch) asserts the landing route's h1
          by that exact accessible name. The actual pitch lives in the
          tagline right below it. */}
      <h1 id="hero-heading" data-route-focus tabIndex={-1} className={styles.title}>
        Git Playground
      </h1>
      <p className={styles.tagline}>Aprende Git ejecutando comandos reales.</p>
      <p className={styles.subtitle}>
        Un repositorio de verdad simulado en tu navegador. Cada comando que escribís corre contra un motor Git
        completo — sin instalar nada, sin arriesgar ningún proyecto.
      </p>
      <Suspense fallback={<HeroDemoSkeleton />}>
        <HeroDemoLazy />
      </Suspense>
    </section>
  );
}

export default Hero;
