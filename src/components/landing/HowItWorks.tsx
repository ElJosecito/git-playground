// landing-page spec "Core Sections": How it works (third section) — three
// steps, framed as a short "run log" to match the commit-log direction.
import type { CSSProperties } from 'react';
import { accentFor } from './colors';
import styles from './HowItWorks.module.css';

interface Step {
  hash: string;
  command: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    hash: '#e5',
    command: '$ elegí tu camino',
    title: 'Elegí niveles guiados o modo libre',
    body: 'Los niveles te llevan de "tu primer commit" a pull requests paso a paso. El modo libre te da un repositorio vacío para explorar a tu ritmo.',
  },
  {
    hash: '#f6',
    command: '$ git ...',
    title: 'Escribí comandos de Git reales',
    body: 'Usá la terminal simulada como usarías la tuya: autocompletado, historial, mensajes de error reales incluidos.',
  },
  {
    hash: '#a7',
    command: '$ mirá el grafo',
    title: 'Mirá el resultado en el grafo',
    body: 'Commits, ramas y fusiones aparecen al instante en el lienzo. Si algo no sale como esperabas, el grafo te muestra exactamente por qué.',
  },
];

export function HowItWorks() {
  return (
    <section className={styles.section} aria-labelledby="how-it-works-heading">
      <h2 id="how-it-works-heading" className={styles.heading}>
        Cómo funciona
      </h2>
      <ol className={styles.list}>
        {STEPS.map((step, i) => (
          <li key={step.hash} className={styles.item} style={{ '--accent': accentFor(i + 4) } as CSSProperties}>
            <span className={styles.dot} />
            <p className={styles.hash}>
              <code>{step.hash}</code> <span className={styles.command}>{step.command}</span>
            </p>
            <h3 className={styles.title}>{step.title}</h3>
            <p className={styles.body}>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default HowItWorks;
