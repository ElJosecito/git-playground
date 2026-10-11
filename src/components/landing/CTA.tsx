// landing-page spec "Core Sections": "a dual CTA ('Empezar niveles' ->
// #/niveles, 'Modo libre' -> #/playground)". Preloaded on hover/focus
// (design.md: "Route loaders live in routes.ts and are preloaded on CTA
// hover/focus.") so the chunk is already in flight by the time the click
// lands.
//
// "Scroll-Driven History Narrative" finale: the main rail and three other
// branch lines converge (scroll-scrubbed) into one big merge node — HEAD —
// and the two CTAs are styled as the commands you'd type next. Each CTA
// has a cursor-following glow + slight magnetic pull (pointer-fine,
// motion-allowed only; written as CSS custom properties, no re-renders).
import { useRef } from 'react';
import type { PointerEvent } from 'react';
import { preloadLevelMap, preloadPlayground } from '../../app/router/routes';
import { useReveal } from '../../hooks/useReveal';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { accentFor } from './colors';
import styles from './CTA.module.css';

interface CommandLinkProps {
  href: string;
  command: string;
  label: string;
  hint: string;
  primary?: boolean;
  onPreload: () => void;
}

function onPointerMove(e: PointerEvent<HTMLAnchorElement>) {
  if (e.pointerType !== 'mouse') return;
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  el.style.setProperty('--gx', `${x}px`);
  el.style.setProperty('--gy', `${y}px`);
  el.style.setProperty('--mx', `${((x / rect.width - 0.5) * 10).toFixed(2)}px`);
  el.style.setProperty('--my', `${((y / rect.height - 0.5) * 8).toFixed(2)}px`);
}

function onPointerLeave(e: PointerEvent<HTMLAnchorElement>) {
  const el = e.currentTarget;
  el.style.removeProperty('--mx');
  el.style.removeProperty('--my');
}

function CommandLink({ href, command, label, hint, primary, onPreload }: CommandLinkProps) {
  return (
    <a
      href={href}
      className={primary ? `${styles.command} ${styles.primary}` : styles.command}
      onMouseEnter={onPreload}
      onFocus={onPreload}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <span className={styles.commandLine} aria-hidden="true">
        <span className={styles.prompt}>$</span> {command}
        <span className={styles.caret} />
      </span>
      <span className={styles.label}>{label}</span>
      <span className={styles.hint} aria-hidden="true">
        {hint}
      </span>
      <span className={styles.arrow} aria-hidden="true">
        →
      </span>
    </a>
  );
}

const LINES = [
  { d: 'M0 0 C0 120 50 90 50 220', color: 'var(--l-rail-end)', fade: false },
  { d: 'M24 0 C24 110 50 120 50 220', color: accentFor(1), fade: true },
  { d: 'M70 0 C70 120 50 110 50 220', color: accentFor(2), fade: true },
  { d: 'M96 0 C96 130 50 100 50 220', color: accentFor(3), fade: true },
];

export function CTA() {
  const convergeRef = useRef<HTMLDivElement>(null);
  useScrollProgress(convergeRef, 0.85);
  const { ref, revealProps } = useReveal<HTMLElement>({ rootMargin: '0px 0px -25% 0px', threshold: 0.1 });
  return (
    <section ref={ref} className={styles.finale} aria-labelledby="cta-heading" {...revealProps}>
      <div ref={convergeRef} className={styles.converge} aria-hidden="true">
        <svg className={styles.lines} viewBox="0 0 100 220" preserveAspectRatio="none">
          <defs>
            {LINES.map((line, i) => (
              <linearGradient key={i} id={`cta-fade-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={line.color} stopOpacity={line.fade ? 0 : 1} />
                <stop offset="0.45" stopColor={line.color} stopOpacity={line.fade ? 0.7 : 1} />
                <stop offset="1" stopColor={line.color} stopOpacity="1" />
              </linearGradient>
            ))}
          </defs>
          {LINES.map((line, i) => (
            <path key={i} d={line.d} stroke={`url(#cta-fade-${i})`} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <span className={styles.bigNode}>
          <span className={styles.bigNodeCore}>HEAD</span>
        </span>
      </div>

      <div className={styles.content}>
        <p className={styles.eyebrow}>
          <code>merge</code> 4 ramas → <code>main</code> · tu turno
        </p>
        <h2 id="cta-heading" className={styles.title}>
          Tu primer commit <em>te está esperando.</em>
        </h2>
        <p className={styles.lead}>Elige por dónde entrar. Puedes cambiar de camino cuando quieras.</p>
        <div className={styles.ctas}>
          <CommandLink
            href="#/niveles"
            command="git switch niveles"
            label="Empezar niveles"
            hint="30 niveles guiados, de cero a PR"
            primary
            onPreload={() => preloadLevelMap()}
          />
          <CommandLink
            href="#/playground"
            command="git switch playground"
            label="Modo libre"
            hint="un repositorio vacío, sin reglas"
            onPreload={() => preloadPlayground()}
          />
        </div>
        <p className={styles.footer}>
          <span className={styles.footerDot} aria-hidden="true" />
          Git Playground · aprende Git sin instalar nada
        </p>
      </div>
    </section>
  );
}

export default CTA;
