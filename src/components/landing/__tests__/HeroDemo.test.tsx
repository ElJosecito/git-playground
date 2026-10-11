// @vitest-environment jsdom
// RED (tasks.md Phase 8, 8.1): HeroDemo fake-timer tests — real-engine
// script replay, loop, reduced-motion static frame, pause (landing-page
// spec "Engine-Driven Hero Demo" / "Reduced Motion Respect"; WCAG 2.2.2
// "Pausar" control).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { HeroDemo } from '../HeroDemo';
import { HERO_SCRIPT } from '../heroScript';
import { GitEngine } from '../../../engine';

type IOCallback = (entries: Pick<IntersectionObserverEntry, 'isIntersecting'>[]) => void;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IOCallback;
  constructor(callback: IOCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
  observe(): void {
    // Simulate the element already being on-screen the moment it's observed.
    this.callback([{ isIntersecting: true }]);
  }
  unobserve(): void {}
  disconnect(): void {}
}

function totalScriptTypingMs(): number {
  return HERO_SCRIPT.reduce((sum, c) => sum + c.length * 45, 0);
}

function totalHoldMs(): number {
  return HERO_SCRIPT.length * 600;
}

/** ms to fully type + hold the first `n` script lines (0-indexed count of
 * COMPLETED lines) — i.e. how long until the (n+1)th line starts typing.
 * Used to pick advance windows that land predictably mid-typing of a later
 * line, instead of exactly on a phase-transition boundary (fragile). */
function msToFinishLines(n: number): number {
  return HERO_SCRIPT.slice(0, n).reduce((sum, c) => sum + c.length * 45 + 600, 0);
}

/** Replays `HERO_SCRIPT` directly through the real engine (independent of
 * the component) to derive the expected final commit count. */
function realCommitCountAfterScript(): number {
  let state = GitEngine.vacio();
  for (const command of HERO_SCRIPT) {
    const res = GitEngine.ejecutar(state, command);
    if (!res.error) state = res.estado;
  }
  return GitEngine.layout(state).nodes.length;
}

describe('HeroDemo', () => {
  const originalMatchMedia = window.matchMedia;
  const originalIO = window.IntersectionObserver;

  beforeEach(() => {
    vi.useFakeTimers();
    MockIntersectionObserver.instances = [];
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver;
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = originalIO;
  });

  it('replays the hero script through the real engine, matching a direct replay once the script finishes', () => {
    const { container } = render(<HeroDemo />);
    act(() => {
      vi.advanceTimersByTime(totalScriptTypingMs() + totalHoldMs());
    });
    const nodeCount = container.querySelectorAll('[data-h]').length;
    expect(nodeCount).toBe(realCommitCountAfterScript());
    expect(nodeCount).toBeGreaterThan(0);
  });

  it('loops: after the final hold plus the 3s loop pause, the graph resets to empty', () => {
    const { container } = render(<HeroDemo />);
    act(() => {
      vi.advanceTimersByTime(totalScriptTypingMs() + totalHoldMs() + 3000 + 10);
    });
    expect(container.querySelectorAll('[data-h]').length).toBe(0);
  });

  it('respects reduced motion: shows the final graph state immediately with no animation', () => {
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    const { container } = render(<HeroDemo />);
    expect(container.querySelectorAll('[data-h]').length).toBe(realCommitCountAfterScript());
  });

  it('respects reduced motion: shows a static script list instead of the typed terminal line', () => {
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    render(<HeroDemo />);
    expect(screen.getAllByRole('listitem')).toHaveLength(HERO_SCRIPT.length);
    expect(screen.queryByRole('button', { name: /pausar/i })).not.toBeInTheDocument();
  });

  // Pauses below land mid-typing of HERO_SCRIPT[1] (3 of its characters in)
  // rather than on an exact phase-transition boundary — landing exactly on
  // a boundary made the "frozen" and "progressed" snapshots coincidentally
  // identical in an earlier version of this test (both showed 0 chars typed
  // of two DIFFERENT, equally-untyped lines).
  const MID_LINE_1 = 1;
  const MID_LINE_1_CHARS = 3;

  function midTypingAdvanceMs(): number {
    return msToFinishLines(MID_LINE_1) + MID_LINE_1_CHARS * 45;
  }

  function typedText(): string | null | undefined {
    return document.querySelector('code')?.textContent;
  }

  it('pauses advancing via the "Pausar" button and resumes on "Reanudar"', () => {
    render(<HeroDemo />);
    act(() => {
      vi.advanceTimersByTime(midTypingAdvanceMs());
    });
    expect(typedText()).toBe(HERO_SCRIPT[MID_LINE_1]!.slice(0, MID_LINE_1_CHARS));

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    });
    const textAtPause = typedText();
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(typedText()).toBe(textAtPause);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Reanudar' }));
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(typedText()!.length).toBeGreaterThan(textAtPause!.length);
    expect(typedText()).toContain(textAtPause);
  });

  it('pauses while the document is hidden and resumes once visible again', () => {
    render(<HeroDemo />);
    act(() => {
      vi.advanceTimersByTime(midTypingAdvanceMs());
    });
    const textAtHide = typedText();
    expect(textAtHide).toBe(HERO_SCRIPT[MID_LINE_1]!.slice(0, MID_LINE_1_CHARS));

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(typedText()).toBe(textAtHide);

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(typedText()!.length).toBeGreaterThan(textAtHide!.length);
    expect(typedText()).toContain(textAtHide);
  });

  it('pauses when scrolled off-screen and resumes when back in view', () => {
    render(<HeroDemo />);
    act(() => {
      vi.advanceTimersByTime(midTypingAdvanceMs());
    });
    const textOnScreen = typedText();
    expect(textOnScreen).toBe(HERO_SCRIPT[MID_LINE_1]!.slice(0, MID_LINE_1_CHARS));
    const observer = MockIntersectionObserver.instances[0]!;

    act(() => {
      observer.callback([{ isIntersecting: false }]);
    });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(typedText()).toBe(textOnScreen);

    act(() => {
      observer.callback([{ isIntersecting: true }]);
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(typedText()!.length).toBeGreaterThan(textOnScreen!.length);
    expect(typedText()).toContain(textOnScreen);
  });
});
