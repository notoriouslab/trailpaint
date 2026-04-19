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
 * Task 4 status: POST + GET + Analytics Engine counter writes all live.
 * Analytics are fire-and-forget; write failures never block the redirect.
 */

const TTL_SECONDS = 90 * 24 * 3600;
const MAX_PAYLOAD_BYTES = 1_000_000;
const ORIGIN = 'https://trailpaint.org';
const ID_PATTERN = /^[A-Za-z0-9_-]{12}$/;

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

async function handlePost(request, env) {
  const bodyText = await request.text();
  if (bodyText.length > MAX_PAYLOAD_BYTES) {
    return Response.json({ error: 'payload too large' }, { status: 413 });
  }

  let payload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const schemaErr = validateCompactSchema(payload);
  if (schemaErr) {
    return Response.json({ error: schemaErr }, { status: 400 });
  }

  // Collision retry: probability ~10^-21 per attempt at current load; 3 tries
  // is deep defense. Each genId() is independent Web Crypto entropy.
  let id;
  for (let i = 0; i < 3; i++) {
    id = genId();
    const existing = await env.SHARE_KV.get(id);
    if (!existing) break;
    id = null;
  }
  if (!id) {
    return Response.json({ error: 'id collision, please retry' }, { status: 503 });
  }

  const envelope = {
    payload,
    userId: null,
    createdAt: Math.floor(Date.now() / 1000),
    v: 1,
  };

  await env.SHARE_KV.put(id, JSON.stringify(envelope), { expirationTtl: TTL_SECONDS });

  return Response.json({
    url: `${ORIGIN}/s/${id}`,
    id,
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  });
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

  // Re-compress payload into hash fragment the existing decodeShareLink expects.
  const payloadJson = JSON.stringify(envelope.payload);
  const b64 = await compressAndBase64(payloadJson);
  const redirectUrl = `${ORIGIN}/app/#share=${b64}`;

  const response = new Response(null, {
    status: 307,
    headers: {
      'Location': redirectUrl,
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

    if (url.pathname === '/api/s' && request.method === 'POST') {
      return handlePost(request, env);
    }

    if (url.pathname.startsWith('/s/') && request.method === 'GET') {
      return handleGet(request, env, ctx);
    }

    return new Response('not found', { status: 404 });
  },
};
