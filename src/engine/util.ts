// Small generic helpers shared across the engine, ported from the top of
// `design-handoff/git-engine.js`.

/** Deep clone via JSON round-trip — matches the oracle's `cl()` exactly. */
export function cl<T>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T;
}

/** Union of keys across any number of objects, sorted — matches oracle `keys()`. */
export function keys(...os: (Record<string, unknown> | null | undefined)[]): string[] {
  return [...new Set(os.flatMap((o) => Object.keys(o || {})))].sort();
}

export function short(h: string | null | undefined): string {
  return h ? h.slice(0, 7) : '';
}

export function pl(n: number, a: string, b: string): string {
  return n + ' ' + (n === 1 ? a : b);
}

/** True when every key (across both objects) holds an equal value. */
export function same(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return keys(a, b).every((k) => a[k] === b[k]);
}

/** Sets `o[k]=v`, or deletes the key when `v` is null/undefined — matches oracle `setK()`. */
export function setK<T>(o: Record<string, T>, k: string, v: T | null | undefined): void {
  if (v === undefined || v === null) delete o[k];
  else o[k] = v;
}

/** Levenshtein edit distance — matches oracle `lev()`. */
export function lev(a: string, b: string): number {
  const d: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    d[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      d[i]![j] = i ? Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)) : j;
    }
  }
  return d[a.length]![b.length]!;
}

/** Closest match within edit distance < 3 — matches oracle `cercano()`. */
export function cercano(x: string, list: string[]): string | null {
  let best: string | null = null;
  let bd = 3;
  for (const c of list) {
    const d = lev(x, c);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}
