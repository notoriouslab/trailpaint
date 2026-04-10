const BATCH_SIZE = 100;

/** Fetch elevations via Open-Meteo API (free, CORS-friendly, no auth) */
export async function fetchElevations(pts: [number, number][]): Promise<number[]> {
  const elevations: number[] = [];

  for (let i = 0; i < pts.length; i += BATCH_SIZE) {
    const batch = pts.slice(i, i + BATCH_SIZE);
    const lats = batch.map((p) => p[0]).join(',');
    const lngs = batch.map((p) => p[1]).join(',');

    const res = await fetch(
      `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`
    );

    if (!res.ok) throw new Error(`Elevation API error: ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data.elevation)) throw new Error('Invalid elevation API response');

    for (const ele of data.elevation) {
      elevations.push(typeof ele === 'number' ? ele : 0);
    }
  }

  return elevations;
}
