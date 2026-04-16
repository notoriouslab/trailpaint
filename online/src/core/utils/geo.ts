const R = 6371; // Earth radius in km

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance between two [lat, lng] points, returns km */
export function haversine(a: [number, number], b: [number, number]): number {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Total distance of a polyline in km */
export function polylineDistance(pts: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += haversine(pts[i - 1], pts[i]);
  }
  return total;
}

/** Format distance: < 1km → "XXX m", >= 1km → "X.X km" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Calculate cumulative ascent and descent from elevation array */
export function elevationStats(elevations: number[]): { ascent: number; descent: number; min: number; max: number } {
  if (elevations.length === 0) {
    return { ascent: 0, descent: 0, min: 0, max: 0 };
  }
  let ascent = 0;
  let descent = 0;
  let min = elevations[0];
  let max = elevations[0];
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) ascent += diff;
    else descent += Math.abs(diff);
    if (elevations[i] < min) min = elevations[i];
    if (elevations[i] > max) max = elevations[i];
  }
  return { ascent: Math.round(ascent), descent: Math.round(descent), min: Math.round(min), max: Math.round(max) };
}

/** Naismith's rule: 5 km/h + 1 hour per 600m ascent */
export function estimateTime(distKm: number, ascentM: number): string {
  const hours = distKm / 5 + ascentM / 600;
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Cumulative distance array for each point (in km) */
export function cumulativeDistances(pts: [number, number][]): number[] {
  const dists = [0];
  for (let i = 1; i < pts.length; i++) {
    dists.push(dists[i - 1] + haversine(pts[i - 1], pts[i]));
  }
  return dists;
}
