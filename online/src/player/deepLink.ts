import type { Project, Spot } from '../core/models/types';
import { effectiveEraMode, eraVisible } from '../map/eraFade';
import { initialYear } from './initialYear';

/**
 * 027: links to one spot at one year.
 *
 *   /app/player/?src=<story json>&spot=<key>&year=<year>   standalone Player
 *   /taiwan/<id>/?seg=<segment id>&spot=<key>&year=<year>  story page; stories.js
 *     forwards spot / year to the Player iframe together with page + seg, so
 *     the Player can build the same kind of link back.
 *
 * Every value is untrusted URL input: anything that fails these checks is
 * ignored and the story loads as usual.
 */

/** placeId (frozen pool id) or spot id. */
const SPOT_KEY_RE = /^[A-Za-z0-9_-]{1,80}$/;
const YEAR_RE = /^-?\d{1,4}$/;
const YEAR_MIN = -3000;
const YEAR_MAX = 3000;
/** Story page path: /stories/<id>/ or /taiwan/<id>/ on this site. */
const STORY_PAGE_RE = /^\/(stories|taiwan)\/[a-z0-9-]{1,80}\/$/;
const SEGMENT_RE = /^[a-z0-9-]{1,80}$/;

/** The key a link uses for a spot: its placeId when it has one (stable across rebuilds). */
export function spotKey(spot: Pick<Spot, 'id' | 'placeId'>): string {
  return spot.placeId ?? spot.id;
}

export function parseSpotKey(v: string | null): string | null {
  return v && SPOT_KEY_RE.test(v) ? v : null;
}

export function parseYear(v: string | null): number | null {
  if (!v || !YEAR_RE.test(v)) return null;
  const y = Number(v);
  return y >= YEAR_MIN && y <= YEAR_MAX ? y : null;
}

export function resolveSpotIndex(project: Pick<Project, 'spots'>, key: string | null): number | null {
  if (!key) return null;
  const i = project.spots.findIndex((s) => s.placeId === key || s.id === key);
  return i >= 0 ? i : null;
}

/** Stories with a time axis; only these take a year (link and share button alike). */
export function isTimed(project: Pick<Project, 'layout' | 'spots'>): boolean {
  return project.layout === 'site' || project.spots.some((s) => s.era);
}

/**
 * What a deep link actually applies to a loaded project:
 *   - year only on timed stories
 *   - no spot on a hidden route (no marker to show), and in site layout no
 *     phase that doesn't exist at the opening year (the panel couldn't show it)
 */
export function resolveFocus(project: Project, link: DeepLink): { index: number | null; year: number | null } {
  const year = link.year !== null && isTimed(project) ? link.year : null;
  let index = resolveSpotIndex(project, link.spot);
  if (index !== null) {
    const spot = project.spots[index];
    const hidden = project.routes.some((r) => r.hidden && r.spotIds?.includes(spot.id));
    const site = project.layout === 'site'
      && !eraVisible(spot.era, year ?? initialYear(project), effectiveEraMode(project));
    if (hidden || site) index = null;
  }
  return { index, year };
}

export interface DeepLink {
  spot: string | null;
  year: number | null;
}

export function parseDeepLink(params: URLSearchParams): DeepLink {
  return { spot: parseSpotKey(params.get('spot')), year: parseYear(params.get('year')) };
}

/**
 * Base of the links the share button builds, or null when the story can't be
 * reopened from a URL (a dropped file, the Editor, a #share= link).
 *   - inside a story page iframe: that page + its segment
 *   - otherwise: the Player with the same ?src=
 */
export function shareBase(
  origin: string,
  params: URLSearchParams,
  isValidSrc: (src: string) => boolean,
): string | null {
  const page = params.get('page');
  const seg = params.get('seg');
  if (page && seg && STORY_PAGE_RE.test(page) && SEGMENT_RE.test(seg)) {
    return `${origin}${page}?seg=${seg}`;
  }
  const src = params.get('src');
  if (src && isValidSrc(src)) return `${origin}/app/player/?src=${encodeURIComponent(src)}`;
  return null;
}

export function buildShareLink(base: string, spot: string | null, year: number | null): string {
  const url = new URL(base);
  if (spot) url.searchParams.set('spot', spot);
  if (year !== null) url.searchParams.set('year', String(year));
  return url.toString();
}
