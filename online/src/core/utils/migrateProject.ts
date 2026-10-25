import type { Project, Spot, OverlaySetting, MusicSetting, PhotoMeta, SpotEra } from '../models/types';
import { DEFAULT_CARD_OFFSET } from '../models/types';
import type { Route } from '../models/routes';
import { ROUTE_COLORS } from '../models/routes';
import { isAllowedMediaUrl } from './embedCode';
import { sanitizeEra } from '../../map/eraFade';
import { stripUnsafeChars } from './textSanitize';

/**
 * Validate and migrate raw JSON data to a Project.
 * Used by both Editor (importJSON) and Player (load).
 *
 * v3.1 (013-ai-photo-commons): Spot 新增 optional `photoMeta`（Commons attribution）
 * 與 `photo_query`（LLM 匯入關鍵字）。非 break change，v3 資料 migrate 後兩欄位皆
 * undefined。photoMeta 白名單驗證：source 限 'wikimedia-commons' / 'maintainer' /
 * 'public-domain-archive'（024），各有自己的 sourceUrl 規則；驗證失敗則整個 photoMeta
 * 設 undefined（all-or-nothing，避免部分保留造成 UI 不一致）。
 */
/** authorUrl 降級規則：只接受 https://{*.wikimedia.org, *.wikipedia.org}；其他 → null。
 *  Commons 的 Artist 欄位經常連外部（Wikipedia 其他語言、Flickr、個人站），
 *  但 attribution 義務比「author 可點連結」重要——寧可保留姓名不連結，也不因
 *  authorUrl 不合白名單丟掉整個 photoMeta（等於無 attribution）。 */
/** Remove JSON-LD decoration fields that may have leaked from a hand-crafted
 *  file where the attacker nested `@type` / `@id` inside a spot/route. Without
 *  this, the subsequent `{ ...s as Spot }` spread would carry them into store
 *  → next export would serve them back to AI agents.
 *
 *  NOTE: v5+ caution — if Spot/Route ever gains a legitimate `@id` field (e.g.
 *  W3C Web Annotation / ActivityPub IRIs), this unconditional delete needs to
 *  be redesigned into an allow-list at the call site. */
function stripJsonLdKeys(obj: Record<string, unknown>): void {
  delete obj['@context'];
  delete obj['@type'];
  delete obj['@id'];
  delete obj.itinerary;
}

/** 024: archives whose photos may carry a public-domain-archive photoMeta.
 *  Exact hostname match only — no suffix match, so lookalike subdomains fail. */
const ARCHIVE_HOSTS = new Set([
  'commons.wikimedia.org',
  'tcmb.culture.tw',
  'openmuseum.tw',
  'ahonline.drnh.gov.tw',
  'www.flickr.com',
  'archive.org',
]);

function isArchiveUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string' || !raw.startsWith('https://')) return false;
  try {
    return ARCHIVE_HOSTS.has(new URL(raw).hostname.toLowerCase());
  } catch {
    return false; // malformed URL
  }
}

function sanitizeAuthorUrl(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return null;
  if (!raw.startsWith('https://')) return null;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    if (host === 'wikimedia.org' || host.endsWith('.wikimedia.org')) return raw;
    if (host === 'wikipedia.org' || host.endsWith('.wikipedia.org')) return raw;
  } catch { /* malformed URL */ }
  return null;
}

export function migrateProject(data: Record<string, unknown>): Project {
  // Basic schema validation
  if (!data || typeof data !== 'object') throw new Error('Invalid project data');
  // Strip JSON-LD decoration fields added by exporter for AI agents. These
  // are not part of the Project schema; authoritative data lives in the
  // native fields (version/name/spots/routes/...). Applied recursively at each
  // spread boundary below (spot/route loops) to block nested injection attacks.
  stripJsonLdKeys(data);
  if (!Array.isArray(data.spots)) throw new Error('Missing or invalid spots');
  if (!Array.isArray(data.center) || data.center.length !== 2) throw new Error('Missing or invalid center');
  // Clamp center to valid lat/lng range
  data.center = [
    Math.max(-90, Math.min(90, Number(data.center[0]) || 0)),
    Math.max(-180, Math.min(180, Number(data.center[1]) || 0)),
  ];
  if (typeof data.zoom !== 'number' || isNaN(data.zoom)) throw new Error('Missing or invalid zoom');
  if (typeof data.name !== 'string') data.name = 'Untitled';

  // Semantic limits — prevent UI freeze from absurd data
  if (data.spots.length > 200) throw new Error('Too many spots (max 200)');

  // Validate each spot — skip invalid ones instead of rejecting entire import
  // Photo safety: raster image MIME whitelist (no SVG, no unknown formats).
  // Editor always outputs data:image/jpeg; these five cover all legitimate encoders.
  const SAFE_PHOTO_RE = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i;
  const SINGLE_PHOTO_LIMIT = 1 * 1024 * 1024; // 1 MB per photo (Editor outputs ~300KB)
  const TOTAL_PHOTO_LIMIT = 50 * 1024 * 1024; // 50 MB aggregate cap (DoS defense)
  let totalPhotoBytes = 0;

  const spots: Spot[] = [];
  for (const raw of data.spots as unknown[]) {
    if (!raw || typeof raw !== 'object') continue;
    const s = raw as Record<string, unknown>;
    if (!s.id || typeof s.id !== 'string') continue;
    if (!Array.isArray(s.latlng) || s.latlng.length !== 2) continue;
    if (typeof s.latlng[0] !== 'number' || typeof s.latlng[1] !== 'number'
      || !isFinite(s.latlng[0] as number) || !isFinite(s.latlng[1] as number)) continue;
    // Only allow whitelisted raster data URLs (blocks SVG scripts, external URLs, tracking pixels)
    const rawPhoto = (s as Record<string, unknown>).photo;
    const safePhoto = typeof rawPhoto === 'string' && SAFE_PHOTO_RE.test(rawPhoto) ? rawPhoto : null;

    // Clamp string lengths to prevent data bombs. Empirical max across all
    // bundled projects (2026-04-20): title 36 (resurrection), desc 215
    // (maxwell) — 80/500 leaves ~2x headroom without encouraging bloat.
    const title = typeof s.title === 'string' ? s.title.slice(0, 80) : '';
    const desc = typeof s.desc === 'string' ? s.desc.slice(0, 500) : '';

    // Per-photo size cap + aggregate cap (prevent 200 × 2MB memory bomb)
    let clampedPhoto: string | null = safePhoto && safePhoto.length <= SINGLE_PHOTO_LIMIT ? safePhoto : null;
    if (clampedPhoto) {
      if (totalPhotoBytes + clampedPhoto.length > TOTAL_PHOTO_LIMIT) {
        clampedPhoto = null; // Remaining spots in a huge import lose photos (data preserved otherwise)
      } else {
        totalPhotoBytes += clampedPhoto.length;
      }
    }

    // scripture_refs (v3+): filter non-string elements, cap array len + string len
    // Content (e.g. "javascript:alert(1)") kept as-is; bibleUrl layer whitelists book codes
    let scriptureRefs: string[] | undefined;
    if (Array.isArray(s.scripture_refs)) {
      scriptureRefs = (s.scripture_refs as unknown[])
        .filter((el): el is string => typeof el === 'string')
        .slice(0, 10)
        .map((str) => str.slice(0, 50));
      if (scriptureRefs.length === 0) scriptureRefs = undefined;
    }

    // photo_query (v3.1+, 013): LLM 產的搜尋關鍵字；只做型別驗證，非字串設 undefined
    const photoQuery = typeof s.photo_query === 'string' ? s.photo_query.slice(0, 200) : undefined;

    // era (v5+, 016): year window for TimeSlider opacity fade. sanitize rejects
    // NaN / inverted / out-of-bounds; rejection drops the field entirely (era-agnostic).
    const era: SpotEra | undefined = sanitizeEra(s.era);

    // takenAt (v5.1+, 018): ISO capture time. Must be a parseable date string;
    // capped at 40 chars (ISO 8601 with offset is 32 max — cap blocks data bombs).
    const takenAt =
      typeof s.takenAt === 'string' && s.takenAt.length <= 40 && !isNaN(Date.parse(s.takenAt))
        ? s.takenAt
        : undefined;

    // photoMeta (v3.1+, 013): Commons attribution。
    // 白名單原則：source / sourceUrl 嚴格（Commons 身份識別，不容錯）；
    // authorUrl 降級（Commons Artist 常連外部 Wikipedia/個人站，reject 太
    // 嚴會讓多數 Commons 圖失去 attribution → CC BY 合規漏洞）→ 非
    // *.wikimedia.org / *.wikipedia.org hostname 一律設 null，保留其他欄位。
    let photoMeta: PhotoMeta | undefined;
    if (s.photoMeta && typeof s.photoMeta === 'object') {
      const pm = s.photoMeta as Record<string, unknown>;
      const source = pm.source;
      const license = pm.license;
      const author = pm.author;
      const authorUrl = pm.authorUrl;
      const sourceUrl = pm.sourceUrl;
      // 024: three sources, each with its own sourceUrl rule (all-or-nothing):
      //   wikimedia-commons     → https://commons.wikimedia.org/…
      //   maintainer            → sourceUrl must be null (own photo, nothing to link)
      //   public-domain-archive → https URL on ARCHIVE_HOSTS
      let validSourceUrl: string | null | undefined;
      if (source === 'wikimedia-commons') {
        if (typeof sourceUrl === 'string' && sourceUrl.startsWith('https://commons.wikimedia.org/')) validSourceUrl = sourceUrl;
      } else if (source === 'maintainer') {
        if (sourceUrl === null || sourceUrl === undefined) validSourceUrl = null;
      } else if (source === 'public-domain-archive') {
        if (isArchiveUrl(sourceUrl)) validSourceUrl = sourceUrl;
      }
      if (validSourceUrl !== undefined
          && typeof license === 'string' && typeof author === 'string') {
        photoMeta = {
          source: source as PhotoMeta['source'],
          // sanitize: strip control / bidi / invisible chars to prevent display hijack in AI output
          license: stripUnsafeChars(license.slice(0, 80)),
          author: stripUnsafeChars(author.slice(0, 120)),
          authorUrl: sanitizeAuthorUrl(authorUrl),
          sourceUrl: validSourceUrl,
        };
        const origin = typeof pm.origin === 'string' ? stripUnsafeChars(pm.origin.slice(0, 200)).trim() : '';
        if (origin) photoMeta.origin = origin;
        const published = pm.published;
        if (typeof published === 'number' && Number.isInteger(published)
            && published >= 1800 && published <= new Date().getFullYear()) {
          photoMeta.published = published;
        }
      }
    }

    const spot: Spot = {
      ...(s as unknown as Spot),
      title,
      desc,
      photo: clampedPhoto,
      // Clamp to [1, 9999]: spot.num renders inside a 28px circular badge in the
      // Player marker; values like 1e308 destroy layout and serialise weirdly.
      // Also rejects non-finite (NaN / Infinity).
      num: typeof s.num === 'number' && Number.isFinite(s.num) && s.num > 0
        ? Math.min(Math.round(s.num), 9999)
        : spots.length + 1,
      cardOffset: s.cardOffset && typeof (s.cardOffset as Record<string, unknown>).x === 'number'
        && typeof (s.cardOffset as Record<string, unknown>).y === 'number'
        ? (s.cardOffset as Spot['cardOffset'])
        : { ...DEFAULT_CARD_OFFSET },
    };
    // Deep-strip: attacker may have nested @type/@id/itinerary inside the spot
    // to survive the top-level strip. Spread above would have copied them.
    stripJsonLdKeys(spot as unknown as Record<string, unknown>);
    if (scriptureRefs) {
      spot.scripture_refs = scriptureRefs;
    } else {
      delete spot.scripture_refs;
    }
    // v4+ pendingLocation: only preserve genuine boolean true — spread could
    // otherwise carry strings/numbers through and trick `=== true` checks
    if (s.pendingLocation === true) {
      spot.pendingLocation = true;
    } else {
      delete spot.pendingLocation;
    }
    // v3.1+ photo_query / photoMeta (013): explicit set-or-delete 以覆蓋 spread 帶入的未驗證值
    if (photoQuery) spot.photo_query = photoQuery; else delete spot.photo_query;
    if (photoMeta) spot.photoMeta = photoMeta; else delete spot.photoMeta;
    // v5+ era (016): explicit set-or-delete (sanitize already rejected invalid input)
    if (era) spot.era = era; else delete spot.era;
    // v5.1+ takenAt (018): explicit set-or-delete
    if (takenAt) spot.takenAt = takenAt; else delete spot.takenAt;
    spots.push(spot);
  }

  const p = { ...(data as unknown as Project), spots };
  if (!p.routes || !Array.isArray(p.routes)) {
    return { ...p, version: 5, routes: [] };
  }
  if (p.routes.length > 50) throw new Error('Too many routes (max 50)');
  const validColorIds = ROUTE_COLORS.map((c) => c.id);
  const routes: Route[] = [];
  for (const raw of p.routes as unknown as unknown[]) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    if (!r.id || typeof r.id !== 'string') continue;
    if (!Array.isArray(r.pts) || r.pts.length < 1 || r.pts.length > 5000) continue;
    const validPts = (r.pts as unknown[]).every(
      (pt) => Array.isArray(pt) && pt.length === 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number'
        && isFinite(pt[0] as number) && isFinite(pt[1] as number),
    );
    if (!validPts) continue;
    const route: Route = {
      ...(r as unknown as Route),
      name: (r.name as string) ?? '',
      color: validColorIds.includes(r.color as string) ? (r.color as string) : ROUTE_COLORS[0].id,
      elevations: Array.isArray(r.elevations) && r.elevations.length <= 5000 ? (r.elevations as number[]) : null,
    };
    stripJsonLdKeys(route as unknown as Record<string, unknown>);
    
    if (r.hidden === true) {
      route.hidden = true;
    } else {
      delete route.hidden;
    }
    
    if (Array.isArray(r.spotIds)) {
      const validSpotIds = (r.spotIds as unknown[])
        .filter((id): id is string => typeof id === 'string')
        .map((id) => id.slice(0, 50)) // 限制每個 ID 長度 (spot ID 通常是 uuid 或自訂短字串)
        .slice(0, 200); // 限制陣列上限為 200
      if (validSpotIds.length > 0) {
        route.spotIds = validSpotIds;
      } else {
        delete route.spotIds;
      }
    } else {
      delete route.spotIds;
    }
    
    routes.push(route);
  }
  // Validate optional overlay setting
  let overlay: OverlaySetting | undefined;
  if (data.overlay && typeof data.overlay === 'object') {
    const ov = data.overlay as Record<string, unknown>;
    if (typeof ov.id === 'string' && typeof ov.opacity === 'number'
        && ov.opacity >= 0 && ov.opacity <= 1) {
      overlay = { id: ov.id, opacity: ov.opacity };
    }
  }
  // Validate optional basemapId (capped at 50 chars to prevent memory waste)
  const basemapId = typeof data.basemapId === 'string' ? data.basemapId.slice(0, 50) : undefined;
  // Validate optional music setting via shared whitelist (see isAllowedMediaUrl)
  let music: MusicSetting | undefined;
  if (data.music && typeof data.music === 'object') {
    const m = data.music as Record<string, unknown>;
    if (typeof m.url === 'string' && isAllowedMediaUrl(m.url)) {
      music = { url: m.url, autoplay: !!m.autoplay };
    }
  }
  // Validate optional eraMode (019) — whitelist; anything else drops the field (= 'fade')
  const eraMode = data.eraMode === 'fade' || data.eraMode === 'cumulative' ? data.eraMode : undefined;
  // Validate optional layout (021) — whitelist, same as eraMode
  const layout = data.layout === 'site' ? 'site' : undefined;
  // Explicit optional-field handling: ...p spread would carry raw input values through
  // even when validation rejects them. Delete = input overridden by sanitized result.
  const result: Project = { ...p, version: 5, routes };
  if (overlay) result.overlay = overlay; else delete result.overlay;
  if (basemapId) result.basemapId = basemapId; else delete result.basemapId;
  if (music) result.music = music; else delete result.music;
  if (eraMode) result.eraMode = eraMode; else delete result.eraMode;
  if (layout) result.layout = layout; else delete result.layout;
  return result;
}
