// landing-page spec "Core Sections": Features (second section). Three
// short, concrete claims about what makes the sandbox trustworthy to a
// beginner — no generic "fast, modern, reliable" filler copy.
import type { CSSProperties } from 'react';
import { accentFor } from './colors';
import styles from './Features.module.css';

interface Feature {
  hash: string;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    hash: '#b2',
    title: 'Un motor Git real, no una animación',
    body: 'Cada "git commit", "git merge" o "git rebase" corre contra un motor que implementa el comportamiento real de Git — ramas, conflictos, reflog, todo. Lo que aprendés acá funciona igual en tu terminal.',
  },
  {
    hash: '#c3',
    title: 'Nada que instalar, nada que romper',
    body: 'Todo vive en tu navegador. No hay repositorio real de por medio, así que podés escribir "git reset --hard" o fusionar mal a propósito sin miedo a perder nada.',
  },
  {
    hash: '#d4',
    title: 'El grafo de commits, siempre visible',
    body: 'En vez de imaginar qué hace cada comando, lo ves: cada commit, cada rama y cada fusión aparecen en el grafo apenas los ejecutás.',
  },
];

export function Features() {
  return (
    <section className={styles.section} aria-labelledby="features-heading">
      <h2 id="features-heading" className={styles.visuallyHiddenHeading}>
        Por qué Git Playground
      </h2>
      <ul className={styles.list}>
        {FEATURES.map((feature, i) => (
          <li key={feature.hash} className={styles.item} style={{ '--accent': accentFor(i + 1) } as CSSProperties}>
            <span className={styles.dot} />
            <p className={styles.hash}>
              <code>{feature.hash}</code>
            </p>
            <h3 className={styles.title}>{feature.title}</h3>
            <p className={styles.body}>{feature.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default Features;
