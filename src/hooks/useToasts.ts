// Transient top-center toast notifications. 1:1 port of the DC template's
// `toast(x)` (design-handoff/Git Playground.dc.html, line 335): max 2
// visible, double-rAF enter (so the initial opacity-0/transform state
// commits to the DOM before the CSS transition kicks in), 4000ms visible,
// then a 300ms leave transition before removal. Every timer/raf handle is
// tracked so unmount cancels them all (mirrors the oracle's `this.timers`
// cleared in `componentWillUnmount`).
import { useCallback, useEffect, useRef, useState } from 'react';
import { codeSegs } from '../ui/markup';
import type { CodeSeg } from '../ui/markup';
import type { ExplainResult } from '../engine/types';

const TONE: Record<ExplainResult['tone'], string> = {
  success: 'var(--success)',
  info: 'var(--text-secondary)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
};

export interface ToastItem {
  id: number;
  icon: string;
  ic: string;
  segs: CodeSeg[];
  op: number;
  tf: string;
  leaving: boolean;
}

export interface UseToastsResult {
  toasts: ToastItem[];
  push(expl: ExplainResult): void;
}

export function useToasts(): UseToastsResult {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const rafIdsRef = useRef<number[]>([]);
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      rafIdsRef.current.forEach((id) => cancelAnimationFrame(id));
      timeoutIdsRef.current.forEach((id) => clearTimeout(id));
    },
    [],
  );

  const push = useCallback((expl: ExplainResult): void => {
    const id = ++idRef.current;
    const item: ToastItem = {
      id,
      icon: expl.icon,
      ic: TONE[expl.tone] ?? TONE.info,
      segs: codeSegs(expl.text),
      op: 0,
      tf: 'translateY(-8px) scale(0.98)',
      leaving: false,
    };
    setToasts((prev) => {
      const list = [...prev.filter((q) => !q.leaving), item];
      while (list.length > 2) list.shift();
      return list;
    });

    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        setToasts((prev) => prev.map((q) => (q.id === id ? { ...q, op: 1, tf: 'none' } : q)));
      });
      rafIdsRef.current.push(raf2);
    });
    rafIdsRef.current.push(raf1);

    const leaveTimeout = setTimeout(() => {
      setToasts((prev) => prev.map((q) => (q.id === id ? { ...q, op: 0, tf: 'translateY(-6px)', leaving: true } : q)));
      const removeTimeout = setTimeout(() => {
        setToasts((prev) => prev.filter((q) => q.id !== id));
      }, 300);
      timeoutIdsRef.current.push(removeTimeout);
    }, 4000);
    timeoutIdsRef.current.push(leaveTimeout);
  }, []);

  return { toasts, push };
}
