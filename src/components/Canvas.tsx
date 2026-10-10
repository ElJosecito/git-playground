// The pan/zoom surface the commit graph lives on. 1:1 port of the DC
// template's canvas wrapper `<div ref="{{ canvasRef }}"
// onPointerDown="{{ canvasDown }}" style="...">{{ graphEl }}</div>`
// (design-handoff/Git Playground.dc.html, line 27).
//
// Canvas itself owns no camera logic (design component tree: `Canvas
// {onPointerDown, children}`) — `useCamera` lives one level up (App.tsx /
// the future PlaygroundShell) and is wired in through `canvasRef` (so its
// wheel listener and `getBoundingClientRect()` calls have a DOM node to
// attach to) and `onPointerDown` (so clicks/drags/pinches reach it).
import type { PointerEvent as ReactPointerEvent, ReactNode, Ref } from 'react';
import styles from './Canvas.module.css';

export interface CanvasProps {
  canvasRef?: Ref<HTMLDivElement>;
  onPointerDown(e: ReactPointerEvent<HTMLDivElement>): void;
  children?: ReactNode;
}

export function Canvas({ canvasRef, onPointerDown, children }: CanvasProps) {
  return (
    <div ref={canvasRef} onPointerDown={onPointerDown} className={styles.canvas}>
      {children}
    </div>
  );
}
