import type { Project, Spot } from '../models/types';

/**
 * Build JSON-LD wrapper (schema.org TouristTrip + tp: namespace) that prepends
 * every exported .trailpaint.json. Exists for AI agent discoverability — LLMs
 * recognize schema.org semantics natively and can parse the exported file
 * without learning a custom format first.
 *
 * On import, migrateProject strips these fields (@context / @type / itinerary)
 * recursively; the authoritative spot/route data lives in the native fields.
 * Any conflict between `itinerary[i].item` and `spots[i]` is resolved in favor
 * of `spots[i]` — the mirror is for discovery, not trust.
 */
/** `@vocab` lets AI agents read `@type: TouristTrip`, `itinerary`, `ItemList`,
 *  etc. natively as schema.org semantics. `tp:` is kept as a prefix so
 *  `@type: ["TouristTrip", "tp:TrailStory"]` resolves to a real IRI
 *  (https://trailpaint.org/ns/v3/TrailStory) where the RDF vocab lives.
 *
 *  We intentionally do NOT alias native fields (`spots`/`routes`/`photoMeta`/
 *  `iconId`/`scripture_refs`/`photo_query`) to `tp:` classes — those classes
 *  describe *what a spot is*, not *the relation from project to spot*.
 *  Aliasing them as property IRIs would produce invalid RDF triples
 *  (Class-as-Predicate). The semantic view for AI lives in `itinerary`
 *  (schema.org ItemList); native fields are opaque storage passthrough. */
export const JSON_LD_CONTEXT = {
  '@vocab': 'https://schema.org/',
  tp: 'https://trailpaint.org/ns/v3/',
} as const;

export const JSON_LD_TYPE = ['TouristTrip', 'tp:TrailStory'] as const;

/** Defensive cap on itinerary length. spots already capped at 200 in
 *  migrateProject; this is belt-and-braces for future store mutations. */
const ITINERARY_MAX = 200;

/** Map TrailPaint/Commons license short names to canonical Creative Commons URLs.
 *  schema.org ImageObject.license expects a URL; falls back to a CreativeWork
 *  wrapper when the license string is unrecognized (still valid JSON-LD). */
const LICENSE_URL_MAP: Record<string, string> = {
  'CC BY 1.0': 'https://creativecommons.org/licenses/by/1.0/',
  'CC BY 2.0': 'https://creativecommons.org/licenses/by/2.0/',
  'CC BY 2.5': 'https://creativecommons.org/licenses/by/2.5/',
  'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC BY-SA 1.0': 'https://creativecommons.org/licenses/by-sa/1.0/',
  'CC BY-SA 2.0': 'https://creativecommons.org/licenses/by-sa/2.0/',
  'CC BY-SA 2.5': 'https://creativecommons.org/licenses/by-sa/2.5/',
  'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  CC0: 'https://creativecommons.org/publicdomain/zero/1.0/',
  'Public Domain': 'https://creativecommons.org/publicdomain/mark/1.0/',
  'Public domain': 'https://creativecommons.org/publicdomain/mark/1.0/',
  PD: 'https://creativecommons.org/publicdomain/mark/1.0/',
};

function licenseToJsonLd(license: string): string | { '@type': 'CreativeWork'; name: string } {
  const trimmed = license.trim();
  const url = LICENSE_URL_MAP[trimmed];
  if (url) return url;
  // Unknown license — wrap as CreativeWork so AI agents still see structured metadata
  // instead of an opaque string that fails schema.org validation.
  return { '@type': 'CreativeWork', name: trimmed };
}

interface PlaceItem {
  '@type': string[];
  name: string;
  description?: string;
  identifier?: string;
  geo: {
    '@type': 'GeoCoordinates';
    latitude: number;
    longitude: number;
  };
  image?: {
    '@type': 'ImageObject';
    license: string | { '@type': 'CreativeWork'; name: string };
    creator: { '@type': 'Person'; name: string; url?: string };
    contentUrl: string;
    isAccessibleForFree: true;
  };
  citation?: string[];
}

interface ListItemEntry {
  '@type': 'ListItem';
  position: number;
  item: PlaceItem;
}

function spotToPlaceItem(spot: Spot): PlaceItem {
  const item: PlaceItem = {
    '@type': ['Place', 'tp:Spot'],
    name: spot.title,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: spot.latlng[0],
      longitude: spot.latlng[1],
    },
  };
  if (spot.desc) item.description = spot.desc;
  if (spot.iconId) item.identifier = spot.iconId;
  if (spot.photoMeta) {
    item.image = {
      '@type': 'ImageObject',
      license: licenseToJsonLd(spot.photoMeta.license),
      creator: spot.photoMeta.authorUrl
        ? { '@type': 'Person', name: spot.photoMeta.author, url: spot.photoMeta.authorUrl }
        : { '@type': 'Person', name: spot.photoMeta.author },
      contentUrl: spot.photoMeta.sourceUrl,
      isAccessibleForFree: true,
    };
  }
  if (spot.scripture_refs && spot.scripture_refs.length > 0) {
    item.citation = [...spot.scripture_refs];
  }
  return item;
}

export function buildJsonLdWrapper(project: Project): Record<string, unknown> {
  const sorted = [...project.spots]
    .sort((a, b) => a.num - b.num)
    .slice(0, ITINERARY_MAX);
  const itemListElement: ListItemEntry[] = sorted.map((spot) => ({
    '@type': 'ListItem',
    position: spot.num,
    item: spotToPlaceItem(spot),
  }));
  return {
    '@context': JSON_LD_CONTEXT,
    '@type': [...JSON_LD_TYPE],
    itinerary: {
      '@type': 'ItemList',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      numberOfItems: itemListElement.length,
      itemListElement,
    },
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
