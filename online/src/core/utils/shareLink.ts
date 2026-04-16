import type { Project } from '../models/types';

/**
 * Compact a project for sharing: strip photos, shorten keys, omit defaults.
 */
function compactProject(project: Project): Record<string, unknown> {
  return {
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
      if (s.photoY !== undefined) o.y = s.photoY;
      if (s.customEmoji) o.e = s.customEmoji;
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
    pb: project.playback ? {
      m: project.playback.mode,
      t: project.playback.interval,
      l: project.playback.loop,
    } : undefined,
  };
}

/**
 * Expand a compact project back to full Project structure.
 */
function expandProject(c: Record<string, unknown>): Project {
  const safeArray = (arr: unknown) => (Array.isArray(arr) ? arr : []);
  const safeNum = (n: unknown, def = 0) => (typeof n === 'number' ? n : def);
  const safeStr = (s: unknown, def = '') => (typeof s === 'string' ? s : def);

  const spots = safeArray(c.s).map((raw) => {
    const s = raw as Record<string, unknown>;
    return {
      id: safeStr(s.i, crypto.randomUUID()),
      latlng: (Array.isArray(s.l) && s.l.length === 2 ? s.l : [0, 0]) as [number, number],
      num: safeNum(s.u, 1),
      title: safeStr(s.t, 'Spot'),
      desc: safeStr(s.d, ''),
      photo: null,
      photoY: typeof s.y === 'number' ? Math.max(0, Math.min(100, s.y)) : undefined,
      iconId: safeStr(s.k, 'pin'),
      customEmoji: typeof s.e === 'string' ? s.e : undefined,
      cardOffset: Array.isArray(s.o) && s.o.length === 2
        ? { x: safeNum(s.o[0]), y: safeNum(s.o[1]) }
        : { x: 0, y: -60 },
    };
  });

  const routes = safeArray(c.r).map((raw) => {
    const r = raw as Record<string, unknown>;
    return {
      id: safeStr(r.i, crypto.randomUUID()),
      name: safeStr(r.n, ''),
      pts: (Array.isArray(r.p) ? r.p : []) as [number, number][],
      color: safeStr(r.c, 'orange'),
      elevations: Array.isArray(r.e) ? (r.e as number[]) : null,
    };
  });

  const pb = c.pb as Record<string, unknown> | undefined;
  const playback = pb ? {
    mode: (pb.m === 'manual' ? 'manual' : 'auto') as 'auto' | 'manual',
    interval: safeNum(pb.t, 2000),
    loop: typeof pb.l === 'boolean' ? pb.l : true,
  } : undefined;

  return {
    version: safeNum(c.v, 2) as 1 | 2,
    name: safeStr(c.n, 'Shared Trail'),
    center: (Array.isArray(c.c) && c.c.length === 2 ? c.c : [0, 0]) as [number, number],
    zoom: safeNum(c.z, 14),
    spots,
    routes,
    playback,
  };
}

/**
 * Encode a project into a compressed URL hash (long URL, no third-party).
 */
export async function encodeShareLink(project: Project): Promise<string> {
  const compact = compactProject(project);
  const json = JSON.stringify(compact);

  try {
    const blob = new Blob([new TextEncoder().encode(json)]);
    const cs = new CompressionStream('deflate');
    const compressed = blob.stream().pipeThrough(cs);
    const buffer = await new Response(compressed).arrayBuffer();
    const base64 = uint8ToBase64(new Uint8Array(buffer));
    return `${window.location.origin}${window.location.pathname}#share=${base64}`;
  } catch {
    const base64 = uint8ToBase64(new TextEncoder().encode(json));
    return `${window.location.origin}${window.location.pathname}#share=raw.${base64}`;
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
  // Legacy format: full Project structure
  return data as Project;
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
