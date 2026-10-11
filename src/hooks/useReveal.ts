// Progressive-enhancement on-scroll reveal (landing-page spec "Scroll-Driven
// History Narrative" / "Reduced Motion Respect").
//
// State machine: "static" -> "hidden" -> "shown".
//   - "static" is the initial (and SSR/no-JS) state: no `data-reveal`
//     attribute is emitted, so CSS never hides anything. It is ALSO the
//     permanent state when IntersectionObserver is missing or the user
//     prefers reduced motion — content is then simply, fully visible.
//   - Only once JS confirms IO support (in a layout effect, i.e. before the
//     first paint) is the element armed to "hidden"; the observer flips it
//     to "shown" when it enters the (optionally inset) viewport.
// Styling lives in CSS via `[data-reveal='hidden'|'shown']` selectors, so
// this hook never touches inline styles.
import { useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export type RevealState = 'static' | 'hidden' | 'shown';

export interface UseRevealOptions {
  rootMargin?: string;
  threshold?: number;
  /** Reveal once and stop observing (default true). */
  once?: boolean;
}

export interface UseRevealResult<T extends Element> {
  ref: RefObject<T | null>;
  state: RevealState;
  /** Spread onto the observed element: `{}` while static, otherwise
   * `{ 'data-reveal': state }`. */
  revealProps: { 'data-reveal'?: 'hidden' | 'shown' };
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useReveal<T extends Element = HTMLElement>({
  rootMargin = '0px 0px -12% 0px',
  threshold = 0.12,
  once = true,
}: UseRevealOptions = {}): UseRevealResult<T> {
  const ref = useRef<T | null>(null);
  const [state, setState] = useState<RevealState>('static');

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') return undefined;
    if (prefersReducedMotion()) return undefined;

    setState('hidden');
    const observer = new window.IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setState('shown');
            if (once) {
              observer.disconnect();
              return;
            }
          } else if (!once) {
            setState('hidden');
          }
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, threshold, once]);

  return { ref, state, revealProps: state === 'static' ? {} : { 'data-reveal': state } };
}
