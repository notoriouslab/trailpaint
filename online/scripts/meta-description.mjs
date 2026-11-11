/** Search snippets and link previews cut off around 80 CJK characters: keep whole
 * sentences up to `max`. The full text stays in JSON-LD and the page body. */
export function metaDescription(text, max = 110) {
  const t = String(text ?? '').trim();
  if (t.length <= max) return t;
  let out = '';
  for (const sentence of t.match(/[^。；]+[。；]?/g) ?? []) {
    if ((out + sentence).length > max) break;
    out += sentence;
  }
  if (out) return out.replace(/；$/, '。');
  // First sentence alone is too long: cut at the last clause break.
  const cut = t.slice(0, max - 1);
  const at = Math.max(cut.lastIndexOf('，'), cut.lastIndexOf('、'), cut.lastIndexOf('：'));
  return `${at > max / 2 ? cut.slice(0, at) : cut}…`;
}
