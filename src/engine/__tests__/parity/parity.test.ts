import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadOriginal, type OracleGitEngine } from './loadOriginal';
import { corpus, type CorpusCase } from './corpus';
import type { CommandResult, GitEvent, RepoState } from '../../types';
// The port facade does not exist until task 2.10 — this import is the
// intentional RED driver for the whole parity harness through Phase 1 and
// most of Phase 2. It starts resolving once src/engine/index.ts lands.
import { GitEngine as port } from '../../index';

const FROZEN_T0 = Date.UTC(2026, 9, 6, 9, 12);

/** Strips fields the spec calls out as non-deterministic before comparison. */
function normalize(estado: RepoState): unknown {
  const clone = JSON.parse(JSON.stringify(estado)) as RepoState;
  for (const hash of Object.keys(clone.commits)) {
    clone.commits[hash]!.t = 0;
  }
  return clone;
}

function assertResultParity(oracleRes: CommandResult, portRes: CommandResult): void {
  expect(portRes.salida).toEqual(oracleRes.salida);
  expect(portRes.eventos).toEqual(oracleRes.eventos);
  expect(portRes.error).toEqual(oracleRes.error);
  expect(normalize(portRes.estado)).toEqual(normalize(oracleRes.estado));
  expect(JSON.stringify(normalize(portRes.estado))).toEqual(JSON.stringify(normalize(oracleRes.estado)));
}

function seedBoth(oracle: OracleGitEngine, seed: CorpusCase['seed']): { oracleState: RepoState; portState: RepoState } {
  const oracleState = oracle[seed]();
  const portState = port[seed]();
  return { oracleState, portState };
}

describe('golden parity against oracle (design-handoff/git-engine.js)', () => {
  let oracle: OracleGitEngine;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FROZEN_T0);
    oracle = loadOriginal();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sanity: TZ is frozen to UTC for deterministic es-ES dates', () => {
    expect(new Date().getTimezoneOffset()).toBe(0);
  });

  for (const testCase of corpus) {
    it(testCase.label, () => {
      let { oracleState, portState } = seedBoth(oracle, testCase.seed);
      expect(normalize(portState)).toEqual(normalize(oracleState));

      let lastOracleEventos: GitEvent[] = [];
      let lastPortEventos: GitEvent[] = [];

      for (const step of testCase.steps) {
        if ('cmd' in step) {
          const oracleRes = oracle.ejecutar(oracleState, step.cmd);
          const portRes = port.ejecutar(portState, step.cmd);
          assertResultParity(oracleRes, portRes);
          oracleState = oracleRes.estado;
          portState = portRes.estado;
          lastOracleEventos = oracleRes.eventos;
          lastPortEventos = portRes.eventos;
        } else if ('escribir' in step) {
          const oracleRes = oracle.escribir(oracleState, step.escribir.file, step.escribir.text);
          const portRes = port.escribir(portState, step.escribir.file, step.escribir.text);
          assertResultParity(oracleRes, portRes);
          oracleState = oracleRes.estado;
          portState = portRes.estado;
          lastOracleEventos = oracleRes.eventos;
          lastPortEventos = portRes.eventos;
        } else if ('resolver' in step) {
          const oracleRes = oracle.resolver(oracleState, step.resolver.file, step.resolver.mode);
          const portRes = port.resolver(portState, step.resolver.file, step.resolver.mode);
          assertResultParity(oracleRes, portRes);
          oracleState = oracleRes.estado;
          portState = portRes.estado;
          lastOracleEventos = oracleRes.eventos;
          lastPortEventos = portRes.eventos;
        } else if ('companero' in step) {
          const oracleRes = oracle.companero(oracleState);
          const portRes = port.companero(portState);
          assertResultParity(oracleRes, portRes);
          oracleState = oracleRes.estado;
          portState = portRes.estado;
          lastOracleEventos = oracleRes.eventos;
          lastPortEventos = portRes.eventos;
        } else {
          // checkpoint: compare explicar()/layout()/completar() at this point.
          const oracleExplain = oracle.explicar(lastOracleEventos, oracleState);
          const portExplain = port.explicar(lastPortEventos, portState);
          expect(portExplain).toEqual(oracleExplain);

          const oracleLayout = oracle.layout(oracleState);
          const portLayout = port.layout(portState);
          expect(portLayout).toEqual(oracleLayout);
          expect(JSON.stringify(portLayout)).toEqual(JSON.stringify(oracleLayout));

          const line = step.checkpoint.completarLinea ?? 'git ';
          const oracleCompletion = oracle.completar(oracleState, line);
          const portCompletion = port.completar(portState, line);
          expect(portCompletion).toEqual(oracleCompletion);
        }
      }
    });
  }
});
