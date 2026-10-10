// Reads `prefers-reduced-motion` ONCE (never re-checked), mirroring the
// oracle's `componentDidMount` (design-handoff/Git Playground.dc.html):
// `this.reduced = window.matchMedia && matchMedia('(prefers-reduced-motion:
// reduce)').matches;`. Returned as a ref (not state) because every consumer
// (`useCamera`, `useChoreography`) already reads `reducedRef.current`
// synchronously inside imperative callbacks, same as design's documented
// `useCamera({..., reducedRef, ...})`/`useChoreography({..., reducedRef,
// ...})` signatures.
import { useRef } from 'react';
import type { RefObject } from 'react';

function readReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useReducedMotion(): RefObject<boolean> {
  const ref = useRef<boolean | null>(null);
  if (ref.current === null) {
    ref.current = readReducedMotion();
  }
  return ref as RefObject<boolean>;
}
