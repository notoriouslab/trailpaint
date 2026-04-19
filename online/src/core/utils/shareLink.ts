import type { Project } from '../models/types';
import { DEFAULT_CARD_OFFSET } from '../models/types';
import { migrateProject } from './migrateProject';

/**
 * Compact a project for sharing: shorten keys, omit defaults.
 *
 * `includePhoto` controls whether `spot.photo` (base64 data URL) is embedded:
 * - `false` (default) for the URL-hash path — photos strip to keep URLs short
 *   enough to survive LINE/WeChat truncation and fit in TinyURL's limits.
 * - `true` for the backend `/s/:id` path — KV has 1MB payload room, so photos
 *   ride along and friends see the full visual story.
 * Key `p` on spots stores the photo data URL when included; absent otherwise.
 */
function compactProject(project: Project, includePhoto = false): Record<string, unknown> {
  const out: Record<string, unknown> = {
    v: project.version,
    n: project.name,
    c: project.center,
    z: project.zoom,
    s: project.spots.map((s) => {
      const o: Record<string, unknown> = {
        i: s.id, l: s.latlng, u: s.num, t: s.title, k: s.iconId,
      };
      if (s.desc) o.d = s.desc;
      if (s.cardOffset.x !== 0 || s.cardOffset.y !== 0) o.o = [s.cardOffset.x, s.cardOffset.y];
      if (includePhoto && s.photo) o.p = s.photo;
      return o;
    }),
    r: project.routes.map((r) => {
      const o: Record<string, unknown> = {
        i: r.id, p: r.pts, c: r.color,
      };
      if (r.name) o.n = r.name;
      if (r.elevations) o.e = r.elevations;
      return o;
    }),
  };
  if (project.overlay) {
    out.ov = { i: project.overlay.id, o: project.overlay.opacity };
  }
  if (project.basemapId) {
    out.bm = project.basemapId;
  }
  if (project.music) {
    out.mu = { u: project.music.url, a: project.music.autoplay ? 1 : 0 };
  }
  return out;
}

/**
 * Expand a compact project back to full Project structure.
 */
function expandProject(c: Record<string, unknown>): Project {
  const spots = (c.s as Record<string, unknown>[])?.map((s) => ({
    id: s.i as string,
    latlng: s.l as [number, number],
    num: s.u as number,
    title: s.t as string,
    desc: (s.d as string) ?? '',
    photo: (typeof s.p === 'string' ? s.p : null),
    iconId: s.k as string,
    cardOffset: s.o ? { x: (s.o as number[])[0], y: (s.o as number[])[1] } : { ...DEFAULT_CARD_OFFSET },
  })) ?? [];
  const routes = (c.r as Record<string, unknown>[])?.map((r) => ({
    id: r.i as string,
    name: (r.n as string) ?? '',
    pts: r.p as [number, number][],
    color: r.c as string,
    elevations: (r.e as number[] | null) ?? null,
  })) ?? [];
  const project: Project = {
    version: (c.v as 1 | 2) ?? 2,
    name: c.n as string,
    center: c.c as [number, number],
    zoom: c.z as number,
    spots,
    routes,
  };
  if (c.ov && typeof c.ov === 'object') {
    const ov = c.ov as Record<string, unknown>;
    if (typeof ov.i === 'string' && typeof ov.o === 'number') {
      project.overlay = { id: ov.i, opacity: ov.o };
    }
  }
  if (typeof c.bm === 'string') {
    project.basemapId = c.bm;
  }
  if (c.mu && typeof c.mu === 'object') {
    const mu = c.mu as Record<string, unknown>;
    if (typeof mu.u === 'string') {
      project.music = { url: mu.u, autoplay: !!mu.a };
    }
  }
  return project;
}

/**
 * Encode a project into a compressed URL hash (long URL, no third-party).
 */
export async function encodeShareLink(project: Project, targetPath?: string): Promise<string> {
  const compact = compactProject(project);
  const json = JSON.stringify(compact);
  const basePath = targetPath
    ? `${window.location.origin}${targetPath}`
    : `${window.location.origin}${window.location.pathname}`;

  try {
    const blob = new Blob([new TextEncoder().encode(json)]);
    const cs = new CompressionStream('deflate');
    const compressed = blob.stream().pipeThrough(cs);
    const buffer = await new Response(compressed).arrayBuffer();
    const base64 = uint8ToBase64(new Uint8Array(buffer));
    return `${basePath}#share=${base64}`;
  } catch {
    const base64 = uint8ToBase64(new TextEncoder().encode(json));
    return `${basePath}#share=raw.${base64}`;
  }
}

/**
 * Shorten a URL via TinyURL. Sends the full URL to a third-party service.
 * Returns short URL on success, null on failure.
 */
export async function shortenUrl(longUrl: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) {
      const shortUrl = (await res.text()).trim();
      if (shortUrl.startsWith('http')) return shortUrl;
    }
  } catch {
    // Shortener unavailable
  }
  return null;
}

/**
 * Decode a share link hash back to a Project.
 * Returns null if the hash is not a share link or decoding fails.
 */
// Max compressed payload size (base64 chars). ~375KB compressed ≈ generous for any real project.
const MAX_PAYLOAD_LEN = 500_000;
// Max decompressed JSON size. 2MB is far beyond any real project without photos.
const MAX_DECOMPRESSED_LEN = 2_000_000;
// Semantic limits — prevent UI freeze from absurd data
const MAX_SPOTS = 200;
const MAX_ROUTES = 50;
const MAX_POINTS_PER_ROUTE = 5_000;

export async function decodeShareLink(hash: string): Promise<Project | null> {
  const match = hash.match(/^#share=(.+)$/);
  if (!match) return null;
  const payload = match[1];

  // Guard against decompression bomb
  if (payload.length > MAX_PAYLOAD_LEN) return null;

  // Check for raw (uncompressed) fallback
  if (payload.startsWith('raw.')) {
    try {
      const json = new TextDecoder().decode(base64ToUint8(payload.slice(4)));
      if (json.length > MAX_DECOMPRESSED_LEN) return null;
      const project = parseSharePayload(json);
      return validateProjectLimits(project) ? project : null;
    } catch {
      return null;
    }
  }

  // Compressed (deflate)
  try {
    const bytes = base64ToUint8(payload);
    const blob = new Blob([bytes.buffer as ArrayBuffer]);
    const ds = new DecompressionStream('deflate');
    const decompressed = blob.stream().pipeThrough(ds);
    const text = await new Response(decompressed).text();
    if (text.length > MAX_DECOMPRESSED_LEN) return null;
    const project = parseSharePayload(text);
    return validateProjectLimits(project) ? project : null;
  } catch {
    return null;
  }
}

/** Parse JSON payload: detect compact format (has 'v' key) vs legacy (has 'version' key). */
function parseSharePayload(json: string): Project {
  const data = JSON.parse(json);
  // Compact format uses short keys: v, n, c, z, s, r
  if ('v' in data && !('version' in data)) {
    return expandProject(data);
  }
  // Legacy format: full Project structure — run through migrateProject for validation
  return migrateProject(data);
}

/** Reject projects with absurd data volumes that would freeze the UI. */
function validateProjectLimits(p: Project): boolean {
  if (p.spots && p.spots.length > MAX_SPOTS) return false;
  if (p.routes && p.routes.length > MAX_ROUTES) return false;
  if (p.routes) {
    for (const r of p.routes) {
      if (r.pts && r.pts.length > MAX_POINTS_PER_ROUTE) return false;
    }
  }
  return true;
}

/* ── Backend share (Cloudflare Worker + KV) ── */

const BACKEND_URL = 'https://trailpaint.org/api/s';
const BACKEND_TIMEOUT_MS = 5000;

/**
 * Create a short share URL with automatic degradation:
 *   1. Backend /s/:id (Cloudflare Worker + KV, 012-share-backend)
 *   2. TinyURL (third-party legacy fallback)
 *   3. Long hash URL (original compressed-in-URL)
 *
 * Always returns a usable URL. Never throws — logs and degrades silently.
 */
export async function createBackendShare(project: Project): Promise<string> {
  const compact = compactProject(project, true); // include photos

  try {
    const res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(compact),
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
    if (res.ok) {
      const data = (await res.json()) as { url?: unknown };
      if (typeof data.url === 'string' && data.url.startsWith('https://')) {
        return data.url;
      }
    }
    console.warn('[createBackendShare] backend non-ok:', res.status);
  } catch (err) {
    console.warn('[createBackendShare] backend failed:', err);
  }

  const longUrl = await encodeShareLink(project);
  const tinyUrl = await shortenUrl(longUrl);
  return tinyUrl ?? longUrl;
}

/* ── Helpers ── */

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
