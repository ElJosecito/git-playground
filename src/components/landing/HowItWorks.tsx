// landing-page spec "Core Sections": How it works (third section) — three
// steps, each with a tiny live-ish illustration that plays when the step
// list is revealed (landing-page spec "Scroll-Driven History Narrative"):
// a terminal typing a commit -> the graph growing -> a PR getting merged.
// A connector line draws across the steps as they stagger in.
import type { CSSProperties, ReactNode } from 'react';
import { useReveal } from '../../hooks/useReveal';
import { CommitHeader } from './CommitHeader';
import { MiniTerminal } from './MiniTerminal';
import { accentFor } from './colors';
import commit from './Commit.module.css';
import styles from './HowItWorks.module.css';

interface Step {
  title: string;
  body: string;
  visual: ReactNode;
}

function GrowGraph() {
  const dots = [0, 1, 2, 3];
  return (
    <div className={styles.grow} aria-hidden="true">
      <span className={styles.growLine} />
      {dots.map((i) => (
        <span
          key={i}
          className={i === dots.length - 1 ? `${styles.growDot} ${styles.growHead}` : styles.growDot}
          style={{ '--k': i } as CSSProperties} />
      ))}
      <span className={styles.growLabel}>
        <span className={styles.headPill}>HEAD</span> → main
      </span>
    </div>
  );
}

function PullRequestCard() {
  return (
    <div className={styles.pr} aria-hidden="true">
      <p className={styles.prTitle}>
        <span className={styles.prNumber}>#1</span> Agrega login
      </p>
      <p className={styles.prRefs}>
        <code>login</code> → <code>main</code>
      </p>
      <p className={styles.prCheck}>✓ revisión aprobada</p>
      <span className={styles.prStatus}>
        <span className={styles.prOpen}>Abierto</span>
        <span className={styles.prMerged}>Fusionado</span>
      </span>
    </div>
  );
}

const STEPS: Step[] = [
  {
    title: 'Escribe un comando',
    body: 'Una terminal como la tuya, con historial, autocompletado y los errores de siempre. Empieza por git init y sigue desde ahí.',
    visual: <MiniTerminal lines={[{ kind: 'cmd', text: 'git commit -m "hola"' }, { kind: 'ok', text: '[main a1f3c9e] hola' }]} baseDelay={500} />,
  },
  {
    title: 'Mira el grafo reaccionar',
    body: 'Cada commit, rama y fusión aparece en el lienzo al instante. Si algo no sale como esperabas, el grafo te muestra por qué.',
    visual: <GrowGraph />,
  },
  {
    title: 'Llega hasta el pull request',
    body: 'Los niveles te llevan de tu primer commit a abrir, revisar y fusionar un PR. O salta al modo libre y experimenta a tu ritmo.',
    visual: <PullRequestCard />,
  },
];

export function HowItWorks() {
  const { ref, revealProps } = useReveal<HTMLOListElement>({ rootMargin: '0px 0px -20% 0px', threshold: 0.15 });
  return (
    <section className={commit.section} aria-labelledby="how-it-works-heading">
      <CommitHeader hash="c4d81fa" message="docs: cómo funciona" accent={4}>
        <h2 id="how-it-works-heading" className={commit.title}>
          Cómo <em>funciona</em>
        </h2>
      </CommitHeader>
      <ol ref={ref} className={styles.list} {...revealProps}>
        {STEPS.map((step, i) => (
          <li key={step.title} className={styles.item} style={{ '--i': i, '--accent': accentFor(i + 3) } as CSSProperties}>
            <span className={styles.number} aria-hidden="true">
              0{i + 1}
            </span>
            <div className={styles.visual}>{step.visual}</div>
            <h3 className={styles.title}>{step.title}</h3>
            <p className={styles.body}>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default HowItWorks;
