// Ported error model: `GitError` is a plain class carrying pre-formatted
// output lines; it deliberately does NOT extend `Error` (the oracle checks
// `e instanceof GitError`, not `e instanceof Error`).
import { C, M } from './markup';

export class GitError {
  lines: string[];
  constructor(lines: string[]) {
    this.lines = lines;
  }
}

/** Throws a GitError, auto-wrapping the main line in `e` markup and the rest in `m`, unless already marked (or blank). */
export function fail(main: string, ...rest: string[]): never {
  throw new GitError([
    main.includes('\x01') ? main : C('e', main),
    ...rest.map((x) => (x.includes('\x01') || x === '' ? x : M(x))),
  ]);
}
