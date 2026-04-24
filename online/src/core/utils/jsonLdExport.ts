import type { Project, Spot } from '../models/types';

/**
 * Build JSON-LD wrapper (schema.org TouristTrip + tp: namespace) that prepends
 * every exported .trailpaint.json. Exists for AI agent discoverability — LLMs
 * recognize schema.org semantics natively and can parse the exported file
 * without learning a custom format first.
 *
 * On import, migrateProject strips these fields (@context / @type / itinerary);
 * the authoritative spot/route data lives in the native fields that follow.
 */
export const JSON_LD_CONTEXT = {
  '@vocab': 'https://schema.org/',
  tp: 'https://trailpaint.org/schemas/project-v3.schema.json#/$defs/',
  spots: 'tp:Spot',
  routes: 'tp:Route',
  overlay: 'tp:OverlaySetting',
  photoMeta: 'tp:PhotoMeta',
  photo_query: 'tp:photo_query',
} as const;

export const JSON_LD_TYPE = ['TouristTrip', 'tp:TrailStory'] as const;

interface ItineraryEntry {
  '@type': string[];
  name: string;
  description?: string;
  geo: {
    '@type': 'GeoCoordinates';
    latitude: number;
    longitude: number;
  };
  image?: {
    '@type': 'ImageObject';
    license: string;
    creator: { '@type': 'Person'; name: string; url?: string };
    contentUrl: string;
    isAccessibleForFree: true;
  };
}

function spotToItinerary(spot: Spot): ItineraryEntry {
  const entry: ItineraryEntry = {
    '@type': ['Place', 'tp:Spot'],
    name: spot.title,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: spot.latlng[0],
      longitude: spot.latlng[1],
    },
  };
  if (spot.desc) entry.description = spot.desc;
  if (spot.photoMeta) {
    entry.image = {
      '@type': 'ImageObject',
      license: spot.photoMeta.license,
      creator: spot.photoMeta.authorUrl
        ? { '@type': 'Person', name: spot.photoMeta.author, url: spot.photoMeta.authorUrl }
        : { '@type': 'Person', name: spot.photoMeta.author },
      contentUrl: spot.photoMeta.sourceUrl,
      isAccessibleForFree: true,
    };
  }
  return entry;
}

export function buildJsonLdWrapper(project: Project): Record<string, unknown> {
  const itinerary = [...project.spots]
    .sort((a, b) => a.num - b.num)
    .map(spotToItinerary);
  return {
    '@context': JSON_LD_CONTEXT,
    '@type': [...JSON_LD_TYPE],
    itinerary,
  };
}

/**
 * Serialize a Project as .trailpaint.json with JSON-LD wrapper prepended.
 * Output shape: { @context, @type, itinerary, ...project }
 * AI agents see schema.org semantics first; native data authoritative after.
 */
export function exportProjectWithJsonLd(project: Project): string {
  const ld = buildJsonLdWrapper(project);
  // Spread order: LD first → native fields authoritative (native fields don't
  // collide with @context/@type/itinerary since Project has no such keys).
  return JSON.stringify({ ...ld, ...project }, null, 2);
}
