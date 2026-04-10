const API_URL = 'https://api.open-elevation.com/api/v1/lookup';
const BATCH_SIZE = 100;

/** Fetch elevations for an array of [lat, lng] points via Open-Elevation API */
export async function fetchElevations(pts: [number, number][]): Promise<number[]> {
  const elevations: number[] = [];

  // Split into batches to avoid oversized requests
  for (let i = 0; i < pts.length; i += BATCH_SIZE) {
    const batch = pts.slice(i, i + BATCH_SIZE);
    const locations = batch.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations }),
    });

    if (!res.ok) throw new Error(`Elevation API error: ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data.results)) throw new Error('Invalid elevation API response');

    for (const r of data.results) {
      elevations.push(typeof r.elevation === 'number' ? r.elevation : 0);
    }
  }

  return elevations;
}
