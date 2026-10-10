// The draggable/resizable terminal window — primary input surface for the
// playground. 1:1 port of the DC template's terminal markup
// (design-handoff/Git Playground.dc.html, lines 191-214). History
// navigation, Tab completion, and persistence are owned by
// `useGitPlayground`/`useTerminalWindow`; this component only renders the
// given state and forwards DOM events to the callbacks it receives.
import { useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent, Ref } from 'react';
import { TerminalLine as TerminalLineView } from './TerminalLine';
import type { TerminalLine as TerminalLineModel } from '../app/playgroundReducer';
import type { TerminalGeometry } from '../hooks/useTerminalWindow';
import type { Seg } from '../ui/markup';
import styles from './TerminalWindow.module.css';

export interface TerminalWindowProps {
  geom: TerminalGeometry;
  min: boolean;
  open: boolean;
  resizable: boolean;
  mobile?: boolean;
  /** The terminal's root element (oracle's `termRef`) — `useChoreography`'s
   * `after()` shakes it with a WAAPI translateX wiggle on a command error. */
  windowRef?: Ref<HTMLDivElement>;
  onDragStart(e: ReactPointerEvent): void;
  onResizeStart(e: ReactPointerEvent): void;
  onToggleMin(): void;
  onToggleMax(): void;
  lines: TerminalLineModel[];
  promptSegs: Seg[];
  input: string;
  onInputChange(value: string): void;
  onSubmit(text: string): void;
  onHistoryPrev(): void;
  onHistoryNext(): void;
  onComplete(currentInput: string): void;
  onClearLines(): void;
}

export function TerminalWindow({
  geom,
  min: _min,
  open,
  resizable,
  mobile = false,
  windowRef,
  onDragStart,
  onResizeStart,
  onToggleMin,
  onToggleMax,
  lines,
  promptSegs,
  input,
  onInputChange,
  onSubmit,
  onHistoryPrev,
  onHistoryNext,
  onComplete,
  onClearLines,
}: TerminalWindowProps) {
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  function focusInput(): void {
    if (window.getSelection && String(window.getSelection()).length) return;
    inputRef.current?.focus({ preventScroll: true });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(input);
      return;
    }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      onClearLines();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onHistoryPrev();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onHistoryNext();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      onComplete(input);
    }
  }

  return (
    <div
      ref={windowRef}
      role="region"
      aria-label="Terminal"
      className={styles.window}
      style={{
        left: geom.tLeft,
        top: geom.tTop,
        width: geom.tW,
        height: geom.tH,
        borderRadius: geom.tRadius,
        transition: geom.tTransition,
      }}
    >
      <div
        onPointerDown={onDragStart}
        onDoubleClick={onToggleMax}
        className={`${styles.header} ${mobile ? styles.headerMobile : styles.headerDesktop}`}
      >
        <div className={styles.trafficLights}>
          <button type="button" onClick={onToggleMin} aria-label="Minimizar terminal" className={`${styles.dot} ${styles.dotRed}`} />
          <button
            type="button"
            onClick={onToggleMin}
            aria-label="Minimizar terminal"
            className={`${styles.dot} ${styles.dotYellow}`}
          />
          <button
            type="button"
            onClick={onToggleMax}
            aria-label="Ampliar terminal"
            className={`${styles.dot} ${styles.dotGreen}`}
          />
        </div>
        <div className={styles.title}>repo — git playground</div>
      </div>
      {open && (
        <div ref={outputRef} onClick={focusInput} className={styles.output}>
          {lines.map((line) => (
            <TerminalLineView key={line.id} line={line} />
          ))}
          <div className={styles.promptRow}>
            {promptSegs.map((seg, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <span key={i} className={styles.promptSeg} style={{ color: seg.c }}>
                {seg.t}
              </span>
            ))}
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un comando… prueba git status"
              aria-label="Comando"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className={styles.input}
            />
          </div>
        </div>
      )}
      {resizable && <div onPointerDown={onResizeStart} aria-hidden="true" className={styles.resizeHandle} />}
    </div>
  );
}
