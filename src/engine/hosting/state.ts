// Lazily-created hosting container selectors. `RepoState.hosting` is
// optional and absent by default (design.md "Field shape" decision: a
// default-initialized container in `vacio()` would break golden parity and
// the exact-shape `state.test.ts` assertion). All reads go through
// `hostingOf`; all writes go through `ensureHosting`.
import type { RepoState } from '../types';
import type { HostingState } from './types';

export function defaultHosting(): HostingState {
  return { prs: [], nextId: 1, clock: 0 };
}

/** Guards against a corrupt/foreign `hosting` value (e.g. hand-edited localStorage). */
export function isWellFormedHosting(h: unknown): h is HostingState {
  return !!h && typeof h === 'object' && Array.isArray((h as HostingState).prs) && typeof (h as HostingState).nextId === 'number' && typeof (h as HostingState).clock === 'number';
}

/** Read-only selector: never mutates `s`. Returns a fresh default when `s.hosting` is absent or malformed. */
export function hostingOf(s: RepoState): HostingState {
  return isWellFormedHosting(s.hosting) ? s.hosting : defaultHosting();
}

/** Lazily creates (or repairs a malformed) `s.hosting` and returns it. Mutates `s`. */
export function ensureHosting(s: RepoState): HostingState {
  if (!isWellFormedHosting(s.hosting)) s.hosting = defaultHosting();
  return s.hosting;
}
