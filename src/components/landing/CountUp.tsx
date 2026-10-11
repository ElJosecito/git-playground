// Number that counts up from 0 once on mount (hero stats). Renders the
// FINAL value in markup — the count-up only runs when motion is allowed and
// requestAnimationFrame exists, writing `textContent` directly (no React
// re-renders). The animated digits are aria-hidden; screen readers get the
// final value from the visually-hidden twin.
import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../hooks/useReveal';
import styles from './Hero.module.css';

interface CountUpProps {
  value: number;
  delay?: number;
  duration?: number;
}

export function CountUp({ value, delay = 700, duration = 1200 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === 0 || typeof window.requestAnimationFrame !== 'function' || prefersReducedMotion()) return undefined;
    let frame = 0;
    let start = 0;
    el.textContent = '0';
    const tick = (now: number) => {
      if (start === 0) start = now + delay;
      const t = Math.min(Math.max((now - start) / duration, 0), 1);
      const eased = 1 - (1 - t) ** 3;
      el.textContent = String(Math.round(eased * value));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      el.textContent = String(value);
    };
  }, [value, delay, duration]);

  return (
    <>
      <span ref={ref} aria-hidden="true">
        {value}
      </span>
      <span className={styles.srOnly}>{value}</span>
    </>
  );
}

export default CountUp;
