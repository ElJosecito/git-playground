// TS mirrors of `theme.css`'s `--dur-*`/`--ease-*` custom properties. WAAPI's
// `Element.animate()` cannot resolve CSS `var()` references, so every
// choreography animation (Phase 5: `useChoreography`, `ui/plan.ts`) that
// needs one of these shared values reads it from here instead of inlining a
// literal that could drift from `src/styles/theme.css`. One-off durations
// the oracle itself keeps inline (e.g. `mkPlan`'s per-node stagger `step`,
// or `fly()`'s 420/440/480ms) are ported as inline literals too, matching
// design-handoff/Git Playground.dc.html 1:1 — only the *shared*, named
// tokens are centralized here.
export const DUR_FAST = 150;
export const DUR_BASE = 280;
export const DUR_SLOW = 450;
export const DUR_CAMERA = 700;

export const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
export const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)';
export const EASE_SPRING = 'cubic-bezier(0.34, 1.4, 0.64, 1)';
export const EASE_SPRING_SOFT = 'cubic-bezier(0.34, 1.36, 0.64, 1)';
