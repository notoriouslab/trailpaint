/**
 * Shared text sanitiser — strips characters that enable display-hijack /
 * bidi-override attacks in user-facing text rendered to canvas, AI-agent
 * output, or 1080x1080 IG postcards.
 *
 * Used by:
 *   - postcardStamp (scripture refs)
 *   - postcardRenderer (spot title / desc on the postcard)
 *   - migrateProject (photoMeta author field) — TODO: align this caller too
 *
 * Char classes stripped:
 *   - U+0000-U+001F: ASCII control
 *   - U+007F: DEL
 *   - U+200B-U+200F: zero-width / LRM-RLM
 *   - U+202A-U+202E: bidi formatting (PDF/LRE/RLE/LRO/RLO)
 *   - U+2066-U+2069: bidi isolates
 *   - U+FEFF: BOM / zero-width no-break space
 *
 * RegExp constructor with escaped \u sequences keeps the source ASCII-safe
 * and avoids the invisible-char trap that bites regex literals during edits.
 */

// eslint-disable-next-line no-control-regex
export const STRIP_UNSAFE_CHARS = new RegExp(
  '[\\u0000-\\u001F\\u007F\\u200B-\\u200F\\u202A-\\u202E\\u2066-\\u2069\\uFEFF]',
  'g',
);

export function stripUnsafeChars(text: string): string {
  return text.replace(STRIP_UNSAFE_CHARS, '');
}
