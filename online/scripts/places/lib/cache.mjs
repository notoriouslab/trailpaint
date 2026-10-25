/** Local pipeline cache (020 D1) — gitignored, rebuilt by re-running adapters. */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ONLINE_DIR = join(__dirname, '..', '..', '..');
export const CACHE_DIR = join(ONLINE_DIR, '.cache', 'places');
export const POOL_DIR = join(ONLINE_DIR, '..', 'data', 'places', 'tw');
export const UA = 'TrailPaint-places/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint)';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function cachePath(...parts) {
  const p = join(CACHE_DIR, ...parts);
  mkdirSync(dirname(p), { recursive: true });
  return p;
}

export function readJson(path, fallback) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback;
}

export function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 1) + '\n');
}

/** fetch with UA, retry on network errors and 429/5xx with backoff. */
export async function fetchJson(url, opts = {}, tries = 4) {
  for (let i = 0; ; i++) {
    let r;
    try {
      r = await fetch(url, { ...opts, headers: { 'User-Agent': UA, ...(opts.headers ?? {}) } });
    } catch (err) {
      if (i + 1 >= tries) throw err; // ECONNRESET / DNS / TLS
      await sleep(2000 * 2 ** i);
      continue;
    }
    if (r.ok) return r.json();
    if (i + 1 >= tries || (r.status !== 429 && r.status < 500)) throw new Error(`${r.status} ${url.slice(0, 120)}`);
    await sleep(2000 * 2 ** i);
  }
}
