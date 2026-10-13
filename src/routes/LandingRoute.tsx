// Eager landing route for `#/` (landing-page spec "Core Sections": Hero,
// Features, How it works, Worlds preview, dual CTA, in order /
// "Code-Split Isolation": the landing module graph MUST NOT eagerly import
// `PlaygroundShell`/`LevelShell`).
//
// Concept ("Scroll-Driven History Narrative"): scrolling is time-travelling
// through a repo's history. A main-branch rail runs down the page and draws
// itself with scroll progress (`useScrollProgress` -> `--p`, with a glowing
// HEAD marker at its tip); every section is a commit node that lands on the
// rail as the read-head reaches it; Features forks a branch off and merges
// it back; the worlds are stations on the rail; the finale converges every
// line into one HEAD node.
//
// Decorative layers (dotted grid, glows, noise, rail) are SEPARATE
// aria-hidden elements — any mask/fade is applied to them only, never to
// <main>'s content (a mask on <main> once faded every section below the
// fold to near-invisible).
//
// Unlike every other route, the landing page is a normal scrolling
// document, not the sandbox's fixed-viewport pan/zoom canvas —
// `global.css`'s `body { overflow: hidden }` is scoped off via
// `data-scroll-page` for exactly as long as this route is mounted.
import { useEffect, useRef } from 'react';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { Hero } from '../components/landing/Hero';
import { Features } from '../components/landing/Features';
import { HowItWorks } from '../components/landing/HowItWorks';
import { WorldsPreview } from '../components/landing/WorldsPreview';
import { CTA } from '../components/landing/CTA';
import { SiteNav } from '../components/landing/SiteNav';
import styles from './LandingRoute.module.css';

function HistoryRail() {
  const ref = useRef<HTMLDivElement>(null);
  useScrollProgress(ref);
  return (
    <div ref={ref} className={styles.rail} aria-hidden="true" data-history-rail>
      <span className={styles.railTrack} />
      <span className={styles.railFill} />
      <span className={styles.railHead} />
    </div>
  );
}

function Backdrop() {
  return (
    <div className={styles.backdrop} aria-hidden="true" data-landing-backdrop>
      <span className={styles.grid} />
      <span className={`${styles.glow} ${styles.glowA}`} />
      <span className={`${styles.glow} ${styles.glowB}`} />
      <span className={`${styles.glow} ${styles.glowC}`} />
      <span className={styles.noise} />
    </div>
  );
}

export function LandingRoute() {
  useEffect(() => {
    document.body.setAttribute('data-scroll-page', 'true');
    return () => {
      document.body.removeAttribute('data-scroll-page');
    };
  }, []);

  return (
    <main className={styles.root}>
      <Backdrop />
      <SiteNav />
      <div className={`${styles.frame} ${styles.history}`}>
        <HistoryRail />
        <Hero />
        <Features />
        <HowItWorks />
        <WorldsPreview />
      </div>
      <div className={styles.frame}>
        <CTA />
      </div>
    </main>
  );
}

export default LandingRoute;
