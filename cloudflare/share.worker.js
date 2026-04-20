/**
 * Cloudflare Worker — Share Link Backend for trailpaint.org
 *
 * Replaces the TinyURL third-party dependency with a self-hosted short link
 * service. Users POST a project payload to /api/s; Worker generates a 12-char
 * ID, stores the payload in KV (TTL 90 days), and returns a short URL. When
 * friends open /s/:id, Worker fetches the payload from KV and lands the
 * recipient on /app/player/?share=ss (Story Player) — recipients almost
 * always want to *watch* a shared trail, not edit someone else's project.
 * Authors going Editor → Player → back still use the existing storyMode.ts
 * path (new tab / localStorage restore), which is unaffected.
 *
 * Routes (configured in Cloudflare Dashboard):
 *   - trailpaint.org/s/*      (GET — land on /app/player/?share=ss)
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
// Cover image: standard base64 only (no raw. prefix), reasonable size cap.
const COVER_PATTERN = /^[A-Za-z0-9+/=]+$/;
const MAX_COVER_BYTES = 400_000; // ~300KB raw JPEG after base64 → OK for OG preview
const MAX_NAME_LEN = 200;
const FALLBACK_COVER_URL = 'https://trailpaint.org/examples/trailpaint-hero.jpg';

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
  //   (A) { hash, name?, cover? }             ← current frontend, zero Worker CPU
  //   (B) { v, n, c, z, s, r, ... }           ← legacy frontend (worker-side deflate)
  // Shape A keeps us clear of the 10ms free-tier CPU budget on photo-heavy
  // payloads; shape B is retained as a backward-compat path for any cached
  // old frontend bundle still around.
  // Optional `name` and `cover` enable Open Graph previews on /s/:id —
  // cover is a plain base64 JPEG (no data URL prefix) served later via
  // /s/:id/cover.jpg for social media bots.
  let hash;
  let name = null;
  let cover = null;
  if (typeof parsed.hash === 'string') {
    if (!HASH_PATTERN.test(parsed.hash)) {
      return errorJson('invalid hash format', 400);
    }
    hash = parsed.hash;
    if (typeof parsed.name === 'string' && parsed.name.length <= MAX_NAME_LEN) {
      name = parsed.name;
    }
    if (typeof parsed.cover === 'string'
        && parsed.cover.length <= MAX_COVER_BYTES
        && COVER_PATTERN.test(parsed.cover)) {
      cover = parsed.cover;
    }
  } else {
    const schemaErr = validateCompactSchema(parsed);
    if (schemaErr) {
      return errorJson(schemaErr, 400);
    }
    hash = await compressAndBase64(JSON.stringify(parsed));
    if (typeof parsed.n === 'string' && parsed.n.length <= MAX_NAME_LEN) {
      name = parsed.n;
    }
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
    name,
    cover,
    userId: null,
    createdAt: Math.floor(Date.now() / 1000),
    v: 3,
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

function htmlEscape(s) {
  return String(s).replace(/[<>&"']/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

async function handleCover(id, env, ctx, request) {
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const raw = await env.SHARE_KV.get(id);
  if (!raw) {
    return Response.redirect(FALLBACK_COVER_URL, 302);
  }
  let envelope;
  try { envelope = JSON.parse(raw); }
  catch { return Response.redirect(FALLBACK_COVER_URL, 302); }

  if (typeof envelope.cover !== 'string' || !envelope.cover) {
    return Response.redirect(FALLBACK_COVER_URL, 302);
  }

  // Base64 → binary. Small covers (≤300KB) decode in ~1-2ms, safely under
  // the 10ms CPU budget. Nothing heavier runs in this path.
  const binary = atob(envelope.cover);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const response = new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
      'X-Served-By': 'trailpaint-share',
    },
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

async function handleGet(request, env, ctx) {
  const url = new URL(request.url);
  // /s/:id/cover.jpg — social media OG image endpoint
  const coverMatch = url.pathname.match(/^\/s\/([A-Za-z0-9_-]{12})\/cover\.jpg$/);
  if (coverMatch) {
    return handleCover(coverMatch[1], env, ctx, request);
  }

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
  //
  // OG meta lets LINE / Facebook / Twitter / Slack render a real preview
  // with the first spot photo. Social bots don't execute the JS redirect —
  // they just scrape these tags. Missing cover → Worker's /cover.jpg route
  // 302-redirects to a static brand image, so the preview always renders.
  const pageTitle = envelope.name
    ? `${htmlEscape(envelope.name)} — TrailPaint`
    : 'TrailPaint 路小繪';
  const pageDesc = envelope.name
    ? `由 TrailPaint 路小繪製作的手繪風路線地圖 — ${htmlEscape(envelope.name)}`
    : '由 TrailPaint 路小繪製作的手繪風路線地圖';
  const shareUrl = `${ORIGIN}/s/${id}`;
  const coverUrl = `${shareUrl}/cover.jpg`;
  const html = `<!doctype html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<title>${pageTitle}</title>
<meta name="description" content="${pageDesc}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="TrailPaint 路小繪">
<meta property="og:title" content="${pageTitle}">
<meta property="og:description" content="${pageDesc}">
<meta property="og:url" content="${shareUrl}">
<meta property="og:image" content="${coverUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${pageTitle}">
<meta name="twitter:description" content="${pageDesc}">
<meta name="twitter:image" content="${coverUrl}">
<script>
(function(){
  var h = ${JSON.stringify(hash)};
  try {
    sessionStorage.setItem('tp_share_hash', h);
    location.replace(${JSON.stringify(ORIGIN + '/app/player/?share=ss')});
  } catch (e) {
    location.replace(${JSON.stringify(ORIGIN + '/app/player/#share=')} + h);
  }
})();
</script>
</head>
<body>
<noscript><p>請啟用 JavaScript 以開啟分享連結。</p></noscript>
</body>
</html>`;

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
