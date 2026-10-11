// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgressProvider, useProgress } from '../ProgressContext';
import { LEVELS_STORAGE_KEY } from '../schema';
import type { LevelUnlockMeta } from '../unlocks';

const LEVELS: LevelUnlockMeta[] = [
  { id: 'w1-01', world: 1, order: 1 },
  { id: 'w1-02', world: 1, order: 2 },
  { id: 'w2-01', world: 2, order: 1 },
];

function Probe() {
  const { unlocked, store, recordCompletion, resetProgress } = useProgress();
  return (
    <div>
      <ul>
        {LEVELS.map((l) => (
          <li key={l.id} data-testid={l.id}>
            {l.id}: {unlocked.has(l.id) ? 'unlocked' : 'locked'}
          </li>
        ))}
      </ul>
      <div data-testid="stars">{store.completed['w1-01']?.stars ?? 'none'}</div>
      <button onClick={() => recordCompletion('w1-01', { stars: 3, count: 2 })}>Complete w1-01</button>
      <button onClick={resetProgress}>Reset</button>
    </div>
  );
}

describe('ProgressContext (ProgressProvider / useProgress)', () => {
  beforeEach(() => localStorage.clear());

  it('throws when useProgress is called with no ancestor ProgressProvider', () => {
    function Bare() {
      useProgress();
      return null;
    }
    expect(() => render(<Bare />)).toThrow(/ProgressProvider/);
  });

  it('computes unlocks from the loaded store and the provided level metadata', () => {
    render(
      <ProgressProvider levels={LEVELS}>
        <Probe />
      </ProgressProvider>,
    );
    expect(screen.getByTestId('w1-01')).toHaveTextContent('unlocked');
    expect(screen.getByTestId('w1-02')).toHaveTextContent('locked');
  });

  it('recordCompletion updates the store, persists it, and recomputes unlocks', async () => {
    const user = userEvent.setup();
    render(
      <ProgressProvider levels={LEVELS}>
        <Probe />
      </ProgressProvider>,
    );
    await user.click(screen.getByText('Complete w1-01'));
    expect(screen.getByTestId('stars')).toHaveTextContent('3');
    expect(screen.getByTestId('w1-02')).toHaveTextContent('unlocked');
    const saved = JSON.parse(localStorage.getItem(LEVELS_STORAGE_KEY)!);
    expect(saved.completed['w1-01'].stars).toBe(3);
  });

  it('resetProgress clears the ledger and re-locks everything but the first level', async () => {
    const user = userEvent.setup();
    render(
      <ProgressProvider levels={LEVELS}>
        <Probe />
      </ProgressProvider>,
    );
    await user.click(screen.getByText('Complete w1-01'));
    expect(screen.getByTestId('w1-02')).toHaveTextContent('unlocked');
    await user.click(screen.getByText('Reset'));
    expect(screen.getByTestId('w1-02')).toHaveTextContent('locked');
    expect(localStorage.getItem(LEVELS_STORAGE_KEY)).toBeNull();
  });

  it('boots from a previously saved gitpg:levels:v1 ledger', () => {
    localStorage.setItem(LEVELS_STORAGE_KEY, JSON.stringify({ v: 1, completed: { 'w1-01': { stars: 2, bestCount: 5, at: 1 } }, inProgress: {} }));
    render(
      <ProgressProvider levels={LEVELS}>
        <Probe />
      </ProgressProvider>,
    );
    expect(screen.getByTestId('stars')).toHaveTextContent('2');
    expect(screen.getByTestId('w1-02')).toHaveTextContent('unlocked');
  });

  it('exposes saveSnapshot/clearSnapshot/snapshotFor for an in-progress attempt', () => {
    let api: ReturnType<typeof useProgress> | null = null;
    function Capture() {
      api = useProgress();
      return null;
    }
    render(
      <ProgressProvider levels={LEVELS}>
        <Capture />
      </ProgressProvider>,
    );
    act(() => {
      api!.saveSnapshot('w1-02', { levelVersion: 1, repo: { v: 1 } as never, hist: [], hintsUsed: 0, solutionShown: false, count: 1 });
    });
    expect(api!.snapshotFor('w1-02', 1)).not.toBeNull();
    act(() => {
      api!.clearSnapshot('w1-02');
    });
    expect(api!.snapshotFor('w1-02', 1)).toBeNull();
  });
});
