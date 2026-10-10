// Mobile/viewport breakpoint detection (tasks.md 7.5/7.6), 1:1 port of the
// oracle's `onResize` (design-handoff/Git Playground.dc.html):
//   `const r=this.canvasRef.current?this.canvasRef.current.getBoundingClientRect():null;
//    const W=r&&r.width?r.width:innerWidth,H=r&&r.height?r.height:innerHeight;
//    ...this.setState(s=>({vw:W,vh:H,mobile:W<720,...}))`
// and `componentDidMount`'s `addEventListener('resize',this.onResize)` +
// `new ResizeObserver(()=>this.onResize())` observing the canvas element.
//
// Per design.md's hook table: "Returns `{vw, vh, mobile: vw < 720, sized}`.
// Uses ResizeObserver and window `resize`." This replaces the ad hoc
// `useViewport()` that `App.tsx` carried since Phase 3/4.
import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

export interface MobileViewport {
  vw: number;
  vh: number;
  mobile: boolean;
  sized: boolean;
}

const MOBILE_BREAKPOINT = 720;

function measure(canvasRef: RefObject<HTMLElement | null>): { vw: number; vh: number } {
  const r = canvasRef.current?.getBoundingClientRect();
  const fallbackW = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const fallbackH = typeof window === 'undefined' ? 768 : window.innerHeight;
  const vw = r && r.width ? r.width : fallbackW;
  const vh = r && r.height ? r.height : fallbackH;
  return { vw, vh };
}

export function useMobile(canvasRef: RefObject<HTMLElement | null>): MobileViewport {
  const [state, setState] = useState<MobileViewport>(() => {
    const { vw, vh } = measure(canvasRef);
    return { vw, vh, mobile: vw < MOBILE_BREAKPOINT, sized: false };
  });

  useEffect(() => {
    function onResize(): void {
      const { vw, vh } = measure(canvasRef);
      if (!vw || !vh) return;
      setState({ vw, vh, mobile: vw < MOBILE_BREAKPOINT, sized: true });
    }
    onResize();
    window.addEventListener('resize', onResize);
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined' && canvasRef.current) {
      ro = new ResizeObserver(onResize);
      ro.observe(canvasRef.current);
    }
    return () => {
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef.current]);

  return state;
}
