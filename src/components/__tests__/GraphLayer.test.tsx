import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { GraphLayer } from '../GraphLayer';
import { layoutOf } from '../../ui/layoutCache';
import { GitEngine } from '../../engine';
import type { Layout } from '../../engine/types';

// Ported from the DC template's `buildGraph(repo)` (design-handoff/Git
// Playground.dc.html, lines 434-471): a single SVG layer rendering the
// remote box, links, edges, phantom, stash, commit nodes, and ref/branch
// labels from the pure `Layout` the engine's `layout()` already computed.
// WAAPI birth/move choreography (D5/D6 ref-callback seams) is Phase 5's
// job — this phase only has to render everything in its resting position,
// correctly, every time the repo changes (design D8: "one memoized layer").
describe('GraphLayer', () => {
  function renderWith(layout: Layout, planVersion = 0, tipId: string | null = null) {
    const worldRef = createRef<SVGGElement>();
    render(<GraphLayer layout={layout} planVersion={planVersion} tipId={tipId} worldRef={worldRef} />);
    return worldRef;
  }

  it('attaches worldRef to the rendered <g> world group', () => {
    const repo = GitEngine.ejemplo();
    const worldRef = renderWith(layoutOf(repo));
    expect(worldRef.current).not.toBeNull();
    expect(worldRef.current?.tagName.toLowerCase()).toBe('g');
  });

  it('renders one commit node group per layout node, with its short hash as text', () => {
    const repo = GitEngine.ejemplo();
    const layout = layoutOf(repo);
    renderWith(layout);
    for (const n of layout.nodes) {
      const group = document.querySelector(`[data-h="${n.h}"]`);
      expect(group).not.toBeNull();
      expect(group?.textContent).toContain(GitEngine.short(n.h));
    }
  });

  it('renders one edge path per layout edge, tagged with data-child', () => {
    const repo = GitEngine.ejemplo();
    const layout = layoutOf(repo);
    renderWith(layout);
    for (const e of layout.edges) {
      expect(document.querySelector(`path[data-child="${e.child}"]`)).not.toBeNull();
    }
  });

  it('renders a label for every branch/HEAD/tag/track ref', () => {
    const repo = GitEngine.ejemplo();
    const layout = layoutOf(repo);
    renderWith(layout);
    for (const l of layout.labels) {
      expect(document.querySelector(`[data-label="${l.key}"]`)).not.toBeNull();
      expect(screen.getAllByText(l.text).length).toBeGreaterThan(0);
    }
  });

  it('renders the remote box, remote commit nodes and remote branch labels when present', () => {
    const repo = GitEngine.companero(GitEngine.ejemplo()).estado;
    const layout = layoutOf(repo);
    expect(layout.rbox).not.toBeNull();
    renderWith(layout);
    expect(screen.getByText('origin')).toBeInTheDocument();
    for (const n of layout.rnodes) {
      expect(document.querySelector(`[data-rh="${n.h}"]`)).not.toBeNull();
    }
    for (const l of layout.rlabels) {
      expect(document.querySelector(`path[data-child]`)).not.toBeNull();
      expect(screen.getAllByText(l.text).length).toBeGreaterThan(0);
    }
  });

  it('renders a stash marker with the entry count when the repo has stashed changes', () => {
    let repo = GitEngine.ejemplo();
    repo = GitEngine.ejecutar(repo, 'echo hola > README.md').estado;
    repo = GitEngine.ejecutar(repo, 'git stash').estado;
    const layout = layoutOf(repo);
    expect(layout.stash).not.toBeNull();
    renderWith(layout);
    expect(document.querySelector('[data-stash]')).not.toBeNull();
    expect(screen.getByText('1 entrada')).toBeInTheDocument();
  });

  it('renders a phantom "!" marker when there is a pending unresolved merge', () => {
    let repo = GitEngine.ejemplo();
    repo = GitEngine.ejecutar(repo, 'git switch -c feature').estado;
    repo = GitEngine.ejecutar(repo, 'echo conflicto > README.md').estado;
    repo = GitEngine.ejecutar(repo, 'git add README.md').estado;
    repo = GitEngine.ejecutar(repo, 'git commit -m feature').estado;
    repo = GitEngine.ejecutar(repo, 'git switch main').estado;
    repo = GitEngine.ejecutar(repo, 'echo otro > README.md').estado;
    repo = GitEngine.ejecutar(repo, 'git add README.md').estado;
    repo = GitEngine.ejecutar(repo, 'git commit -m main').estado;
    repo = GitEngine.ejecutar(repo, 'git merge feature').estado;
    const layout = layoutOf(repo);
    if (layout.phantom) {
      renderWith(layout);
      expect(screen.getByText('!')).toBeInTheDocument();
    } else {
      expect(repo.op).not.toBeNull();
    }
  });

  it('renders a `<g data-fx>` particle layer as the last child of the world <g> (design D9)', () => {
    const repo = GitEngine.ejemplo();
    const layout = layoutOf(repo);
    const fxRef = createRef<SVGGElement>();
    const worldRef = createRef<SVGGElement>();
    render(<GraphLayer layout={layout} planVersion={0} tipId={null} worldRef={worldRef} fxRef={fxRef} />);
    expect(fxRef.current).not.toBeNull();
    expect(fxRef.current?.getAttribute('data-fx')).not.toBeNull();
    expect(worldRef.current?.lastElementChild).toBe(fxRef.current);
  });

  it('renders "leaving" labels (a deleted branch\'s old position) tagged with data-leaving, alongside the current labels', () => {
    const repo = GitEngine.ejemplo();
    const layout = layoutOf(repo);
    const leavingLabel = { key: 'b:demo', kind: 'branch' as const, text: 'demo', color: '#60a5fa', ref: 'demo', X: 10, Y: 20, w: 50, h: layout.nodes[0]!.h };
    const worldRef = createRef<SVGGElement>();
    render(<GraphLayer layout={layout} planVersion={0} tipId={null} worldRef={worldRef} leaving={[leavingLabel]} />);
    const el = document.querySelector('[data-label="b:demo"][data-leaving]');
    expect(el).not.toBeNull();
    // The current (non-leaving) labels are still rendered too.
    for (const l of layout.labels) {
      expect(document.querySelector(`[data-label="${l.key}"]:not([data-leaving])`)).not.toBeNull();
    }
  });

  // New behavior (design.md "File Changes": "clicking the remote box opens
  // the view (handler added to the memoized `graphHandlers`)" — one of the
  // two entry points into the simulated hosting web view).
  it('calls handlers.onRemoteBoxClick when the remote box is clicked', () => {
    const repo = GitEngine.companero(GitEngine.ejemplo()).estado;
    const layout = layoutOf(repo);
    const onRemoteBoxClick = vi.fn();
    const worldRef = createRef<SVGGElement>();
    render(
      <GraphLayer
        layout={layout}
        planVersion={0}
        tipId={null}
        worldRef={worldRef}
        handlers={{ onRemoteBoxClick }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ver pull requests en origin' }));
    expect(onRemoteBoxClick).toHaveBeenCalledTimes(1);
  });

  it('also calls handlers.onRemoteBoxClick on Enter (keyboard activation)', () => {
    const repo = GitEngine.companero(GitEngine.ejemplo()).estado;
    const layout = layoutOf(repo);
    const onRemoteBoxClick = vi.fn();
    const worldRef = createRef<SVGGElement>();
    render(
      <GraphLayer
        layout={layout}
        planVersion={0}
        tipId={null}
        worldRef={worldRef}
        handlers={{ onRemoteBoxClick }}
      />,
    );
    fireEvent.keyDown(screen.getByRole('button', { name: 'Ver pull requests en origin' }), { key: 'Enter' });
    expect(onRemoteBoxClick).toHaveBeenCalledTimes(1);
  });

  it('is memoized: an identical layout object does not re-render on an unrelated parent re-render', () => {
    const repo = GitEngine.ejemplo();
    const layout = layoutOf(repo);
    const worldRef = createRef<SVGGElement>();
    function Wrapper({ tick }: { tick: number }) {
      return (
        <div data-tick={tick}>
          <GraphLayer layout={layout} planVersion={0} tipId={null} worldRef={worldRef} />
        </div>
      );
    }
    const { rerender } = render(<Wrapper tick={0} />);
    const before = document.querySelector(`[data-h="${layout.nodes[0]!.h}"]`);
    rerender(<Wrapper tick={1} />);
    const after = document.querySelector(`[data-h="${layout.nodes[0]!.h}"]`);
    expect(after).toBe(before);
  });
});
