// 1:1 port of the DC template's overlay container
// (design-handoff/Git Playground.dc.html, line 216): `<div ref="{{
// overlayRef }}" style="position:fixed; inset:0; pointer-events:none;
// z-index:60;"></div>`.
//
// Per design D9 ("React renders empty containers... React never reconciles
// their children"), this component renders a single always-empty `<div>`
// and nothing else. `useChoreography`'s `fly()` creates/animates/removes its
// own floating label chips inside it directly via the DOM (`overlayRef`),
// and `finishAll()` clears it with `innerHTML = ''` — none of that is React
// state, so this component itself never needs to re-render.
import type { Ref } from 'react';
import styles from './FlyOverlay.module.css';

export interface FlyOverlayProps {
  overlayRef?: Ref<HTMLDivElement>;
}

export function FlyOverlay({ overlayRef }: FlyOverlayProps) {
  return <div ref={overlayRef} className={styles.overlay} />;
}
