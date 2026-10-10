// Shell-style command-line tokenizer, ported from `design-handoff/git-engine.js`.
// Handles quoted segments and merges a bare `>` followed by another `>`
// into a single `>>` redirection token. Returns null for unterminated quotes.
export function tokens(str: string): string[] | null {
  const out: string[] = [];
  let cur = '';
  let q: string | null = null;
  let has = false;
  const push = (): void => {
    if (cur || has) {
      out.push(cur);
      cur = '';
      has = false;
    }
  };
  for (const ch of str) {
    if (q) {
      if (ch === q) q = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      q = ch;
      has = true;
    } else if (/\s/.test(ch)) {
      push();
    } else if (ch === '>') {
      push();
      if (out[out.length - 1] === '>') out[out.length - 1] = '>>';
      else out.push('>');
    } else {
      cur += ch;
    }
  }
  if (q) return null;
  push();
  return out;
}
