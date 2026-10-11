// The hero's live, engine-driven graph (landing-page spec "Engine-Driven
// Hero Demo" / "Reduced Motion Respect"; design.md UI "HeroDemo": "frames
// are precomputed from heroScript (existing nodes never move); typing at
// 45ms per char, 600ms hold, CSS keyframe births, 3s hold, then loop;
// pauses when hidden, off-screen, or via a Pausar button; reduced motion:
// final frame, static list."). This module is the ONLY landing file that
// touches the real `GitEngine` at runtime — `Hero.tsx` only ever
// `import type`s from it and loads this component via `React.lazy`
// (design.md Chunking: "HeroDemo lazy (engine + GraphLayer)"), so `#/`
// never pulls the engine into the eager entry chunk.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GitEngine } from '../../engine';
import type { Layout, RepoState } from '../../engine/types';
import { GraphLayer } from '../GraphLayer';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { HERO_SCRIPT } from './heroScript';
import styles from './HeroDemo.module.css';

const CHAR_MS = 45;
const HOLD_MS = 600;
const LOOP_PAUSE_MS = 3000;

interface Frame {
  state: RepoState;
  layout: Layout;
}

/** Replays `HERO_SCRIPT` through the REAL engine from `vacio()`
 * (level-engine's own "Deterministic Setup Replay" pattern, reused here for
 * the hero) and returns one frame per line PLUS a leading empty frame
 * (index 0) for "nothing typed yet". `frames[i + 1]` is the state AFTER
 * `HERO_SCRIPT[i]`; `frames[i]` is the state BEFORE it — the exact pairing
 * the typing animation needs (show the pre-state while typing step `i`,
 * the post-state once it's "executed"). The script is curated to never be
 * rejected by the real dispatch; if a future edit ever breaks that, the
 * rejected line is skipped (state carries over) rather than throwing and
 * crashing the landing page. */
function buildFrames(script: readonly string[]): Frame[] {
  let state = GitEngine.vacio();
  const frames: Frame[] = [{ state, layout: GitEngine.layout(state) }];
  for (const command of script) {
    const res = GitEngine.ejecutar(state, command);
    if (!res.error) state = res.estado;
    frames.push({ state, layout: GitEngine.layout(state) });
  }
  return frames;
}

type Phase = 'typing' | 'holding' | 'loop-pause';

export function HeroDemo() {
  const reducedMotionRef = useReducedMotion();
  const reducedMotion = reducedMotionRef.current;

  const frames = useMemo(() => buildFrames(HERO_SCRIPT), []);
  const lastFrame = frames[frames.length - 1]!;

  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const [offscreen, setOffscreen] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing');

  // Mirrors of the state above, mutated synchronously inside the scheduler
  // below so each tick can schedule the NEXT tick directly — without
  // waiting on a React re-render to see its own update (state set inside a
  // `setTimeout` callback doesn't flush synchronously the way an event
  // handler's does). Kept in lockstep with the `useState` triplet above,
  // which exists purely for rendering.
  const stepIndexRef = useRef(0);
  const charCountRef = useRef(0);
  const phaseRef = useRef<Phase>('typing');

  const rootRef = useRef<HTMLDivElement>(null);
  const graphWrapRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<SVGGElement>(null);

  // Pause reason 1/3: the tab/window is hidden (WCAG 2.2.2 doesn't require
  // this one, but there is no point burning the typing timer in a
  // background tab).
  useEffect(() => {
    if (reducedMotion) return;
    function onVisibility() {
      setHidden(document.hidden);
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [reducedMotion]);

  // Pause reason 2/3: the demo has scrolled off-screen.
  useEffect(() => {
    if (reducedMotion) return;
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setOffscreen(false);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setOffscreen(!entry.isIntersecting);
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  // Pause reason 3/3: the "Pausar" button (WCAG 2.2.2 "Pause, Stop, Hide" —
  // auto-updating content that starts automatically and lasts longer than
  // 5 seconds must offer a mechanism to pause it).
  const running = !reducedMotion && !manuallyPaused && !hidden && !offscreen;

  useEffect(() => {
    if (reducedMotion || !running) return undefined;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    function scheduleTyping() {
      const command = HERO_SCRIPT[stepIndexRef.current] ?? '';
      if (charCountRef.current < command.length) {
        timeoutId = setTimeout(() => {
          if (cancelled) return;
          charCountRef.current += 1;
          setCharCount(charCountRef.current);
          scheduleTyping();
        }, CHAR_MS);
      } else {
        phaseRef.current = 'holding';
        setPhase('holding');
        scheduleHold();
      }
    }

    function scheduleHold() {
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        if (stepIndexRef.current + 1 < HERO_SCRIPT.length) {
          stepIndexRef.current += 1;
          charCountRef.current = 0;
          phaseRef.current = 'typing';
          setStepIndex(stepIndexRef.current);
          setCharCount(0);
          setPhase('typing');
          scheduleTyping();
        } else {
          phaseRef.current = 'loop-pause';
          setPhase('loop-pause');
          scheduleLoopPause();
        }
      }, HOLD_MS);
    }

    function scheduleLoopPause() {
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        stepIndexRef.current = 0;
        charCountRef.current = 0;
        phaseRef.current = 'typing';
        setStepIndex(0);
        setCharCount(0);
        setPhase('typing');
        scheduleTyping();
      }, LOOP_PAUSE_MS);
    }

    // Resume from wherever the refs currently say we are — exact mid-type
    // resume isn't attempted (a paused demo just restarts the current
    // char's/hold's full delay), which is a fine approximation for
    // decorative content.
    if (phaseRef.current === 'typing') scheduleTyping();
    else if (phaseRef.current === 'holding') scheduleHold();
    else scheduleLoopPause();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [reducedMotion, running]);

  const displayFrame = reducedMotion ? lastFrame : phase === 'typing' ? frames[stepIndex]! : frames[stepIndex + 1]!;
  const typedCommand = reducedMotion ? '' : phase === 'typing' ? (HERO_SCRIPT[stepIndex] ?? '').slice(0, charCount) : HERO_SCRIPT[stepIndex] ?? '';
  const headHash = GitEngine.headHash(displayFrame.state);

  useLayoutEffect(() => {
    const g = worldRef.current;
    if (!g) return;
    const bbox = displayFrame.layout.bbox;
    if (!bbox) {
      g.style.transform = '';
      return;
    }
    const rect = graphWrapRef.current?.getBoundingClientRect();
    const availW = rect && rect.width > 0 ? rect.width : 640;
    const availH = rect && rect.height > 0 ? rect.height : 300;
    const w = Math.max(bbox.x1 - bbox.x0, 1);
    const h = Math.max(bbox.y1 - bbox.y0, 1);
    const scale = Math.min(availW / w, availH / h, 1);
    const tx = availW / 2 - ((bbox.x0 + bbox.x1) / 2) * scale;
    const ty = availH / 2 - ((bbox.y0 + bbox.y1) / 2) * scale;
    g.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }, [displayFrame]);

  return (
    <div ref={rootRef} className={styles.root}>
      <div ref={graphWrapRef} className={styles.graphWrap} aria-hidden="true">
        <GraphLayer layout={displayFrame.layout} planVersion={0} tipId={headHash} worldRef={worldRef} />
      </div>

      {reducedMotion ? (
        <ol className={styles.scriptList} aria-label="Guion de comandos de la demo">
          {HERO_SCRIPT.map((command, i) => (
            <li key={i}>
              <code>{command}</code>
            </li>
          ))}
        </ol>
      ) : (
        <div className={styles.terminal} aria-hidden="true">
          <p className={styles.terminalLine}>
            <span className={styles.prompt}>$</span> <code>{typedCommand}</code>
            <span className={styles.cursor} />
          </p>
        </div>
      )}

      <p className={styles.srSummary}>
        Demostración en vivo: crea un repositorio, confirma un commit, abre una rama, confirma otro commit y fusiona
        la rama en main con un commit de merge.
      </p>

      {!reducedMotion && (
        <button
          type="button"
          className={styles.pauseButton}
          aria-pressed={manuallyPaused}
          onClick={() => setManuallyPaused((p) => !p)}
        >
          {manuallyPaused ? 'Reanudar' : 'Pausar'}
        </button>
      )}
    </div>
  );
}

export default HeroDemo;
