const BATCH_SIZE = 100;
const TIMEOUT_MS = 15000; // 15 seconds per batch

export async function fetchElevations(pts: [number, number][]): Promise<number[]> {
  const elevations: number[] = [];

  for (let i = 0; i < pts.length; i += BATCH_SIZE) {
    const batch = pts.slice(i, i + BATCH_SIZE);
    const lats = batch.map((p) => p[0]).join(',');
    const lngs = batch.map((p) => p[1]).join(',');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error(`Elevation API error: ${res.status}`);

      const data = await res.json();
      if (!Array.isArray(data.elevation)) throw new Error('Invalid elevation API response');

      for (const ele of data.elevation) {
        elevations.push(typeof ele === 'number' ? ele : 0);
      }
    } catch (err) {
      console.warn('Elevation batch failed:', err);
      // Fill batch with 0s to maintain array mapping
      for (let j = 0; j < batch.length; j++) {
        elevations.push(0);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  return elevations;
}
