export interface CommonsHit {
  thumbUrl: string;
  mime: string;
  license: string;
  author: string;
  authorUrl: string | null;
  sourceUrl: string;
}

const API = 'https://commons.wikimedia.org/w/api.php';
const THUMB_WIDTH = 600;

interface CommonsImageInfo {
  thumburl: string;
  mime: string;
  extmetadata?: Record<string, { value: string }>;
}

interface CommonsPage {
  title: string;
  imageinfo?: CommonsImageInfo[];
}

interface CommonsApiResponse {
  query?: { pages?: Record<string, CommonsPage> };
}

/**
 * Search Commons for the first matching photo. Accepts a single keyword or
 * `|`-separated multi-candidate query (e.g. `"頭城濱海森林公園|Toucheng Beach Park"`).
 * When multi-candidate, tries each in order and returns the first hit — 實測
 * Commons full-text 搜尋把「中文|English」當一個字串會兩邊都打不到；拆開後
 * 中文先試命中率較高（台灣地點本地上傳者多用中文命名）。
 */
export async function searchCommonsPhoto(
  query: string,
  signal?: AbortSignal,
): Promise<CommonsHit | null> {
  if (!query.trim()) return null;
  const candidates = query
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  if (candidates.length === 0) return null;
  for (let i = 0; i < candidates.length; i++) {
    const hit = await searchSingleCandidate(candidates[i], signal);
    if (hit) return hit;
    // 同 spot 內多 candidate 之間 sleep 150ms（spot 間的 500ms 另計），避免
    // 搜 2 次對同一 IP 累積太密集。AbortSignal 即時拋 DOMException。
    if (i < candidates.length - 1) await sleep(150, signal);
  }
  return null;
}

/** Per-candidate fetch timeout. Caller's outer signal still wins; this is a
 *  defence-in-depth floor for callers that forget to pass one (e.g. tests). */
const CANDIDATE_TIMEOUT_MS = 15_000;

async function searchSingleCandidate(query: string, signal?: AbortSignal): Promise<CommonsHit | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '1',
    prop: 'imageinfo',
    iiprop: 'url|mime|extmetadata',
    iiurlwidth: String(THUMB_WIDTH),
    iiextmetadatafilter: 'LicenseShortName|Artist|Credit',
  });
  // Compose caller signal with a self-imposed timeout so a hanging Commons
  // request can't keep the import wizard pending indefinitely.
  const innerSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(CANDIDATE_TIMEOUT_MS)])
    : AbortSignal.timeout(CANDIDATE_TIMEOUT_MS);
  const res = await fetch(`${API}?${params}`, { signal: innerSignal });
  if (!res.ok) return null;
  const data = (await res.json()) as CommonsApiResponse;
  const pages = data.query?.pages;
  if (!pages) return null;
  const first = Object.values(pages)[0];
  if (!first?.imageinfo?.[0]) return null;
  const info = first.imageinfo[0];
  if (!info.mime.startsWith('image/')) return null;
  const meta = info.extmetadata ?? {};
  const artistRaw = meta.Artist?.value ?? 'Unknown';
  const parsed = parseArtistHtml(artistRaw);
  const sourceUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(first.title)}`;
  return {
    thumbUrl: info.thumburl,
    mime: info.mime,
    license: meta.LicenseShortName?.value ?? 'Unknown',
    author: parsed.name,
    authorUrl: parsed.url,
    sourceUrl,
  };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('aborted', 'AbortError'));
    });
  });
}

// regex parse (browser + node/vitest 通吃；瀏覽器 DOMParser('text/html') 行為在 vitest
// 的 @xmldom/xmldom 替身下對 HTML fragment 會崩 "missing root element"；用 regex 只做
// tag strip + entity decode + 第一個 <a href=...> 抽取已足夠 Commons Artist 格式)
export function parseArtistHtml(html: string): { name: string; url: string | null } {
  const name = stripHtmlToText(html) || 'Unknown';
  const url = extractFirstHref(html);
  return { name, url };
}

function stripHtmlToText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, '')).trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractFirstHref(html: string): string | null {
  const m = html.match(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i);
  if (!m) return null;
  const href = m[1];
  if (href.startsWith('//')) return `https:${href}`;
  if (href.startsWith('/')) return `https://commons.wikimedia.org${href}`;
  // Reject non-http(s) absolute hrefs at extraction time. `javascript:`,
  // `data:`, `vbscript:` etc would otherwise reach migrateProject's authorUrl
  // sanitiser as the only line of defence — belt + suspenders.
  if (!/^https?:\/\//i.test(href)) return null;
  return href;
}
