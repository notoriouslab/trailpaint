import type { Spot } from '../models/types';
import { haversine } from './geo';

/**
 * Default merge radius in meters.
 *
 * Chosen as GPS error (~10m on iOS 18+) + typical photographer offset from
 * the landmark itself (~20m) = 30m. Tested against real TrailPaint routes:
 * the tightest city-food tour (Tainan 台南兩日吃喝) has min NN = 118m, and
 * the densest listed example (Jiufen 九份金瓜石) has min NN = 103m — so 30m
 * has ample headroom for every realistic personal-trail use case. Same-alley
 * "two stalls next door" edge cases are intentionally NOT auto-merged.
 */
export const PHOTO_ADOPT_RADIUS_M = 30;

export interface PhotoAdoption {
  spotId: string;
  photoFile: File;
}

export interface PhotoAdoptionPlan {
  adoptions: PhotoAdoption[];
  remainingSpots: Spot[];
  remainingPhotoMap: Map<string, File>;
}

/**
 * Decide which of the incoming photo-spots should adopt an existing spot
 * (merge into it) vs. stay as a brand-new spot.
 *
 * Rules:
 *   - Only existing spots with `photo === null` are adoption candidates
 *     (never overwrite a user's existing photo).
 *   - One-to-one: each existing candidate can adopt at most one incoming photo
 *     (first-come-first-served by closeness).
 *   - Only merge when nearest-neighbor distance < radiusM.
 *   - Incoming spots without a file in spotPhotoMap skip the merge attempt
 *     (nothing to attach).
 */
export function planPhotoAdoption(
  newSpots: Spot[],
  spotPhotoMap: Map<string, File>,
  existingSpots: Spot[],
  radiusM: number = PHOTO_ADOPT_RADIUS_M,
): PhotoAdoptionPlan {
  const candidates = existingSpots.filter((s) => s.photo === null);
  const used = new Set<string>();
  const adoptions: PhotoAdoption[] = [];
  const remainingSpots: Spot[] = [];
  const remainingPhotoMap = new Map<string, File>();

  for (const spot of newSpots) {
    const file = spotPhotoMap.get(spot.id);
    if (!file) {
      remainingSpots.push(spot);
      continue;
    }
    let nearestId: string | null = null;
    let nearestDist = Infinity;
    for (const c of candidates) {
      if (used.has(c.id)) continue;
      // haversine() returns km — convert to meters for the threshold.
      const d = haversine(spot.latlng, c.latlng) * 1000;
      if (d < radiusM && d < nearestDist) {
        nearestId = c.id;
        nearestDist = d;
      }
    }
    if (nearestId) {
      adoptions.push({ spotId: nearestId, photoFile: file });
      used.add(nearestId);
    } else {
      remainingSpots.push(spot);
      remainingPhotoMap.set(spot.id, file);
    }
  }

  return { adoptions, remainingSpots, remainingPhotoMap };
}
