/** Validate ?src= param: allow curated same-origin JSON under /stories/,
 *  /taiwan/ (台灣百年 curated section) or /examples/routes/. Path components
 *  use [^/] so Chinese filenames work (e.g. /examples/routes/阿朗壹古道.trailpaint.json).
 *  `..` traversal blocked. */
export function isValidSrc(src: string): boolean {
  if (src.includes('..')) return false;
  return /^\/(stories|taiwan)\/[^/]+\/[^/]+\.json$/.test(src)
      || /^\/examples\/routes\/[^/]+\.json$/.test(src);
}
