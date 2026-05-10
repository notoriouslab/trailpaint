/**
 * Cloudflare Worker — Markdown Content Negotiation + AEO agent-discovery for trailpaint.org
 *
 * Three responsibilities:
 *   1. Intercept requests with `Accept: text/markdown` → serve the matching
 *      pre-rendered .md file (saves ~5× tokens for AI crawlers vs full HTML).
 *   2. Fix `/.well-known/api-catalog` Content-Type to `application/linkset+json`
 *      (RFC 9727 — GitHub Pages would otherwise serve it as text/plain and
 *      RFC 9264 scanners reject it). Same for `/.well-known/trailpaint`
 *      → `application/json` (extensionless files default to octet-stream).
 *   3. Inject an RFC 8288 `Link:` response header on homepage / stories
 *      pointing agents at llms.txt / agent-card / agent-skills / api-catalog /
 *      sitemap so automated discovery doesn't need HTML scraping.
 *
 * All other requests pass through to the GitHub Pages origin unchanged.
 *
 * Deploy: paste into the Dashboard Worker named
 * `trailpaint-markdown-negotiation`. Route: `trailpaint.org/*`.
 *
 * Free tier: 100k requests/day, plenty for current traffic.
 */

// RFC 8288 Link header values (joined with ", " — a single header, multiple entries).
// kept short and useful: describedby for llms.txt, service-desc for the A2A
// agent card, and explicit rel labels for api-catalog / sitemap / skills.
const AGENT_LINKS = [
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</.well-known/agent-card.json>; rel="service-desc"; type="application/json"',
  '</.well-known/agent-skills/index.json>; rel="agent-skills"; type="application/json"',
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</.well-known/trailpaint>; rel="describedby"; type="application/json"',
  '</schemas/project-v3.schema.json>; rel="profile"; type="application/schema+json"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
].join(', ');

/** Only content HTML pages get Link headers.
 *  Everything else (assets, /app/, /api/, .well-known itself) pass through. */
function shouldInjectLinkHeader(pathname) {
  if (pathname === '/' || pathname === '/index.html') return true;
  if (pathname === '/faq' || pathname === '/faq/' || pathname === '/faq/index.html') return true;
  if (pathname === '/examples' || pathname === '/examples/' || pathname === '/examples/index.html') return true;
  if (pathname.startsWith('/features/') && (pathname.endsWith('/') || pathname.endsWith('.html'))) return true;
  if (pathname === '/features' || pathname === '/features/index.html') return true;
  if (pathname === '/stories/' || pathname === '/stories/index.html') return true;
  if (pathname.startsWith('/stories/') && (pathname.endsWith('/') || pathname.endsWith('.html'))) return true;
  return false;
}

async function injectLinkHeader(request) {
  const originRes = await fetch(request);
  // Clone so we can mutate headers (Response headers are otherwise immutable).
  const headers = new Headers(originRes.headers);
  headers.set('Link', AGENT_LINKS);
  return new Response(originRes.body, {
    status: originRes.status,
    statusText: originRes.statusText,
    headers,
  });
}

async function serveApiCatalog(request) {
  // GitHub Pages serves the raw file; we refetch it and rewrite Content-Type.
  const originRes = await fetch(request, { cf: { cacheTtl: 600, cacheEverything: true } });
  if (!originRes.ok) return originRes;
  const body = await originRes.text();
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/linkset+json',
      'Cache-Control': 'public, max-age=600, s-maxage=600',
      'X-Served-By': 'cf-worker-markdown-negotiation',
    },
  });
}

async function serveTrailpaintDiscovery(request) {
  // .well-known/trailpaint has no extension — GitHub Pages defaults to
  // application/octet-stream, but JSON-LD parsers / AI agents expect JSON.
  const originRes = await fetch(request, { cf: { cacheTtl: 600, cacheEverything: true } });
  if (!originRes.ok) return originRes;
  const body = await originRes.text();
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=600',
      'X-Served-By': 'cf-worker-markdown-negotiation',
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const accept = request.headers.get('Accept') || '';

    // Content-Type fix for api-catalog (must match RFC 9727)
    if ((request.method === 'GET' || request.method === 'HEAD') &&
        url.pathname === '/.well-known/api-catalog') {
      return serveApiCatalog(request);
    }

    // Content-Type fix for trailpaint discovery (GitHub Pages defaults to octet-stream)
    if ((request.method === 'GET' || request.method === 'HEAD') &&
        url.pathname === '/.well-known/trailpaint') {
      return serveTrailpaintDiscovery(request);
    }

    // Only intercept GET/HEAD requests that explicitly want markdown
    const wantsMarkdown =
      (request.method === 'GET' || request.method === 'HEAD') &&
      accept.includes('text/markdown');

    if (!wantsMarkdown) {
      // Add RFC 8288 Link header to discoverable pages for AEO scanners.
      if ((request.method === 'GET' || request.method === 'HEAD') &&
          shouldInjectLinkHeader(url.pathname)) {
        return injectLinkHeader(request);
      }
      return fetch(request);
    }

    // Map URL path → .md file path
    //   /                                → /index.md
    //   /stories/                        → /stories/index.md
    //   /stories/passion-week/           → /stories/passion-week/index.md
    //   /foo/bar.html                    → /foo/bar.md    (rare)
    //   /llms.txt, /sitemap.xml, etc.    → unchanged
    let mdPath = url.pathname;
    if (mdPath.endsWith('/')) {
      mdPath += 'index.md';
    } else if (mdPath.endsWith('.html')) {
      mdPath = mdPath.replace(/\.html$/, '.md');
    } else if (!/\.[a-z0-9]+$/i.test(mdPath)) {
      // No extension: treat as directory-style (add /index.md)
      mdPath += '/index.md';
    } else if (!mdPath.endsWith('.md')) {
      // Has a different extension (e.g. .json, .txt) — pass through
      return fetch(request);
    }

    // Try to fetch the .md file from origin (GitHub Pages)
    const mdUrl = `${url.origin}${mdPath}`;
    const mdRes = await fetch(mdUrl, {
      headers: {
        'Accept': 'text/plain, text/markdown, */*',
        'User-Agent': request.headers.get('User-Agent') || 'Cloudflare-Worker-MarkdownNegotiation/1.0',
      },
      cf: { cacheTtl: 600, cacheEverything: true },
    });

    // Fallback: .md doesn't exist → serve original HTML (with Link header if root)
    if (!mdRes.ok) {
      if (shouldInjectLinkHeader(url.pathname)) {
        return injectLinkHeader(request);
      }
      return fetch(request);
    }

    const body = await mdRes.text();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Vary': 'Accept',
        'Cache-Control': 'public, max-age=600, s-maxage=600',
        'X-Served-By': 'cf-worker-markdown-negotiation',
        'X-Source-Path': mdPath,
        'Link': AGENT_LINKS,
      },
    });
  },
};
