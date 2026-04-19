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
 * Deploy: see cloudflare/README.md for Dashboard setup steps.
 *
 * Free tier: Workers 100k req/day, KV 1GB/10k reads/1k writes per day,
 * Analytics Engine currently free for all plans.
 *
 * This is the Task 1 skeleton. Task 2 adds POST handler, Task 3 adds GET
 * handler with cache, Task 4 adds Analytics Engine writes.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/s' && request.method === 'POST') {
      return Response.json({ ok: true, phase: 'skeleton' });
    }

    if (url.pathname.startsWith('/s/')) {
      return new Response('skeleton GET', { status: 200 });
    }

    return new Response('not found', { status: 404 });
  },
};
