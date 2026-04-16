import type { Project, Spot, OverlaySetting } from '../models/types';
import { DEFAULT_CARD_OFFSET } from '../models/types';
import type { Route } from '../models/routes';
import { ROUTE_COLORS } from '../models/routes';

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
  const spots: Spot[] = [];
  for (const raw of data.spots as unknown[]) {
    if (!raw || typeof raw !== 'object') continue;
    const s = raw as Record<string, unknown>;
    if (!s.id || typeof s.id !== 'string') continue;
    if (!Array.isArray(s.latlng) || s.latlng.length !== 2) continue;
    if (typeof s.latlng[0] !== 'number' || typeof s.latlng[1] !== 'number'
      || !isFinite(s.latlng[0] as number) || !isFinite(s.latlng[1] as number)) continue;
    // Only allow null or data:image/ base64 photos (block external URLs / tracking pixels)
    const rawPhoto = (s as Record<string, unknown>).photo;
    const safePhoto = typeof rawPhoto === 'string' && rawPhoto.startsWith('data:image/') ? rawPhoto : null;

    // Clamp string lengths to prevent data bombs
    const title = typeof s.title === 'string' ? s.title.slice(0, 200) : '';
    const desc = typeof s.desc === 'string' ? s.desc.slice(0, 2000) : '';
    const clampedPhoto = safePhoto && safePhoto.length > 2 * 1024 * 1024 ? null : safePhoto;

    spots.push({
      ...(s as unknown as Spot),
      title,
      desc,
      photo: clampedPhoto,
      num: typeof s.num === 'number' && s.num > 0 ? Math.round(s.num) : spots.length + 1,
      cardOffset: s.cardOffset && typeof (s.cardOffset as Record<string, unknown>).x === 'number'
        && typeof (s.cardOffset as Record<string, unknown>).y === 'number'
        ? (s.cardOffset as Spot['cardOffset'])
        : { ...DEFAULT_CARD_OFFSET },
    });
  }

  const p = { ...(data as unknown as Project), spots };
  if (!p.routes || !Array.isArray(p.routes)) {
    return { ...p, version: 2, routes: [] };
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
  return { ...p, version: 2, routes, ...(overlay ? { overlay } : {}) };
}
