/**
 * Cloudflare Worker — Share Link Backend for trailpaint.org
 *
 * Replaces the TinyURL third-party dependency with a self-hosted short link
 * service. Users POST a project payload to /api/s; Worker generates a 12-char
 * ID, stores the payload in KV (TTL 90 days), and returns a short URL. When
 * friends open /s/:id, Worker fetches the payload from KV and 307-redirects
 * to /app/#share=<payload> so the existing frontend decodeShareLink logic
 * works unchanged.
 *
 * Routes (configured in Cloudflare Dashboard):
 *   - trailpaint.org/s/*      (GET — redirect to /app/#share=...)
 *   - trailpaint.org/api/s    (POST — write new share)
 *
 * Bindings:
 *   - SHARE_KV        → KV namespace "trailpaint-share-kv"
 *   - SHARE_ANALYTICS → Analytics Engine dataset "trailpaint_share_events"
 *
 * Rate limiting is done at Cloudflare WAF layer (see cloudflare/README.md),
 * not in this Worker. Deploy: paste to Dashboard Worker editor.
 *
 * Envelope v2: payload is pre-compressed at POST time (CPU-heavy work done
 * behind rate limit) so GET is read + redirect only — stays well under free
 * tier's 10ms CPU budget even for photo-heavy shares. v1 rows (legacy) still
 * work via on-the-fly compress fallback but may 502 on very large payloads.
 */

const TTL_SECONDS = 90 * 24 * 3600;
// Photo-heavy shares: 20 spots × 600/0.7 JPEG lands around 3MB hash; we set
// 5MB so 30-ish photos still go through. KV value ceiling is 25MB so we're
// still an order of magnitude below the infra limit, and WAF rate limit
// (30 POST/IP/day) bounds worst-case quota growth to 150MB/IP/day.
const MAX_PAYLOAD_BYTES = 5_000_000;
const ORIGIN = 'https://trailpaint.org';
const ID_PATTERN = /^[A-Za-z0-9_-]{12}$/;
// Matches our base64 hash (standard alphabet A-Z a-z 0-9 + / =) with
// an optional `raw.` prefix used by the frontend when CompressionStream
// is unavailable (never on modern Safari/Chrome/Firefox, but kept as a
// last-resort fallback).
const HASH_PATTERN = /^(raw\.)?[A-Za-z0-9+/=]+$/;

// CORS: share API has no auth or cookies, so `*` is equivalent to server-
// direct access. Rate limit + schema validation + size cap are the real
// security layer — CORS here just unblocks local dev (localhost:5173 → Worker).
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

/** Generate 12-char URL-safe base64 ID (72 bits entropy, ~10^-9 collision at 1M keys). */
function genId() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Validate TrailPaint compact JSON structure (see online/src/core/utils/shareLink.ts
 * compactProject). Only checks required keys — optional keys (ov, bm, mu) are
 * passed through. Deep validation (photo MIME whitelist, URL sanitization) runs
 * on the frontend via migrateProject when decoding, not here.
 */
function validateCompactSchema(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return 'not an object';
  if (typeof p.v !== 'number') return 'missing v';
  if (typeof p.n !== 'string') return 'missing n';
  if (!Array.isArray(p.c) || p.c.length !== 2) return 'bad c';
  if (typeof p.c[0] !== 'number' || typeof p.c[1] !== 'number') return 'bad c values';
  if (typeof p.z !== 'number') return 'missing z';
  if (!Array.isArray(p.s)) return 'missing s';
  if (!Array.isArray(p.r)) return 'missing r';
  return null;
}

/** Deflate-compress a JSON string and return URL-safe-free standard base64
 *  (same format the frontend's decodeShareLink expects in the #share= hash). */
async function compressAndBase64(json) {
  const blob = new Blob([new TextEncoder().encode(json)]);
  const stream = blob.stream().pipeThrough(new CompressionStream('deflate'));
  const buf = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function errorJson(error, status) {
  return Response.json({ error }, { status, headers: CORS_HEADERS });
}

async function handlePost(request, env) {
  const bodyText = await request.text();
  if (bodyText.length > MAX_PAYLOAD_BYTES) {
    return errorJson('payload too large', 413);
  }

  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return errorJson('invalid json', 400);
  }

  // Two accepted shapes:
  //   (A) { hash: "<deflate-base64>" }       ← current frontend, zero Worker CPU
  //   (B) { v, n, c, z, s, r, ... }           ← legacy frontend (worker-side deflate)
  // Shape A keeps us clear of the 10ms free-tier CPU budget on photo-heavy
  // payloads; shape B is retained as a backward-compat path for any cached
  // old frontend bundle still around.
  let hash;
  if (typeof parsed.hash === 'string') {
    if (!HASH_PATTERN.test(parsed.hash)) {
      return errorJson('invalid hash format', 400);
    }
    hash = parsed.hash;
  } else {
    const schemaErr = validateCompactSchema(parsed);
    if (schemaErr) {
      return errorJson(schemaErr, 400);
    }
    hash = await compressAndBase64(JSON.stringify(parsed));
  }

  let id;
  for (let i = 0; i < 3; i++) {
    id = genId();
    const existing = await env.SHARE_KV.get(id);
    if (!existing) break;
    id = null;
  }
  if (!id) {
    return errorJson('id collision, please retry', 503);
  }

  const envelope = {
    hash,
    userId: null,
    createdAt: Math.floor(Date.now() / 1000),
    v: 2,
  };

  await env.SHARE_KV.put(id, JSON.stringify(envelope), { expirationTtl: TTL_SECONDS });

  return Response.json(
    {
      url: `${ORIGIN}/s/${id}`,
      id,
      expiresAt: Date.now() + TTL_SECONDS * 1000,
    },
    { headers: CORS_HEADERS },
  );
}

async function handleGet(request, env, ctx) {
  const url = new URL(request.url);
  const id = url.pathname.slice(3); // strip "/s/"

  if (!ID_PATTERN.test(id)) {
    return new Response('invalid id', { status: 400 });
  }

  // Check edge cache first. Using the full request URL as cache key ensures
  // per-id isolation. Cache.put() supports any status code (including 307)
  // as long as Cache-Control is set — unlike fetch+cacheEverything which is
  // unreliable for redirects.
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const raw = await env.SHARE_KV.get(id);
  if (!raw) return new Response('not found', { status: 404 });

  // Fire-and-forget analytics write. Only fires on cache miss (cache hit returns
  // before reaching here), so counts are a systematic under-estimate of true
  // traffic — but a good trend indicator for observing which shares get reopened.
  try {
    env.SHARE_ANALYTICS.writeDataPoint({
      blobs: [id],
      doubles: [1],
      indexes: [id],
    });
  } catch (err) {
    console.warn('[analytics] write failed:', err);
  }

  let envelope;
  try {
    envelope = JSON.parse(raw);
  } catch {
    return new Response('corrupted envelope', { status: 500 });
  }

  // v2 envelope: hash pre-compressed at POST time → GET does zero work.
  // v1 fallback: compress on-the-fly (kept for backward compat with any
  // pre-existing v1 rows; note v1 GETs may 502 on large photo payloads).
  let hash;
  if (typeof envelope.hash === 'string') {
    hash = envelope.hash;
  } else if (envelope.payload) {
    hash = await compressAndBase64(JSON.stringify(envelope.payload));
  } else {
    return new Response('bad envelope', { status: 500 });
  }

  // Why HTML body and not 307 + Location: a photo-heavy hash can be several
  // hundred KB, and Cloudflare edge caps response headers near 32KB which
  // hangs HTTP/2 framing. Why sessionStorage and not /app/#share= directly:
  // browsers truncate or drop the URL fragment when total URL exceeds their
  // internal parser limits (~300KB+ in practice), causing the share payload
  // to vanish on 7+ photo projects. sessionStorage is same-origin and has no
  // such cap. Fallback to URL hash only for the small-payload path where
  // sessionStorage is blocked (Safari private mode, quota exhaustion).
  const html = `<!doctype html>
<meta charset="utf-8">
<title>TrailPaint</title>
<script>
(function(){
  var h = ${JSON.stringify(hash)};
  try {
    sessionStorage.setItem('tp_share_hash', h);
    location.replace(${JSON.stringify(ORIGIN + '/app/?share=ss')});
  } catch (e) {
    location.replace(${JSON.stringify(ORIGIN + '/app/#share=')} + h);
  }
})();
</script>
<noscript><p>請啟用 JavaScript 以開啟分享連結。</p></noscript>`;

  const response = new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Served-By': 'trailpaint-share',
    },
  });

  // Fire-and-forget cache write (don't block response).
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight for /api/s (browsers only; GET /s/:id is a simple redirect
    // and doesn't require preflight).
    if (request.method === 'OPTIONS' && url.pathname === '/api/s') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/api/s' && request.method === 'POST') {
      return handlePost(request, env);
    }

    if (url.pathname.startsWith('/s/') && request.method === 'GET') {
      return handleGet(request, env, ctx);
    }

    return new Response('not found', { status: 404 });
  },
};
