import type { Project } from '../models/types';

/**
 * Compact a project for sharing: strip photos, shorten keys, omit defaults.
 */
function compactProject(project: Project): Record<string, unknown> {
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
    photo: null,
    iconId: s.k as string,
    cardOffset: s.o ? { x: (s.o as number[])[0], y: (s.o as number[])[1] } : { x: 0, y: -60 },
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
