// Eager landing route for `#/` (landing-page spec "Core Sections": Hero,
// Features, How it works, Worlds preview, dual CTA, in order /
// "Code-Split Isolation": the landing module graph MUST NOT eagerly import
// `PlaygroundShell`/`LevelShell`). design.md UI: "commit-log editorial"
// direction — a vertical graph rail runs down the page; each section is
// styled as one entry in `git log --graph`.
//
// Unlike every other route, the landing page is a normal scrolling
// document, not the sandbox's fixed-viewport pan/zoom canvas —
// `global.css`'s `body { overflow: hidden }` (written for the
// single-canvas-app era) is scoped off via `data-scroll-page` for exactly
// as long as this route is mounted.
import { useEffect } from 'react';
import { Hero } from '../components/landing/Hero';
import { Features } from '../components/landing/Features';
import { HowItWorks } from '../components/landing/HowItWorks';
import { WorldsPreview } from '../components/landing/WorldsPreview';
import { CTA } from '../components/landing/CTA';
import styles from './LandingRoute.module.css';

export function LandingRoute() {
  useEffect(() => {
    document.body.setAttribute('data-scroll-page', 'true');
    return () => {
      document.body.removeAttribute('data-scroll-page');
    };
  }, []);

  return (
    <main className={styles.root}>
      <div className={styles.rail} aria-hidden="true" />
      <Hero />
      <Features />
      <HowItWorks />
      <WorldsPreview />
      <CTA />
    </main>
  );
}

export default LandingRoute;
