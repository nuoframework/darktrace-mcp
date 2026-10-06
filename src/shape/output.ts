// Presentation defense only: visible natural-language instructions remain untrusted.
// Explicit audited ranges, independent of the runtime's Unicode property tables.
// IR-01 adds variation selectors and the selected format/line/Hangul controls.
// AD2-04 adds the remaining assigned Cf/default-ignorable points that render as nothing: Arabic number and
// Syriac/Kaithi marks, Khmer inherent vowels, Mongolian free variation selectors, deprecated format controls
// U+206A-206F, Egyptian hieroglyph format controls U+13430-1343F, shorthand format controls and musical
// symbol format controls U+1D173-1D17A.
// This is not a claim to cover every Unicode format or default-ignorable point.
const controls = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069\u200b-\u200f\u2060-\u2064\ufeff\u{e0000}-\u{e007f}\ufe00-\ufe0f\u{e0100}-\u{e01ef}\u061c\u2028\u2029\u00ad\u034f\u115f\u1160\u3164\uffa0\u180e\ufff9-\ufffb\u0600-\u0605\u06dd\u070f\u0890\u0891\u08e2\u17b4\u17b5\u180b-\u180d\u180f\u206a-\u206f\u{110bd}\u{110cd}\u{13430}-\u{1343f}\u{1bca0}-\u{1bca3}\u{1d173}-\u{1d17a}]/gu;

/** Escape hidden/terminal code points in JSON tool data, including property names. */
export function neutralizeToolValue(value: unknown): { value: unknown; changed: boolean } {
  let changed = false;
  const text = (input: string): string => input.replace(controls, point => {
    changed = true;
    return `\\u{${point.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}}`;
  });
  function visit(input: unknown): unknown {
    if (typeof input === 'string') return text(input);
    if (input === null || typeof input !== 'object') return input;
    if (Array.isArray(input)) return input.map(visit);
    const output: Record<string, unknown> = Object.create(null);
    for (const [key, entry] of Object.entries(input)) {
      const escaped = text(key);
      // Do not silently overwrite an existing visible key with an escaped one.
      if (Object.hasOwn(output, escaped)) throw new Error('Ambiguous output keys');
      output[escaped] = visit(entry);
    }
    return output;
  }
  const output = visit(value);
  return { value: output, changed };
}
