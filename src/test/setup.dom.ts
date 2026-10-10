// jsdom test environment setup: stubs the browser APIs the original DC
// prototype relied on (WAAPI, ResizeObserver, matchMedia, SVG geometry,
// pointer capture) that jsdom does not implement.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// `@testing-library/react`'s automatic per-test cleanup only self-registers
// when `test.globals: true` is set; this project imports test APIs
// explicitly instead; so it is registered explicitly here, once, for every
// `dom`-project test file.
afterEach(() => {
  cleanup();
});

class FakeAnimation {
  onfinish: (() => void) | null = null;
  oncancel: (() => void) | null = null;
  playState: 'running' | 'finished' | 'idle' = 'running';
  effect = {
    getTiming: () => ({ duration: 0, delay: 0, iterations: 1 }),
  };

  finish(): void {
    this.playState = 'finished';
    this.onfinish?.();
  }

  cancel(): void {
    this.playState = 'idle';
    this.oncancel?.();
  }

  // Minimal EventTarget-like surface used by Animation consumers.
  addEventListener(): void {}
  removeEventListener(): void {}
}

if (!('animate' in Element.prototype)) {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    writable: true,
    value: function animate(): FakeAnimation {
      return new FakeAnimation();
    },
  });
}

if (!('getAnimations' in document)) {
  Object.defineProperty(document, 'getAnimations', {
    configurable: true,
    writable: true,
    value: () => [],
  });
}

if (typeof SVGElement !== 'undefined' && !('getTotalLength' in SVGElement.prototype)) {
  Object.defineProperty(SVGElement.prototype, 'getTotalLength', {
    configurable: true,
    writable: true,
    value: () => 0,
  });
}

if (!('matchMedia' in window)) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

if (!('ResizeObserver' in window)) {
  class FakeResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  Object.defineProperty(window, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: FakeResizeObserver,
  });
}

if (!('escape' in CSS)) {
  Object.defineProperty(CSS, 'escape', {
    configurable: true,
    writable: true,
    value: (value: string) => String(value).replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`),
  });
}

if (!('setPointerCapture' in Element.prototype)) {
  Object.defineProperty(Element.prototype, 'setPointerCapture', {
    configurable: true,
    writable: true,
    value: () => {},
  });
  Object.defineProperty(Element.prototype, 'releasePointerCapture', {
    configurable: true,
    writable: true,
    value: () => {},
  });
  Object.defineProperty(Element.prototype, 'hasPointerCapture', {
    configurable: true,
    writable: true,
    value: () => false,
  });
}
