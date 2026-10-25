/**
 * Township English label → URL slug (020 D3).
 * "Da'an District" → "daan", "Banqiao District" → "banqiao".
 * Wikidata disambiguates some labels ("North District, Taichung") and spells
 * some syllable breaks with a hyphen ("Tai-an") — both are dropped so every
 * slug follows the same pattern ("Ren'ai" and "Ren-ai" → "renai").
 */
const SUFFIXES = [' district', ' township', ' city', ' town', ' village'];

export function townSlug(enLabel) {
  let s = enLabel.split(',')[0].trim().toLowerCase();
  for (const suf of SUFFIXES) {
    if (s.endsWith(suf)) {
      s = s.slice(0, -suf.length);
      break;
    }
  }
  return s
    .replace(/['’-]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
