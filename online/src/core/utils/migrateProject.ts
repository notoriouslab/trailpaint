import type { Project, Spot, OverlaySetting, MusicSetting } from '../models/types';
import { DEFAULT_CARD_OFFSET } from '../models/types';
import type { Route } from '../models/routes';
import { ROUTE_COLORS } from '../models/routes';
import { isAllowedMediaUrl } from './embedCode';

/**
 * Validate and migrate raw JSON data to a Project.
 * Used by both Editor (importJSON) and Player (load).
 */
export function migrateProject(data: Record<string, unknown>): Project {
  // Basic schema validation
  if (!data || typeof data !== 'object') throw new Error('Invalid project data');
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

    const spot: Spot = {
      ...(s as unknown as Spot),
      title,
      desc,
      photo: clampedPhoto,
      num: typeof s.num === 'number' && s.num > 0 ? Math.round(s.num) : spots.length + 1,
      cardOffset: s.cardOffset && typeof (s.cardOffset as Record<string, unknown>).x === 'number'
        && typeof (s.cardOffset as Record<string, unknown>).y === 'number'
        ? (s.cardOffset as Spot['cardOffset'])
        : { ...DEFAULT_CARD_OFFSET },
    };
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
    spots.push(spot);
  }

  const p = { ...(data as unknown as Project), spots };
  if (!p.routes || !Array.isArray(p.routes)) {
    return { ...p, version: 4, routes: [] };
  }
  if (p.routes.length > 50) throw new Error('Too many routes (max 50)');
  const validColorIds = ROUTE_COLORS.map((c) => c.id);
  const routes: Route[] = [];
  for (const raw of p.routes as unknown as unknown[]) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    if (!r.id || typeof r.id !== 'string') continue;
    if (!Array.isArray(r.pts) || r.pts.length < 2 || r.pts.length > 5000) continue;
    const validPts = (r.pts as unknown[]).every(
      (pt) => Array.isArray(pt) && pt.length === 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number'
        && isFinite(pt[0] as number) && isFinite(pt[1] as number),
    );
    if (!validPts) continue;
    routes.push({
      ...(r as unknown as Route),
      name: (r.name as string) ?? '',
      color: validColorIds.includes(r.color as string) ? (r.color as string) : ROUTE_COLORS[0].id,
      elevations: Array.isArray(r.elevations) && r.elevations.length <= 5000 ? (r.elevations as number[]) : null,
    });
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
  // Explicit optional-field handling: ...p spread would carry raw input values through
  // even when validation rejects them. Delete = input overridden by sanitized result.
  const result: Project = { ...p, version: 4, routes };
  if (overlay) result.overlay = overlay; else delete result.overlay;
  if (basemapId) result.basemapId = basemapId; else delete result.basemapId;
  if (music) result.music = music; else delete result.music;
  return result;
}
