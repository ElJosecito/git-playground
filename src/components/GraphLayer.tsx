// The single memoized SVG layer rendering the commit graph (design D8: "one
// layer... memo(GraphLayer) takes deps [layout, planVersion, tipId,
// handlers]. Sub-parts are plain render functions, not nested components.").
// 1:1 port of the DC template's `buildGraph(repo)`
// (design-handoff/Git Playground.dc.html, lines 434-471).
//
// WAAPI birth/move choreography (design D5/D6) is Phase 5's job. This phase
// renders everything in its resting position, correctly, every time the
// repo changes — the `refs` prop below is the seam Phase 5 plugs
// `useChoreography`'s ref callbacks into (`nodeRef`/`rnodeRef`/`edgeRef`/
// `labelRef`/`pulseRef`/`stashRef` in the oracle), without this file
// changing shape again. Every `data-*` attribute the oracle's choreography
// queries by (design D15) is already present.
import { memo } from 'react';
import type { KeyboardEvent, Ref } from 'react';
import { lighten } from '../ui/color';
import { short } from '../engine/util';
import type { Hash, LLabel, Layout, Point } from '../engine/types';
import styles from './GraphLayer.module.css';

export type HoverKind = 'commit' | 'rcommit' | 'branch' | 'rbranch' | 'track' | 'tag' | 'head' | 'stash' | 'phantom';

export interface GraphRefs {
  node?: Ref<SVGGElement>;
  rnode?: Ref<SVGGElement>;
  edge?: Ref<SVGPathElement>;
  label?: Ref<SVGGElement>;
  /** A plain callback ref (not `Ref<T>`) because it attaches to both
   * `<circle>` (node ripple, phantom) and `<path>` (phantom edge) elements. */
  pulse?: (el: Element | null) => void;
  stash?: Ref<SVGGElement>;
}

export interface GraphHandlers {
  onHover?(kind: HoverKind, id: string, pos: Point, r: number): void;
  onUnhover?(): void;
  onNodeKeyDown?(e: KeyboardEvent<SVGGElement>, hash: Hash): void;
  /** Clicking (or Enter/Space on) the remote box opens the simulated
   * hosting web view — one of its two entry points (design.md "File
   * Changes"), the other being `ActionBar`'s "Pull requests (n)" button. */
  onRemoteBoxClick?(): void;
}

export interface GraphLayerProps {
  layout: Layout;
  /** Bumped by `useChoreography` to force a re-render once a leaving
   * label's exit animation finishes (oracle's `gv`) — see `leaving` below. */
  planVersion: number;
  tipId: Hash | null;
  worldRef: Ref<SVGGElement>;
  refs?: GraphRefs;
  handlers?: GraphHandlers;
  /** `useChoreography`'s `<g data-fx>` particle layer (design D9): rendered
   * as the LAST child of the world `<g>`, always empty — `particle()`
   * appends/removes its own `<circle>` elements into it imperatively, so
   * React never has to reconcile them. */
  fxRef?: Ref<SVGGElement>;
  /** Labels present in the PREVIOUS layout but not the current one (oracle's
   * `P.leaving`, e.g. a just-deleted branch) — rendered one last time with
   * `data-leaving` set so `useChoreography`'s `labelRef` can play their exit
   * animation before `finishAll()`/the 420ms timer clears them (oracle:
   * `L.labels.concat(P.leaving.map(l=>({...l,leaving:true})))`). */
  leaving?: readonly LLabel[];
}

function evH(handlers: GraphHandlers | undefined, kind: HoverKind, id: string, pos: Point, r: number) {
  return {
    onMouseEnter: () => handlers?.onHover?.(kind, id, pos, r),
    onMouseLeave: () => handlers?.onUnhover?.(),
    onFocus: () => handlers?.onHover?.(kind, id, pos, r),
    onBlur: () => handlers?.onUnhover?.(),
  };
}

function GraphLayerComponent({ layout: L, tipId, worldRef, refs, handlers, fxRef, leaving = [] }: GraphLayerProps) {
  const tipH = tipId;

  return (
    <svg width="100%" height="100%" className={styles.svg}>
      <g ref={worldRef}>
        {L.rbox && (
          <g
            key="rbox"
            role={handlers?.onRemoteBoxClick ? 'button' : undefined}
            tabIndex={handlers?.onRemoteBoxClick ? 0 : undefined}
            aria-label={handlers?.onRemoteBoxClick ? 'Ver pull requests en origin' : undefined}
            className={styles.remoteBoxGroup}
            onClick={handlers?.onRemoteBoxClick}
            onKeyDown={(e) => {
              if (!handlers?.onRemoteBoxClick) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlers.onRemoteBoxClick();
              }
            }}
          >
            <rect
              x={L.rbox.x0}
              y={L.rbox.y0}
              width={L.rbox.x1 - L.rbox.x0}
              height={L.rbox.y1 - L.rbox.y0}
              rx={18}
              style={{ fill: 'var(--remote-fill)', stroke: 'var(--border-strong)', strokeDasharray: '5 6', strokeWidth: 1.2 }}
            />
            <text x={L.rbox.x0 + 14} y={L.rbox.y0 - 10} className={styles.remoteBoxLabel}>
              origin
            </text>
            <text x={L.rbox.x0 + 70} y={L.rbox.y0 - 10} className={styles.remoteBoxCaption}>
              remoto simulado
            </text>
          </g>
        )}

        {L.redges.map((e) => (
          <path
            key={e.id}
            d={e.d}
            data-child={e.child}
            data-remote={1}
            ref={refs?.edge}
            className={styles.remoteEdge}
            style={{ stroke: e.color }}
          />
        ))}

        {L.rnodes.map((n) => (
          <g
            key={`r${n.h}`}
            data-rh={n.h}
            ref={refs?.rnode}
            className={styles.rnode}
            style={{ transform: `translate(${n.X}px,${n.Y}px)` }}
            {...evH(handlers, 'rcommit', n.h, n, 11)}
          >
            <circle r={20} fill="transparent" />
            <g data-inner={1} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
              <circle r={11} style={{ fill: n.color, fillOpacity: 0.35, stroke: n.color, strokeWidth: 1.5, strokeDasharray: '3 2' }} />
            </g>
          </g>
        ))}

        {L.rlabels.map((l) => (
          <g
            key={l.key}
            style={{ transform: `translate(${l.X}px,${l.Y}px)` }}
            {...evH(handlers, 'rbranch', l.ref ?? '', { X: l.X, Y: l.Y }, 10)}
          >
            <rect
              x={-l.w / 2}
              y={-10}
              width={l.w}
              height={20}
              rx={6}
              style={{ fill: l.color, fillOpacity: 0.1, stroke: l.color, strokeOpacity: 0.35, strokeDasharray: '3 2' }}
            />
            <text y={4} textAnchor="middle" className={styles.remoteLabelText} style={{ fill: l.color, opacity: 0.8 }}>
              {l.text}
            </text>
          </g>
        ))}

        {L.links.map((e) => (
          <path
            key={e.id}
            d={e.d}
            data-child={e.child}
            ref={refs?.edge}
            className={styles.link}
            style={{ stroke: e.kind === 'revert' ? 'var(--text-secondary)' : 'var(--text-muted)' }}
          />
        ))}

        {L.edges.map((e) => (
          <path
            key={e.id}
            d={e.d}
            data-child={e.child}
            ref={refs?.edge}
            className={styles.edge}
            style={{
              stroke: e.ghost ? 'var(--text-muted)' : e.color,
              opacity: e.ghost ? 0.35 : 0.9,
              strokeDasharray: e.ghost ? '4 5' : 'none',
            }}
          />
        ))}

        {L.phantom && (
          <>
            {L.phantom.edges.map((e) => <path key={e.id} d={e.d} ref={refs?.pulse} className={styles.phantomEdge} />)}
            <g
              key="phantom"
              className={styles.phantomGroup}
              style={{ transform: `translate(${L.phantom.P.X}px,${L.phantom.P.Y}px)` }}
              {...evH(handlers, 'phantom', 'x', L.phantom.P, 16)}
            >
              <circle r={24} fill="transparent" />
              <circle r={16} ref={refs?.pulse} style={{ fill: 'rgba(248,113,113,0.12)', stroke: 'var(--danger)', strokeWidth: 2, strokeDasharray: '3 3' }} />
              <text y={5} className={styles.phantomText}>
                !
              </text>
            </g>
          </>
        )}

        {L.stash && (
          <g
            key="stash"
            data-stash={1}
            ref={refs?.stash}
            className={styles.stashGroup}
            style={{ transform: `translate(${L.stash.X}px,${L.stash.Y}px)` }}
            {...evH(handlers, 'stash', 's', L.stash, 24)}
          >
            <g data-inner={1} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
              <rect x={-48} y={-22} width={96} height={44} rx={10} style={{ fill: 'var(--surface-solid)', stroke: 'var(--border-strong)', strokeWidth: 1 }} />
              <rect
                x={-42}
                y={-28}
                width={84}
                height={8}
                rx={3}
                style={{ fill: 'var(--surface-solid)', stroke: 'var(--border)', display: L.stash.n > 1 ? 'inline' : 'none' }}
              />
              <text y={-2} className={styles.stashLabel}>
                stash
              </text>
              <text y={13} className={styles.stashCaption}>
                {L.stash.n === 1 ? '1 entrada' : `${L.stash.n} entradas`}
              </text>
            </g>
          </g>
        )}

        {L.nodes.map((n) => {
          const g = n.ghost;
          const r = n.merge ? 16 : 14;
          return (
            <g
              key={n.h}
              data-h={n.h}
              ref={refs?.node}
              tabIndex={0}
              role="button"
              aria-label={`Commit ${n.n}: ${n.msg}${g ? ' (huérfano)' : ''}`}
              onKeyDown={(e) => handlers?.onNodeKeyDown?.(e, n.h)}
              className={styles.node}
              style={{ transform: `translate(${n.X}px,${n.Y}px)` }}
              {...evH(handlers, 'commit', n.h, n, r)}
            >
              <circle r={28} fill="transparent" />
              {/* No ref callback here: the oracle's `data-ripple` circle is
                  animated on demand by `pulseHead()` via a live
                  `querySelector`, not a mount-time ref (`pulseRef` is only
                  used for the phantom marker's continuous ping, below). */}
              <circle
                data-ripple={1}
                r={14}
                style={{ fill: 'none', stroke: g ? 'var(--text-muted)' : n.color, strokeWidth: 2, opacity: 0, transformBox: 'fill-box', transformOrigin: 'center' }}
              />
              <g data-inner={1} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                {n.merge && (
                  <circle r={21} style={{ fill: 'none', stroke: g ? 'var(--text-muted)' : n.color, strokeWidth: 1.5, opacity: g ? 0.3 : 0.85, transition: 'opacity 450ms, stroke 450ms' }} />
                )}
                <circle
                  r={r}
                  style={{
                    fill: g ? 'transparent' : n.color,
                    fillOpacity: g ? 0 : n.dim ? 0.45 : 1,
                    stroke: g ? 'var(--text-secondary)' : lighten(n.color, 0.35),
                    strokeWidth: tipH === n.h ? 3 : 2,
                    strokeDasharray: g ? '3 3' : 'none',
                    opacity: g ? 0.35 : 1,
                    transition: 'fill-opacity 450ms, opacity 450ms, stroke 450ms',
                  }}
                />
              </g>
              <text y={r + 18} className={styles.nodeLabel} style={{ opacity: g ? 0.5 : 1 }}>
                {short(n.h)}
              </text>
            </g>
          );
        })}

        {L.labels.map((l) => renderLabel(l, refs, handlers, false))}
        {leaving.map((l) => renderLabel(l, refs, handlers, true))}

        {/* design D9: an always-empty particle layer, last child of the
            world <g>, that `useChoreography`'s `particle()` appends
            <circle> elements into imperatively. */}
        <g data-fx={1} ref={fxRef} />
      </g>
    </svg>
  );
}

function renderLabel(l: LLabel, refs: GraphRefs | undefined, handlers: GraphHandlers | undefined, isLeaving: boolean) {
  const isH = l.kind === 'head';
  const det = l.detached;
  let fill: string;
  let stroke: string;
  let txt: string;
  let fo = 0.15;
  let so = 0.45;
  let dash = 'none';
  let fw = 500;
  let filter = 'none';
  if (isH) {
    fill = det ? 'var(--warning)' : 'var(--head)';
    stroke = 'none';
    txt = det ? '#1A1405' : 'var(--head-ink)';
    fo = 1;
    fw = 600;
  } else if (l.kind === 'tag') {
    fill = 'var(--text-secondary)';
    stroke = 'var(--text-secondary)';
    txt = 'var(--text-primary)';
    fo = 0.12;
    so = 0.35;
  } else if (l.kind === 'track') {
    fill = l.color!;
    stroke = l.color!;
    txt = l.color!;
    fo = 0.04;
    so = 0.4;
    dash = '3 2';
    fw = 400;
  } else {
    fill = l.color!;
    stroke = l.color!;
    txt = l.color!;
    if (l.current) {
      fo = 0.24;
      so = 0.9;
      fw = 600;
      filter = `drop-shadow(0 0 6px ${l.color}66)`;
    } else {
      fo = 0.13;
      so = 0.35;
    }
  }
  const hoverKind: HoverKind = isH ? 'head' : l.kind === 'track' ? 'track' : l.kind === 'tag' ? 'tag' : 'branch';
  return (
    <g
      key={(isLeaving ? 'x' : '') + l.key}
      data-label={l.key}
      data-leaving={isLeaving ? 1 : undefined}
      ref={refs?.label}
      className={styles.refLabel}
      style={{ transform: `translate(${l.X}px,${l.Y}px)`, pointerEvents: isLeaving ? 'none' : 'auto' }}
      {...evH(handlers, hoverKind, l.ref ?? 'HEAD', { X: l.X, Y: l.Y }, 10)}
    >
      <g data-inner={1} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        {isH && <line x1={0} x2={0} y1={10} y2={15} style={{ stroke: det ? 'var(--warning)' : 'var(--head)', strokeWidth: 2 }} />}
        <rect x={-l.w / 2} y={-10} width={l.w} height={20} rx={6} style={{ fill, fillOpacity: fo, stroke, strokeOpacity: so, strokeDasharray: dash, filter }} />
        {l.kind === 'tag' && (
          <rect x={-l.w / 2 + 9} y={-3} width={6} height={6} transform={`rotate(45 ${-l.w / 2 + 12} 0)`} style={{ fill: 'var(--text-secondary)' }} />
        )}
        <text
          x={l.kind === 'tag' ? 6 : 0}
          y={4}
          className={styles.refLabelText}
          style={{ fontWeight: fw, fill: txt, opacity: l.kind === 'branch' && !l.current ? 0.85 : 1 }}
        >
          {l.text}
        </text>
      </g>
    </g>
  );
}

export const GraphLayer = memo(GraphLayerComponent);
