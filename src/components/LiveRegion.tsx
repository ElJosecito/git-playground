// Visually-hidden accessibility announcer (tasks.md 7.7/7.8). 1:1 port of
// the DC template's live region (design-handoff/Git Playground.dc.html,
// line 217): `<div aria-live="polite" style="position:absolute; width:1px;
// height:1px; overflow:hidden; clip:rect(0 0 0 0);">{{ live }}</div>`.
// `text` is `playgroundReducer`'s `state.live`, set by `useGitPlayground`'s
// `useLayoutEffect[transition.id]` from `choreo.after()`'s return value
// (Phase 5).
import styles from './LiveRegion.module.css';

export interface LiveRegionProps {
  text: string;
}

export function LiveRegion({ text }: LiveRegionProps) {
  return (
    <div aria-live="polite" className={styles.root}>
      {text}
    </div>
  );
}
