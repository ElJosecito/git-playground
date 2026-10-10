// Output markup encoding ported from the oracle: `\x01kind\x02text\x03`
// segments are the wire format handed to the UI for colored terminal lines.
export function C(kind: string, text: string): string {
  return '\x01' + kind + '\x02' + text + '\x03';
}

/** Shorthand for the common "muted" (`m`) segment kind. */
export function M(text: string): string {
  return C('m', text);
}
