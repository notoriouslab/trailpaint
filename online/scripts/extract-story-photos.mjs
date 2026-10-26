#!/usr/bin/env node
/**
 * Move inline spot photos out of the bundled story files (026 D1).
 *
 * Every "photo": "data:image/…;base64,…" in stories/, taiwan/ and
 * examples/routes/ *.trailpaint.json is written to spot-photos/<hash>.<ext> next
 * to the story file, and the JSON keeps the site-root path instead. The file
 * name is the first 16 hex of the photo's SHA-256, so the same photo used by
 * two stories in one folder is stored once and re-runs are no-ops.
 * Only the data URL text is replaced; the rest of each file is untouched.
 * Not photos/, which .gitignore keeps for local source material in stories/.
 *
 *   Run: node online/scripts/extract-story-photos.mjs [--check]
 *   --check: change nothing, exit 1 if any inline photo is left.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const CHECK = process.argv.includes('--check');
const EXT = { jpeg: 'jpg', jpg: 'jpg', png: 'png', webp: 'webp' };
const INLINE = /"photo": "data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)"/g;

function storyFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    if (d.isDirectory()) return d.name === 'spot-photos' ? [] : storyFiles(p);
    return d.name.endsWith('.trailpaint.json') ? [p] : [];
  });
}

const files = ['stories', 'taiwan', join('examples', 'routes')].flatMap((d) => storyFiles(join(ROOT, d)));
let moved = 0;
let left = 0;
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const dir = dirname(file);
  const urlDir = '/' + relative(ROOT, dir).split(sep).join('/') + '/spot-photos/';
  const out = src.replace(INLINE, (_m, mime, b64) => {
    left++;
    if (CHECK) return _m;
    const buf = Buffer.from(b64, 'base64');
    const name = `${createHash('sha256').update(buf).digest('hex').slice(0, 16)}.${EXT[mime]}`;
    mkdirSync(join(dir, 'spot-photos'), { recursive: true });
    const target = join(dir, 'spot-photos', name);
    if (!existsSync(target)) writeFileSync(target, buf);
    moved++;
    return `"photo": "${urlDir}${name}"`;
  });
  if (!CHECK && out !== src) writeFileSync(file, out);
}
if (CHECK) {
  console.log(`${left} inline photo(s) in ${files.length} story files`);
  process.exit(left ? 1 : 0);
}
console.log(`moved ${moved} photo(s) out of ${files.length} story files`);
