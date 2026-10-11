// Scroll-scrubbed progress for the landing page's history rail and
// branch/merge moments (landing-page spec "Scroll-Driven History
// Narrative"). Writes CSS custom properties straight onto the element —
// never React state — so scrolling never re-renders anything:
//   --p     0..1 progress of the anchor line through the element
//   --p-px  the same progress in px (for translating the HEAD marker)
// plus `data-scroll-live` so CSS can opt into scrubbed styling (without it,
// every scrubbed visual falls back to its fully-drawn final state).
//
// All instances share ONE passive scroll/resize listener and ONE
// requestAnimationFrame per frame; inside that frame every subscriber is
// MEASURED first and WRITTEN second, so there is no read/write layout
// thrash. Under prefers-reduced-motion (or without rAF) nothing is
// attached at all.
import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';
import { DEFAULT_ANCHOR, scrollProgress } from '../ui/scrollProgress';
import { prefersReducedMotion } from './useReveal';

interface Subscriber {
  el: HTMLElement | SVGElement;
  anchor: number;
  last: number;
}

const subscribers = new Set<Subscriber>();
let frame = 0;

function flush() {
  frame = 0;
  const viewportHeight = window.innerHeight;
  const subs = Array.from(subscribers);
  // Reads first...
  const measured = subs.map((s) => {
    const rect = s.el.getBoundingClientRect();
    return { p: scrollProgress({ top: rect.top, height: rect.height, viewportHeight, anchor: s.anchor }), h: rect.height };
  });
  // ...writes second.
  subs.forEach((s, i) => {
    const { p, h } = measured[i]!;
    if (p === s.last) return;
    s.last = p;
    s.el.style.setProperty('--p', p.toFixed(4));
    s.el.style.setProperty('--p-px', `${(p * h).toFixed(1)}px`);
  });
}

function schedule() {
  if (frame === 0) frame = window.requestAnimationFrame(flush);
}

function subscribe(sub: Subscriber): () => void {
  if (subscribers.size === 0) {
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
  }
  subscribers.add(sub);
  schedule();
  return () => {
    subscribers.delete(sub);
    if (subscribers.size === 0) {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    }
  };
}

export function useScrollProgress<T extends HTMLElement | SVGElement>(
  ref: RefObject<T | null>,
  anchor: number = DEFAULT_ANCHOR,
): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') return undefined;
    if (prefersReducedMotion()) return undefined;
    el.setAttribute('data-scroll-live', 'true');
    const unsubscribe = subscribe({ el, anchor, last: -1 });
    return () => {
      unsubscribe();
      el.removeAttribute('data-scroll-live');
      el.style.removeProperty('--p');
      el.style.removeProperty('--p-px');
    };
  }, [ref, anchor]);
}
