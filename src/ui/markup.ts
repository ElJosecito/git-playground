// Decodes the oracle's output markup wire format into colored terminal
// segments. 1:1 port of the DC template's inline `segColor`/`parseLine`
// helpers (design-handoff/Git Playground.dc.html, lines 227-230).
//
// The oracle encodes colored runs as `\x01kind\x02text\x03`. `kind` is either
// a short style key (see KIND_COLOR below) or a literal `c:<hexColor>` for
// branch-colored text (used for branch names, see design-handoff/git-engine.js
// callers of `C('c:'+colorRama(...), name)`).

export interface Seg {
  t: string;
  c: string;
  fw: number;
}

const MARKUP_RE = /\x01([^\x02]*)\x02([^\x03]*)\x03/g;

const KIND_COLOR: Record<string, string> = {
  g: 'var(--t-green)',
  r: 'var(--t-red)',
  y: 'var(--t-yellow)',
  w: 'var(--warning)',
  e: 'var(--danger)',
  m: 'var(--text-muted)',
  h: 'var(--t-cyan)',
  cy: 'var(--t-cyan)',
  bold: 'var(--text-primary)',
};

/** Resolves a markup `kind` key to its CSS color value. */
export function segColor(kind: string): string {
  if (kind.startsWith('c:')) return kind.slice(2);
  return KIND_COLOR[kind] ?? 'var(--text-primary)';
}

/** Parses one line of oracle output markup into renderable segments. */
export function parseLine(str: string): Seg[] {
  const segs: Seg[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MARKUP_RE.lastIndex = 0;
  while ((m = MARKUP_RE.exec(str))) {
    if (m.index > last) segs.push({ t: str.slice(last, m.index), c: 'var(--text-primary)', fw: 400 });
    const kind = m[1]!;
    segs.push({ t: m[2]!, c: segColor(kind), fw: kind === 'bold' ? 600 : 400 });
    last = MARKUP_RE.lastIndex;
  }
  if (last < str.length) segs.push({ t: str.slice(last), c: 'var(--text-primary)', fw: 400 });
  if (!segs.length) segs.push({ t: ' ', c: 'inherit', fw: 400 });
  return segs;
}

/** A plain-or-monospace run, used for toast text and the conflict-resolver
 * hint (backtick-delimited runs render in `'Geist Mono',monospace`). 1:1
 * port of the DC template's inline `codeSegs(text,color)` helper. */
export interface CodeSeg {
  t: string;
  ff: string;
  c: string;
  fs: string;
}

/** Splits `text` on backtick boundaries into alternating plain/monospace
 * segments. Odd-indexed runs (inside backticks) are always monospace,
 * primary-text-colored, 12px; even-indexed runs keep `color` (default
 * `inherit`) at inherited size/family. */
export function codeSegs(text: string, color?: string): CodeSeg[] {
  return text.split('`').map((t, i) =>
    i % 2
      ? { t, ff: "'Geist Mono',monospace", c: 'var(--text-primary)', fs: '12px' }
      : { t, ff: 'inherit', c: color || 'inherit', fs: 'inherit' },
  );
}
