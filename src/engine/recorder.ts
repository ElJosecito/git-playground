// Command output/event recorder, ported from the oracle's `mkR()`. Every
// `GIT.<cmd>` / `shell` handler writes to one of these per invocation.
import type { GitEvent, RepoState } from './types';

/** Shared signature for every `GIT.<cmd>` / shell command handler. */
export type CommandFn = (s: RepoState, a: string[], r: Recorder) => void;

export interface Recorder {
  salida: string[];
  eventos: GitEvent[];
  accion: { tipo: 'editar'; archivo: string } | null;
  out(...l: string[]): void;
  ev(type: GitEvent['type'], d?: Record<string, unknown>): void;
}

export function mkR(): Recorder {
  return {
    salida: [],
    eventos: [],
    accion: null,
    out(...l: string[]): void {
      for (const x of l) this.salida.push(...String(x).split('\n'));
    },
    ev(type: GitEvent['type'], d?: Record<string, unknown>): void {
      this.eventos.push({ type, ...d } as GitEvent);
    },
  };
}
