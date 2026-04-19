/**
 * Cloudflare Worker — Markdown Content Negotiation for trailpaint.org
 *
 * Intercepts requests with `Accept: text/markdown` and serves the corresponding
 * pre-rendered .md file, bypassing the HTML version. Falls through to origin
 * (GitHub Pages) for all other requests.
 *
 * Why: AI crawlers (Claude Code, ChatGPT browse, Perplexity, etc.) that support
 * Accept header content negotiation get token-efficient markdown (~5× savings)
 * instead of HTML + JSON-LD + scripts + styles. Required for canaisee "Agent-
 * native" score and general GEO/AEO optimization.
 *
 * Deploy:
 *   1. Cloudflare Dashboard → Workers & Pages → Create → Worker → paste this file
 *   2. Settings → Triggers → Add Route → `trailpaint.org/*` → Zone: trailpaint.org
 *   3. Test: `curl -H "Accept: text/markdown" https://trailpaint.org/ -I`
 *      → should see `content-type: text/markdown; charset=utf-8`
 *
 * Free tier: 100k requests/day, plenty for current traffic.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const accept = request.headers.get('Accept') || '';

    // Only intercept GET/HEAD requests that explicitly want markdown
    const wantsMarkdown =
      (request.method === 'GET' || request.method === 'HEAD') &&
      accept.includes('text/markdown');

    if (!wantsMarkdown) {
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
        // Request raw content; avoid recursion by not forwarding markdown accept
        'Accept': 'text/plain, text/markdown, */*',
        'User-Agent': request.headers.get('User-Agent') || 'Cloudflare-Worker-MarkdownNegotiation/1.0',
      },
      cf: { cacheTtl: 600, cacheEverything: true },
    });

    // Fallback: .md doesn't exist → serve original HTML
    if (!mdRes.ok) {
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
      },
    });
  },
};
