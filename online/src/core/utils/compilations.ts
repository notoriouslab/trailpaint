/**
 * Compilation loader — fetches multiple story segments in parallel and merges
 * them into a single Project for the Player.
 *
 * Design ref: openspec/changes/2026-05-03-016-time-slider-postcard/design.md B3, D2, D3
 *
 * Failure handling (D2): partial failure is non-fatal. Successful segments are
 * loaded; failed segment ids are returned in `failedSegments` so the caller
 * can surface a toast without blocking playback of the segments that did load.
 */

import { migrateProject } from './migrateProject';
import type { Compilation, Project, Spot } from '../models/types';
import type { Route } from '../models/routes';

/** Per-spot tag added during merge so PlaybackControl can group / order by source segment. */
export interface CompilationSpot extends Spot {
  /** Path of the segment this spot came from (e.g. "paul/first-journey"). Internal use only. */
  _sourceSegmentId?: string;
}

export interface CompilationLoadResult {
  compilation: Compilation;
  /** All spots from successfully loaded segments, tagged with `_sourceSegmentId`. */
  spots: CompilationSpot[];
  /** All routes from successfully loaded segments. */
  routes: Route[];
  /** Segment ids that failed to fetch / parse. Empty array on full success. */
  failedSegments: string[];
}

/** Resolve a segment id to a fetchable URL under the stories tree. */
function segmentUrl(basePath: string, segmentId: string): string {
  // Strip trailing slash from basePath, leading slash from segmentId for clean join.
  const clean = (s: string) => s.replace(/^\/+|\/+$/g, '');
  return `/${clean(basePath)}/${clean(segmentId)}.trailpaint.json`;
}

/**
 * Fetch a single segment's JSON and return a migrated Project. Throws on any
 * failure so the caller's `Promise.allSettled` can collect failed ids.
 */
async function loadSegment(
  basePath: string,
  segmentId: string,
  signal?: AbortSignal,
): Promise<Project> {
  const url = segmentUrl(basePath, segmentId);
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const data = await res.json();
  return migrateProject(data);
}

/**
 * Load all segments of a compilation in parallel. Successful segments contribute
 * their spots/routes to the merged result; failed segment ids surface to the caller.
 *
 * Spots from each segment carry `_sourceSegmentId` for downstream ordering logic.
 */
export async function loadCompilation(
  compilation: Compilation,
  options: { basePath?: string; signal?: AbortSignal } = {},
): Promise<CompilationLoadResult> {
  const basePath = options.basePath ?? 'stories';
  const settled = await Promise.allSettled(
    compilation.segments.map((seg) => loadSegment(basePath, seg, options.signal)),
  );

  const spots: CompilationSpot[] = [];
  const routes: Route[] = [];
  const failedSegments: string[] = [];

  settled.forEach((r, i) => {
    const segmentId = compilation.segments[i];
    if (r.status === 'rejected') {
      failedSegments.push(segmentId);
      return;
    }
    const project = r.value;
    for (const spot of project.spots) {
      spots.push({ ...spot, _sourceSegmentId: segmentId });
    }
    routes.push(...project.routes);
  });

  return { compilation, spots, routes, failedSegments };
}

/**
 * Order compilation spots according to the compilation's playback mode.
 *
 *   - sequential: preserve segment order (load order). Same group's segments stay
 *     contiguous, individual spots within a segment keep their authored order.
 *   - chronological: sort by spot.era.start across the whole compilation. Spots
 *     without an era fall back to their segment's average era (so a span of
 *     era-tagged spots from one segment stays grouped); segments with no era at
 *     all sink to the end.
 *
 * Returns a NEW array; never mutates the caller's `spots`.
 */
export function orderCompilationSpots(
  spots: ReadonlyArray<CompilationSpot>,
  playback: 'sequential' | 'chronological',
): CompilationSpot[] {
  if (playback === 'sequential') return [...spots];

  // Compute average era per segment, fall back to +Infinity if a segment has none
  const eraSumByseg = new Map<string, { sum: number; n: number }>();
  for (const s of spots) {
    if (!s.era) continue;
    const key = s._sourceSegmentId ?? '';
    const prev = eraSumByseg.get(key) ?? { sum: 0, n: 0 };
    eraSumByseg.set(key, {
      sum: prev.sum + (s.era.start + s.era.end) / 2,
      n: prev.n + 1,
    });
  }
  const segAvgEra = new Map<string, number>();
  for (const [k, v] of eraSumByseg) segAvgEra.set(k, v.sum / v.n);

  const sortKey = (s: CompilationSpot): number => {
    if (s.era) return s.era.start;
    const segAvg = segAvgEra.get(s._sourceSegmentId ?? '');
    return segAvg ?? Number.POSITIVE_INFINITY;
  };

  // Stable-ish sort: when two spots tie (same era / same segment fallback),
  // preserve original load order. Array.prototype.sort is spec-stable in modern engines.
  return [...spots].sort((a, b) => sortKey(a) - sortKey(b));
}
