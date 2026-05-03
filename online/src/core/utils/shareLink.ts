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
export function compactProject(project: Project, includePhoto = false): Record<string, unknown> {
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
      // v3.1 photoMeta (013): 內層 key 改用 sc/lc/au/uu/su 避免與其他物件的 short keys
      // 視覺重複（runtime namespace 不同無衝突，但 debug 時看得清楚）
      if (s.photoMeta) {
        o.pm = {
          sc: s.photoMeta.source,
          lc: s.photoMeta.license,
          au: s.photoMeta.author,
          uu: s.photoMeta.authorUrl,
          su: s.photoMeta.sourceUrl,
        };
      }
      // v3+ scripture_refs (009): keep so receivers can link to YouVersion etc.
      if (s.scripture_refs && s.scripture_refs.length > 0) {
        o.sr = s.scripture_refs;
      }
      // v5+ era (016): preserve so TimeSlider era fade still works after
      // share-link round-trip. Compact as [start, end] tuple.
      if (s.era) {
        o.er = [s.era.start, s.era.end];
      }
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
export function expandProject(c: Record<string, unknown>): Project {
  const spots = (c.s as Record<string, unknown>[])?.map((s) => {
    const out: Record<string, unknown> = {
      id: s.i as string,
      latlng: s.l as [number, number],
      num: s.u as number,
      title: s.t as string,
      desc: (s.d as string) ?? '',
      photo: (typeof s.p === 'string' ? s.p : null),
      iconId: s.k as string,
      cardOffset: s.o ? { x: (s.o as number[])[0], y: (s.o as number[])[1] } : { ...DEFAULT_CARD_OFFSET },
    };
    // v3.1 photoMeta (013): expand sc/lc/au/uu/su → photoMeta；migrateProject 會做白名單
    if (s.pm && typeof s.pm === 'object') {
      const pm = s.pm as Record<string, unknown>;
      out.photoMeta = {
        source: pm.sc,
        license: pm.lc,
        author: pm.au,
        authorUrl: pm.uu,
        sourceUrl: pm.su,
      };
    }
    // v3+ scripture_refs (009): expand back as-is; migrateProject re-validates.
    if (Array.isArray(s.sr)) {
      out.scripture_refs = (s.sr as unknown[]).filter((x): x is string => typeof x === 'string');
    }
    // v5+ era (016): expand [start, end] tuple → { start, end }; migrateProject's
    // sanitizeEra re-validates (NaN / inverted / out-of-range rejected).
    if (Array.isArray(s.er) && s.er.length === 2
        && typeof s.er[0] === 'number' && typeof s.er[1] === 'number') {
      out.era = { start: s.er[0], end: s.er[1] };
    }
    return out;
  }) ?? [];
  const routes = (c.r as Record<string, unknown>[])?.map((r) => ({
    id: r.i as string,
    name: (r.n as string) ?? '',
    pts: r.p as [number, number][],
    color: r.c as string,
    elevations: (r.e as number[] | null) ?? null,
  })) ?? [];
  const project: Project = {
    // Version cast is cosmetic — migrateProject re-runs against the expanded
    // payload and force-bumps to the latest schema version (currently v5).
    version: (typeof c.v === 'number' ? c.v : 5) as Project['version'],
    name: c.n as string,
    center: c.c as [number, number],
    zoom: c.z as number,
    spots: spots as unknown as Project['spots'],
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
 * Compress a project to the deflate+base64 hash string (without `#share=`).
 * Falls back to `raw.<base64>` on browsers without CompressionStream.
 * Shared by both the URL-hash path (encodeShareLink) and the backend path
 * (createBackendShare) — frontend-side compression avoids a ~3× larger body
 * transfer and off-loads the deflate work from the Worker CPU budget.
 */
async function compressToBase64Hash(project: Project, includePhoto: boolean): Promise<string> {
  const compact = compactProject(project, includePhoto);
  const json = JSON.stringify(compact);
  try {
    const blob = new Blob([new TextEncoder().encode(json)]);
    const cs = new CompressionStream('deflate');
    const compressed = blob.stream().pipeThrough(cs);
    const buffer = await new Response(compressed).arrayBuffer();
    return uint8ToBase64(new Uint8Array(buffer));
  } catch {
    return 'raw.' + uint8ToBase64(new TextEncoder().encode(json));
  }
}

/**
 * Encode a project into a compressed URL hash (long URL, no third-party).
 */
export async function encodeShareLink(project: Project, targetPath?: string): Promise<string> {
  const hash = await compressToBase64Hash(project, false);
  const basePath = targetPath
    ? `${window.location.origin}${targetPath}`
    : `${window.location.origin}${window.location.pathname}`;
  return `${basePath}#share=${hash}`;
}

/**
 * Extract the first photo in the project as a plain base64 string (stripping
 * the `data:image/...;base64,` prefix). Used as the Open Graph preview image
 * on backend shares so social media (LINE / Facebook / Twitter / Slack) can
 * render a real photo instead of a generic logo.
 *
 * Returns null when no spot has a photo; in that case the Worker falls back
 * to a static brand image.
 */
function extractCoverBase64(project: Project): string | null {
  const spotWithPhoto = project.spots.find((s) => s.photo);
  if (!spotWithPhoto?.photo) return null;
  const match = spotWithPhoto.photo.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/);
  return match ? match[2] : null;
}

/**
 * Decode a share link hash back to a Project.
 * Returns null if the hash is not a share link or decoding fails.
 */
// Max compressed payload size (base64 chars). Matches backend cap — 5MB
// accommodates ~30 photos at 600/0.7. Decompression-bomb defence still
// here; the move was from pre-photo-era assumptions to actual photo-backed
// share weights.
const MAX_PAYLOAD_LEN = 5_000_000;
// Max decompressed JSON size. 30 spots × ~150KB base64 photo ≈ 5MB raw;
// 8MB keeps headroom for JSON overhead without opening absurd-bomb doors.
const MAX_DECOMPRESSED_LEN = 8_000_000;
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
  // Compact format uses short keys: v, n, c, z, s, r.
  // Always funnel through migrateProject so the URL/MIME/size whitelist rejects
  // crafted payloads (e.g. `photo: "javascript:..."` or oversized data-URLs).
  if ('v' in data && !('version' in data)) {
    const expanded = expandProject(data) as unknown as Record<string, unknown>;
    return migrateProject(expanded);
  }
  // Legacy format: full Project structure — migrateProject validates.
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
// 5s was too tight: a 400-600KB photo-heavy payload on mobile uplink
// (1-3 Mbps typical) can spend 3-5s just on the HTTP body transfer,
// then Worker processing + KV write, easily blowing past 5s on Safari.
// Aborts here silently degrade to TinyURL, which drops photos.
const BACKEND_TIMEOUT_MS = 20000;

/**
 * Create a short share URL with automatic degradation:
 *   1. Backend /s/:id (Cloudflare Worker + KV, 012-share-backend)
 *   2. TinyURL (third-party legacy fallback)
 *   3. Long hash URL (original compressed-in-URL)
 *
 * Always returns a usable URL. Never throws — logs and degrades silently.
 */
/** Warn-level threshold for compressed share payload. Backend accepts 5MB;
 * at ~4.5MB the browser URL bar may truncate the long-hash fallback and
 * LINE/WeChat silently drop the share. Photo-heavy stories (e.g. 2-3MB
 * pre-built examples) plus user additions can cross this. Kept permissive —
 * just a console warning now, so a future UI layer can surface it. */
const SHARE_SIZE_WARN_BYTES = 4_500_000;

export async function createBackendShare(project: Project): Promise<string> {
  // Compress on the frontend, POST only the deflate-base64 hash + cover meta.
  // Three wins:
  //   (1) body shrinks ~3× vs sending raw compact JSON, so mobile Safari
  //       doesn't choke on 400KB+ uploads.
  //   (2) Worker POST does zero compression work, staying under the 10ms
  //       free-tier CPU budget even for photo-heavy projects.
  //   (3) `name` + `cover` let the Worker render Open Graph previews with a
  //       real first-photo thumbnail on LINE / Facebook / Twitter / Slack.
  const hash = await compressToBase64Hash(project, true);
  const cover = extractCoverBase64(project);

  if (hash.length > SHARE_SIZE_WARN_BYTES) {
    console.warn(
      `[createBackendShare] share payload is ${Math.round(hash.length / 1024)}KB ` +
      `(>${SHARE_SIZE_WARN_BYTES / 1024}KB warn threshold). Backend may reject, long-URL fallback may truncate.`,
    );
    // TODO: surface this to the UI (e.g. "project too large, consider removing some photos")
  }

  try {
    const res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hash,
        name: project.name || '',
        cover, // null when no photo; Worker falls back to brand image
      }),
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

  // Fallback: long hash URL. TinyURL was removed — it handed out photo-less
  // shares that looked broken to recipients. A long URL is honest: small
  // shares fit anywhere, large ones truncate in LINE/WeChat and the user
  // knows to retry when backend comes back.
  return await encodeShareLink(project);
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
