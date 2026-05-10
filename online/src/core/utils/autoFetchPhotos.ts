import { searchCommonsPhoto } from './commonsApi';
import { fetchAsBase64 } from './fetchAndEncodeImage';
import type { Project, Spot } from '../models/types';

export interface FetchReport {
  total: number;
  found: number;
  missed: Array<{ spotId: string; title: string; query: string }>;
}

/**
 * Thrown by autoFetchPhotos when AbortSignal fires. Carries the partially
 * processed project + report so the UI can offer "load partial / discard"
 * instead of conflating cancellation with API failure.
 */
export class AutoFetchAbortError extends Error {
  readonly partial: { project: Project; report: FetchReport; processed: number };
  constructor(partial: { project: Project; report: FetchReport; processed: number }) {
    super('aborted');
    this.name = 'AutoFetchAbortError';
    this.partial = partial;
  }
}

/**
 * For each spot with a `photo_query`, search Wikimedia Commons and embed the
 * top result as base64 into spot.photo + attribution into spot.photoMeta.
 * Empty query / no result / fetch failure → spot kept as-is (photo unchanged)
 * and entry pushed into report.missed. 500ms sleep between spots to stay
 * comfortably below Commons rate limits in interactive use.
 */
export async function autoFetchPhotos(
  project: Project,
  onProgress: (current: number, total: number, spotTitle: string) => void,
  signal?: AbortSignal,
): Promise<{ project: Project; report: FetchReport }> {
  const spots = project.spots;
  const report: FetchReport = { total: spots.length, found: 0, missed: [] };
  const newSpots: Spot[] = [];

  const throwAbort = (i: number): never => {
    throw new AutoFetchAbortError({
      project: { ...project, spots: [...newSpots, ...spots.slice(i)] },
      report,
      processed: i,
    });
  };

  for (let i = 0; i < spots.length; i++) {
    if (signal?.aborted) throwAbort(i);
    const spot = spots[i];
    onProgress(i + 1, spots.length, spot.title);
    const query = spot.photo_query?.trim() ?? '';
    if (!query) {
      report.missed.push({ spotId: spot.id, title: spot.title, query: '' });
      newSpots.push(spot);
      if (i < spots.length - 1) await sleep(500, signal);
      continue;
    }
    try {
      const hit = await searchCommonsPhoto(query, signal);
      if (!hit) {
        report.missed.push({ spotId: spot.id, title: spot.title, query });
        newSpots.push(spot);
      } else {
        const base64 = await fetchAsBase64(hit.thumbUrl, signal);
        newSpots.push({
          ...spot,
          photo: base64,
          photoMeta: {
            source: 'wikimedia-commons',
            license: hit.license,
            author: hit.author,
            authorUrl: hit.authorUrl,
            sourceUrl: hit.sourceUrl,
          },
        });
        report.found++;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throwAbort(i);
      report.missed.push({ spotId: spot.id, title: spot.title, query });
      newSpots.push(spot);
    }
    if (i < spots.length - 1) await sleep(500, signal);
  }
  return { project: { ...project, spots: newSpots }, report };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('aborted', 'AbortError'));
    });
  });
}
