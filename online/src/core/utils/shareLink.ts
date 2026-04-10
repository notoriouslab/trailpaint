import type { Project } from '../models/types';

/**
 * Encode a project (without photo base64) into a compressed URL hash.
 * Uses native CompressionStream (deflate) → base64.
 */
export async function encodeShareLink(project: Project): Promise<string> {
  // Strip photo data to keep URL manageable
  const stripped: Project = {
    ...project,
    spots: project.spots.map((s) => ({ ...s, photo: null })),
  };
  const json = JSON.stringify(stripped);

  try {
    const blob = new Blob([new TextEncoder().encode(json)]);
    const cs = new CompressionStream('deflate');
    const compressed = blob.stream().pipeThrough(cs);
    const buffer = await new Response(compressed).arrayBuffer();
    const base64 = uint8ToBase64(new Uint8Array(buffer));
    return `${window.location.origin}${window.location.pathname}#share=${base64}`;
  } catch {
    // Fallback: plain base64 (older browsers without CompressionStream)
    const base64 = btoa(unescape(encodeURIComponent(json)));
    return `${window.location.origin}${window.location.pathname}#share=raw.${base64}`;
  }
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
      const json = decodeURIComponent(escape(atob(payload.slice(4))));
      if (json.length > MAX_DECOMPRESSED_LEN) return null;
      const project = JSON.parse(json) as Project;
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
    const project = JSON.parse(text) as Project;
    return validateProjectLimits(project) ? project : null;
  } catch {
    return null;
  }
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
