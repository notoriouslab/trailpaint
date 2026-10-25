/**
 * Shared text sanitiser — strips characters that enable display-hijack /
 * bidi-override attacks in user-facing text rendered to canvas, AI-agent
 * output, or 1080x1080 IG postcards.
 *
 * Used by:
 *   - postcardStamp (scripture refs)
 *   - postcardRenderer (spot title / desc on the postcard)
 *   - migrateProject (photoMeta author / license / origin)
 *
 * Char classes stripped:
 *   - U+0000-U+001F: ASCII control
 *   - U+007F-U+009F: DEL + C1 control
 *   - U+00AD, U+061C, U+180E: soft hyphen, Arabic letter mark, Mongolian vowel separator
 *   - U+200B-U+200F: zero-width / LRM-RLM
 *   - U+202A-U+202E: bidi formatting (PDF/LRE/RLE/LRO/RLO)
 *   - U+2028-U+2029: line / paragraph separator
 *   - U+2060-U+2064: word joiner + invisible operators
 *   - U+2066-U+2069: bidi isolates
 *   - U+FEFF: BOM / zero-width no-break space
 *   - U+E0000-U+E007F: tag characters (invisible "ASCII smuggling" aimed at AI agents)
 *
 * RegExp constructor with escaped \u sequences keeps the source ASCII-safe
 * and avoids the invisible-char trap that bites regex literals during edits.
 */

export const STRIP_UNSAFE_CHARS = new RegExp(
  // eslint-disable-next-line no-control-regex
  '[\\u0000-\\u001F\\u007F-\\u009F\\u00AD\\u061C\\u180E\\u200B-\\u200F\\u2028\\u2029\\u202A-\\u202E\\u2060-\\u2064\\u2066-\\u2069\\uFEFF\\u{E0000}-\\u{E007F}]',
  'gu',
);

export function stripUnsafeChars(text: string): string {
  return text.replace(STRIP_UNSAFE_CHARS, '');
}
