/**
 * Postcard stamp formatters — three-language era / location / scripture
 * formatting helpers for the 1080x1080 IG-square postcard renderer (T7/T8).
 *
 * Design ref: openspec/changes/2026-05-03-016-time-slider-postcard/design.md D8
 */

export type StampLocale = 'zh-TW' | 'en' | 'ja';

/** Format a calendar year (BC negative, AD positive) into a localised era string. */
export function formatEra(year: number, locale: StampLocale): string {
  if (locale === 'zh-TW') {
    return year < 0 ? `公元前 ${-year} 年` : `公元 ${year} 年`;
  }
  if (locale === 'en') {
    return year < 0 ? `BC ${-year}` : `AD ${year}`;
  }
  return year < 0 ? `紀元前 ${-year} 年` : `西暦 ${year} 年`;
}

// RegExp constructor with escaped \u sequences keeps the source ASCII-safe and
// avoids the invisible-char trap that bites regex literals during edits.
// Strips: ASCII control (U+0000-U+001F, U+007F), zero-width / LRM / RLM
// (U+200B-U+200F), bidi formatting (U+202A-U+202E), bidi isolates
// (U+2066-U+2069), and BOM (U+FEFF).
// eslint-disable-next-line no-control-regex
const STRIP_UNSAFE_CHARS = new RegExp(
  '[\\u0000-\\u001F\\u007F\\u200B-\\u200F\\u202A-\\u202E\\u2066-\\u2069\\uFEFF]',
  'g',
);

/**
 * Strip control / bidi-override / zero-width chars and trim. Caps length at 24
 * (longer refs truncated with U+2026 ellipsis) so a dense passage doesn't break
 * the stamp layout.
 */
export function formatScriptureRef(raw: string): string {
  const cleaned = raw.replace(STRIP_UNSAFE_CHARS, '').trim();
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 24) return cleaned;
  return cleaned.slice(0, 23) + '…';
}

interface StampParts {
  year: number;
  /** Location name, typically spot.title. Optional — pure-era stamps allowed. */
  location?: string;
  /** First scripture ref from spot.scripture_refs, if any. */
  scriptureRef?: string;
}

/**
 * Compose the full stamp text. Layout:
 *   line 1: era (always present)
 *   line 2: location (when supplied)
 *   line 3: scripture ref (when supplied)
 *
 * Returns lines as an array so the canvas renderer can place them at different
 * y offsets / font sizes (era large, location medium, scripture small per CP2).
 */
export function formatStampLines(parts: StampParts, locale: StampLocale): string[] {
  const lines: string[] = [formatEra(parts.year, locale)];
  if (parts.location) lines.push(parts.location);
  if (parts.scriptureRef) {
    const ref = formatScriptureRef(parts.scriptureRef);
    if (ref) lines.push(ref);
  }
  return lines;
}
