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

export async function searchCommonsPhoto(
  query: string,
  signal?: AbortSignal,
): Promise<CommonsHit | null> {
  if (!query.trim()) return null;
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
  const res = await fetch(`${API}?${params}`, { signal });
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
  return href;
}
