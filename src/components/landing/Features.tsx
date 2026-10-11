// landing-page spec "Core Sections": Features (second section) and
// "Scroll-Driven History Narrative": the page's branching moment. A
// feature branch (`por-que`) forks off the main history rail, collects
// three commits — one per feature — and merges back, its fork/lane/merge
// strokes scrubbed by scroll progress (`useScrollProgress` -> `--p`).
// Each feature card is a commit on that branch and reveals on its own,
// with a self-typing terminal or a self-drawing graph as its visual.
import { useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useReveal } from '../../hooks/useReveal';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { CommitHeader } from './CommitHeader';
import { MiniTerminal } from './MiniTerminal';
import type { TerminalLine } from './MiniTerminal';
import { MiniGraph } from './MiniGraph';
import { accentFor } from './colors';
import commit from './Commit.module.css';
import styles from './Features.module.css';

interface Feature {
  hash: string;
  title: string;
  body: string;
  visual: ReactNode;
}

const ENGINE_LINES: TerminalLine[] = [
  { kind: 'cmd', text: 'git switch -c login' },
  { kind: 'out', text: "Cambiado a nueva rama 'login'" },
  { kind: 'cmd', text: 'git commit -m "Agrega login"' },
  { kind: 'out', text: '[login 7c2e4b0] Agrega login' },
  { kind: 'cmd', text: 'git rebase main' },
  { kind: 'ok', text: '✓ 1 commit reaplicado sobre main' },
];

const CONFLICT_LINES: TerminalLine[] = [
  { kind: 'cmd', text: 'git merge saludo' },
  { kind: 'err', text: 'CONFLICTO en hola.txt' },
  { kind: 'marker', text: '<<<<<<< HEAD', resolve: true },
  { kind: 'mine', text: 'hola mundo', resolve: true },
  { kind: 'marker', text: '=======', resolve: true },
  { kind: 'theirs', text: 'hola, git', resolve: true },
  { kind: 'marker', text: '>>>>>>> saludo', resolve: true },
  { kind: 'ok', text: '✓ resuelto · nada se rompió' },
];

const FEATURES: Feature[] = [
  {
    hash: '7c2e4b0',
    title: 'Un motor Git de verdad, no un video',
    body: 'Ramas, merges, rebase, conflictos y reflog. Cada comando corre contra un motor que se comporta como Git, así que lo que aprendes aquí funciona igual en tu terminal.',
    visual: <MiniTerminal lines={ENGINE_LINES} title="~/mi-proyecto" />,
  },
  {
    hash: 'e91d5a3',
    title: 'Equivócate todo lo que quieras',
    body: 'Todo vive en tu navegador. Provoca un conflicto, lanza un git reset --hard o fusiona mal a propósito: no hay ningún proyecto real en juego.',
    visual: <MiniTerminal lines={CONFLICT_LINES} title="conflicto" />,
  },
  {
    hash: '0b8f6d2',
    title: 'Ves cada commit en el momento',
    body: 'Nada de imaginar qué pasó. Cada commit, rama y fusión aparece en el grafo en cuanto ejecutas el comando.',
    visual: <MiniGraph />,
  },
];

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const { ref, revealProps } = useReveal<HTMLLIElement>({ rootMargin: '0px 0px -18% 0px', threshold: 0.2 });
  return (
    <li
      ref={ref}
      className={styles.item}
      style={{ '--accent': accentFor(1), '--i': index } as CSSProperties}
      {...revealProps}
    >
      <span className={styles.node} aria-hidden="true" />
      <div className={styles.copy}>
        <p className={styles.hash}>
          <code>{feature.hash}</code>
          <span className={styles.branchName}>por-que</span>
        </p>
        <h3 className={styles.title}>{feature.title}</h3>
        <p className={styles.body}>{feature.body}</p>
      </div>
      <div className={styles.visual}>{feature.visual}</div>
    </li>
  );
}

export function Features() {
  const branchRef = useRef<HTMLDivElement>(null);
  useScrollProgress(branchRef);
  return (
    <section className={commit.section} aria-labelledby="features-heading">
      <CommitHeader hash="3f9a2c1" tag="por-que" message="git switch -c por-que" accent={1}>
        <h2 id="features-heading" className={commit.title}>
          Por qué aprender <em>aquí</em>
        </h2>
        <p className={commit.lead}>
          Tres razones, tres commits en su propia rama. Sigue bajando: la rama vuelve a main cuando terminas de leer.
        </p>
      </CommitHeader>

      <div ref={branchRef} className={styles.branch}>
        <div className={styles.lane} aria-hidden="true">
          <svg className={styles.fork} viewBox="0 0 10 72" preserveAspectRatio="none">
            <path d="M0 0 C0 40 10 32 10 72" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className={styles.laneTrack} />
          <span className={styles.laneFill} />
          <svg className={styles.merge} viewBox="0 0 10 72" preserveAspectRatio="none">
            <path d="M10 0 C10 40 0 32 0 72" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <ul className={styles.list}>
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.hash} feature={feature} index={i} />
          ))}
        </ul>
      </div>

      <CommitHeader hash="5be04d7" tag="main" message="Merge branch 'por-que'" accent={0} className={styles.mergeCommit}>
        {null}
      </CommitHeader>
    </section>
  );
}

export default Features;
