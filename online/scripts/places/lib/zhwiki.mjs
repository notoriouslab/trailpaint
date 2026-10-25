/**
 * zh.wikipedia lookups for merged groups (020 D4/D6): the infobox gives a
 * second encyclopedic year, the intro gives desc material. Responses are
 * cached under .cache/places/zhwiki/.
 */
import { existsSync } from 'node:fs';
import { cachePath, fetchJson, readJson, sleep, writeJson } from './cache.mjs';
import { parseYear } from './years.mjs';

const OPENED_KEYS = /^(open|opened|opening|opening_date|opened_date|built|completed|completion_date|created|啟用|啟用日期|開業|開業日期|開幕|開館|落成|建成|竣工|通車|開站|開放)$/i;
const FOUNDED_KEYS = /^(established|founded|founded_date|establishment|創校|創立|成立|創建|設立)$/i;

/** Infobox `| key = value` lines → { year, kind } (opened beats founded), or null. */
export function infoboxYear(wikitext) {
  let founded = null;
  for (const line of String(wikitext ?? '').split('\n').slice(0, 120)) {
    const m = line.match(/^\s*\|\s*([^=|]+?)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const isOpened = OPENED_KEYS.test(key);
    if (!isOpened && !FOUNDED_KEYS.test(key)) continue;
    const year = valueYear(m[2]);
    if (!year) continue;
    if (isOpened) return { year, kind: 'opened' };
    founded ??= { year, kind: 'founded' };
  }
  return founded;
}

/** "{{start date and age|1994|3|29}}" / "1937年3月15日" / "民國41年" → year. */
export function valueYear(raw) {
  const v = String(raw).replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>.*?<\/ref>/g, '');
  const tpl = v.match(/\{\{\s*start date[^|]*\|\s*(\d{4})/i);
  if (tpl) return parseYear(Number(tpl[1]));
  const roc = v.match(/民國\s*(\d{1,3})\s*年/);
  if (roc) return parseYear(`民國${roc[1]}`);
  const y = v.match(/(?<!\d)(1[6-9]\d\d|20\d\d)(?!\d)/);
  return y ? parseYear(Number(y[1])) : null;
}

/** First sentence(s) of the intro, up to maxLen chars, ending on 。 */
export function introSentence(extract, maxLen = 140) {
  const text = String(extract ?? '').replace(/\s+/g, '');
  let out = '';
  for (const s of text.split(/(?<=。)/)) {
    if (!s.endsWith('。') || (out && out.length + s.length > maxLen)) break;
    out += s;
  }
  return out;
}

/** Fetch (or read cached) page → { title, wikitext, extract } | null. */
export async function fetchPage(title) {
  const path = cachePath('zhwiki', `${encodeURIComponent(title)}.json`);
  if (existsSync(path)) return readJson(path);
  const params = new URLSearchParams({
    action: 'query', titles: title, prop: 'revisions|extracts', rvprop: 'content', rvslots: 'main',
    exintro: '1', explaintext: '1', redirects: '1', variant: 'zh-tw', format: 'json',
  });
  const d = await fetchJson(`https://zh.wikipedia.org/w/api.php?${params}`);
  await sleep(500);
  const p = Object.values(d.query?.pages ?? {})[0];
  const page = !p || 'missing' in p ? null : {
    title: p.title,
    wikitext: p.revisions?.[0]?.slots?.main?.['*'] ?? '',
    extract: p.extract ?? '',
  };
  writeJson(path, page);
  return page;
}
