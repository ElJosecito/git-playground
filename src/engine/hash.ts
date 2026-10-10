// Bit-exact port of the oracle's `hashStr` (design-handoff/git-engine.js).
// Same `Math.imul` rounds and unsigned right-shifts — any deviation here
// desyncs every commit hash downstream, so this is intentionally a literal
// transcription rather than a "cleaner" rewrite.
export function hashStr(str: string): string {
  let out = '';
  for (let s = 0; s < 5; s++) {
    let x = (0x811c9dc5 ^ Math.imul(s + 1, 0x9e3779b1)) >>> 0;
    for (let i = 0; i < str.length; i++) {
      x ^= str.charCodeAt(i);
      x = Math.imul(x, 16777619);
    }
    x ^= x >>> 13;
    x = Math.imul(x, 0x5bd1e995);
    x ^= x >>> 15;
    out += (x >>> 0).toString(16).padStart(8, '0');
  }
  return out;
}
