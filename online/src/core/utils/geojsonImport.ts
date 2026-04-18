import type { Spot } from '../models/types';
import { DEFAULT_CARD_OFFSET } from '../models/types';
import type { Route } from '../models/routes';
import { ROUTE_COLORS } from '../models/routes';

// Minimal GeoJSON types — the project has no @types/geojson dependency,
// and our parsers (Task 3/4) only ever produce these shapes.

type Lnglat = [number, number];

type GeoJsonPoint = { type: 'Point'; coordinates: Lnglat };
type GeoJsonLineString = { type: 'LineString'; coordinates: Lnglat[] };
type GeoJsonMultiLineString = { type: 'MultiLineString'; coordinates: Lnglat[][] };
type GeoJsonPolygon = { type: 'Polygon'; coordinates: Lnglat[][] };
type GeoJsonMultiPoint = { type: 'MultiPoint'; coordinates: Lnglat[] };
type GeoJsonMultiPolygon = { type: 'MultiPolygon'; coordinates: Lnglat[][][] };
type GeoJsonGeometryCollection = { type: 'GeometryCollection'; geometries: GeoJsonGeometry[] };

export type GeoJsonGeometry =
  | GeoJsonPoint
  | GeoJsonLineString
  | GeoJsonMultiLineString
  | GeoJsonPolygon
  | GeoJsonMultiPoint
  | GeoJsonMultiPolygon
  | GeoJsonGeometryCollection;

export interface GeoJsonFeature {
  type: 'Feature';
  geometry: GeoJsonGeometry;
  properties?: {
    title?: string;
    name?: string;
    desc?: string;
    description?: string;
    photoRef?: string;
    pendingLocation?: boolean;
    [key: string]: unknown;
  } | null;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export interface ImportBundle {
  featureCollection: GeoJsonFeatureCollection;
  photoFiles?: Map<string, File>;
}

export interface ImportResult {
  spots: Spot[];
  routes: Route[];
  spotPhotoMap?: Map<string, File>;
  unsupportedCount?: number;
}

export interface GeojsonImportOpts {
  startingSpotNum: number;
  startingRouteColorIdx: number;
  mapCenter: [number, number];
  defaultSpotTitle?: string;
}

export function geojsonToImport(bundle: ImportBundle, opts: GeojsonImportOpts): ImportResult {
  const spots: Spot[] = [];
  const routes: Route[] = [];
  const spotPhotoMap = new Map<string, File>();
  let unsupportedCount = 0;
  let spotIdx = 0;
  let routeIdx = 0;

  for (const feature of bundle.featureCollection.features ?? []) {
    if (!feature || feature.type !== 'Feature' || !feature.geometry) continue;
    const props = feature.properties ?? undefined;
    const geom = feature.geometry;

    if (geom.type === 'Point') {
      if (!Array.isArray(geom.coordinates) || geom.coordinates.length < 2) {
        unsupportedCount++;
        continue;
      }
      const [lng, lat] = geom.coordinates;
      if (!isValidLngLat(lng, lat)) {
        unsupportedCount++;
        continue;
      }
      const num = opts.startingSpotNum + spotIdx + 1;
      const spot = makeSpot({ lat, lng, num, props, opts });
      spots.push(spot);
      const photoRef = typeof props?.photoRef === 'string' ? props.photoRef : null;
      if (photoRef && bundle.photoFiles?.has(photoRef)) {
        spotPhotoMap.set(spot.id, bundle.photoFiles.get(photoRef)!);
      }
      spotIdx++;
    } else if (geom.type === 'LineString') {
      const pts = swapCoordsValid(geom.coordinates);
      if (pts.length < 2) continue;
      routes.push(makeRoute({ pts, idx: opts.startingRouteColorIdx + routeIdx, name: getRouteName(props) }));
      routeIdx++;
    } else if (geom.type === 'MultiLineString') {
      const sharedName = getRouteName(props);
      for (const segment of geom.coordinates) {
        const pts = swapCoordsValid(segment);
        if (pts.length < 2) continue;
        routes.push(makeRoute({ pts, idx: opts.startingRouteColorIdx + routeIdx, name: sharedName }));
        routeIdx++;
      }
    } else {
      unsupportedCount++;
    }
  }

  const result: ImportResult = { spots, routes };
  if (spotPhotoMap.size > 0) result.spotPhotoMap = spotPhotoMap;
  if (unsupportedCount > 0) result.unsupportedCount = unsupportedCount;
  return result;
}

function isValidLngLat(lng: unknown, lat: unknown): boolean {
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    isFinite(lng) &&
    isFinite(lat) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

function swapCoordsValid(coords: Lnglat[]): [number, number][] {
  const out: [number, number][] = [];
  if (!Array.isArray(coords)) return out;
  for (const pt of coords) {
    if (!Array.isArray(pt) || pt.length < 2) continue;
    const [lng, lat] = pt;
    if (!isValidLngLat(lng, lat)) continue;
    out.push([lat, lng]);
  }
  return out;
}

function makeSpot(args: {
  lat: number;
  lng: number;
  num: number;
  props: GeoJsonFeature['properties'];
  opts: GeojsonImportOpts;
}): Spot {
  const { lat, lng, num, props, opts } = args;
  const defaultTitle = opts.defaultSpotTitle ?? 'Spot';
  const title =
    (typeof props?.title === 'string' && props.title) ||
    (typeof props?.name === 'string' && props.name) ||
    `${defaultTitle} ${num}`;
  const desc =
    (typeof props?.desc === 'string' && props.desc) ||
    (typeof props?.description === 'string' && props.description) ||
    '';
  const spot: Spot = {
    id: crypto.randomUUID(),
    latlng: [lat, lng],
    num,
    title,
    desc,
    photo: null,
    iconId: 'pin',
    cardOffset: { ...DEFAULT_CARD_OFFSET },
  };
  if (props?.pendingLocation === true) {
    spot.pendingLocation = true;
  }
  return spot;
}

function makeRoute(args: { pts: [number, number][]; idx: number; name: string }): Route {
  return {
    id: crypto.randomUUID(),
    name: args.name,
    pts: args.pts,
    color: ROUTE_COLORS[args.idx % ROUTE_COLORS.length].id,
    elevations: null,
  };
}

function getRouteName(props: GeoJsonFeature['properties']): string {
  return (
    (typeof props?.name === 'string' && props.name) ||
    (typeof props?.title === 'string' && props.title) ||
    ''
  );
}
