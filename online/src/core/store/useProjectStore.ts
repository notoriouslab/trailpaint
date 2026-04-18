import { create } from 'zustand';
import { temporal } from 'zundo';
import type { Project, Spot, Mode, OverlaySetting, MusicSetting } from '../models/types';
import { DEFAULT_CARD_OFFSET, DEFAULT_CENTER, DEFAULT_ZOOM } from '../models/types';
import { migrateProject } from '../utils/migrateProject';
import type { Route } from '../models/routes';
import { ROUTE_COLORS } from '../models/routes';
import { reverseGeocode } from '../utils/reverseGeocode';
import { fetchElevations } from '../utils/elevationApi';
import { t } from '../../i18n';

import type { GpxData } from '../utils/gpxParser';
import type { ImportResult } from '../utils/geojsonImport';
import { computeBoundingBoxCenter, renumberSpots } from './storeHelpers';
import { compressImage } from '../hooks/useImageCompress';
import { enqueueGeocode } from '../utils/geocodeQueue';

export type BaseMode = 'map' | 'image';

interface ProjectState {
  project: Project;
  selectedSpotId: string | null;
  selectedRouteId: string | null;
  sidebarOpen: boolean;
  mode: Mode;
  currentDrawing: [number, number][];
  pendingFlyTo: { center: [number, number]; zoom: number } | null;
  baseMode: BaseMode;
  bgImage: string | null;       // data URL of uploaded background image
  bgImageSize: { w: number; h: number } | null;

  // Spot actions
  addSpot: (latlng: [number, number]) => void;
  updateSpot: (id: string, patch: Partial<Spot>) => void;
  removeSpot: (id: string) => void;
  swapSpots: (index: number, direction: 'up' | 'down') => void;
  reorderSpots: (fromIndex: number, toIndex: number) => void;
  setSelectedSpot: (id: string | null) => void;

  // Route actions
  addDrawingPoint: (latlng: [number, number]) => void;
  finishRoute: () => void;
  cancelDrawing: () => void;
  addRoute: (route: Route) => void;
  updateRoutePt: (routeId: string, ptIndex: number, latlng: [number, number]) => void;
  deleteRoutePt: (routeId: string, ptIndex: number) => void;
  deleteRoute: (id: string) => void;
  setRouteColor: (id: string, color: string) => void;
  setRouteName: (id: string, name: string) => void;
  setSelectedRoute: (id: string | null) => void;
  fetchRouteElevation: (id: string) => Promise<void>;

  // GPX
  importGpx: (data: GpxData) => void;

  // POI (EXIF / KML / GeoJSON — 010 D6)
  importPOIs: (result: ImportResult) => Promise<void>;

  // UI
  setMode: (mode: Mode) => void;
  setSidebarOpen: (open: boolean) => void;
  setMapView: (center: [number, number], zoom: number) => void;
  setProjectName: (name: string) => void;
  clearPendingFlyTo: () => void;

  // Background image
  setBackgroundImage: (dataUrl: string, width: number, height: number) => void;
  clearBackgroundImage: () => void;

  // Basemap, Overlay & Music
  setBasemapId: (id: string) => void;
  setOverlay: (overlay: OverlaySetting | null) => void;
  setMusic: (music: MusicSetting | null) => void;

  // Settings
  handDrawn: boolean;
  watermark: boolean;
  toggleHandDrawn: () => void;
  toggleWatermark: () => void;

  // Persistence
  exportJSON: () => string;
  importJSON: (json: string) => void;
}

function renumber(spots: Spot[]): Spot[] {
  return spots.map((s, i) => ({ ...s, num: i + 1 }));
}

function createEmptyProject(): Project {
  return {
    version: 2,
    name: 'Untitled',
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    music: { url: 'https://trailpaint.org/stories/music/redeemed.mp3', autoplay: false },
    spots: [],
    routes: [],
  };
}

export const useProjectStore = create<ProjectState>()(
  temporal(
  (set, get) => ({
  project: createEmptyProject(),
  selectedSpotId: null,
  selectedRouteId: null,
  sidebarOpen: window.innerWidth > 768,
  mode: 'select' as Mode,
  currentDrawing: [] as [number, number][],
  pendingFlyTo: null as { center: [number, number]; zoom: number } | null,
  baseMode: 'map' as BaseMode,
  bgImage: null as string | null,
  bgImageSize: null as { w: number; h: number } | null,
  handDrawn: true,
  watermark: true,

  // ── Spot actions ──

  addSpot: (latlng) => {
    const id = crypto.randomUUID();
    set((s) => {
      const num = s.project.spots.length + 1;
      const spot: Spot = {
        id,
        latlng,
        num,
        title: `${t('spot.defaultTitle')} ${num}`,
        desc: '',
        photo: null,
        iconId: 'pin',
        cardOffset: { ...DEFAULT_CARD_OFFSET },
      };
      return {
        project: { ...s.project, spots: [...s.project.spots, spot] },
        selectedSpotId: id,
        selectedRouteId: null,
        mode: 'select',
      };
    });
  },

  updateSpot: (id, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        spots: s.project.spots.map((sp) => {
          if (sp.id !== id) return sp;
          // 010 D5: dragging a pendingLocation spot to a new latlng clears the pending flag
          const clearPending =
            patch.latlng !== undefined && sp.pendingLocation === true
              ? { pendingLocation: false }
              : null;
          return { ...sp, ...patch, ...(clearPending ?? {}) };
        }),
      },
    })),

  removeSpot: (id) =>
    set((s) => ({
      project: {
        ...s.project,
        spots: renumber(s.project.spots.filter((sp) => sp.id !== id)),
      },
      selectedSpotId: s.selectedSpotId === id ? null : s.selectedSpotId,
    })),

  swapSpots: (index, direction) =>
    set((s) => {
      const spots = [...s.project.spots];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= spots.length) return s;
      [spots[index], spots[target]] = [spots[target], spots[index]];
      return { project: { ...s.project, spots: renumber(spots) } };
    }),

  reorderSpots: (fromIndex, toIndex) =>
    set((s) => {
      const spots = [...s.project.spots];
      const [moved] = spots.splice(fromIndex, 1);
      spots.splice(toIndex, 0, moved);
      return { project: { ...s.project, spots: renumber(spots) } };
    }),

  setSelectedSpot: (id) => set({ selectedSpotId: id, selectedRouteId: null }),

  // ── Route actions ──

  addDrawingPoint: (latlng) =>
    set((s) => ({ currentDrawing: [...s.currentDrawing, latlng] })),

  finishRoute: () => {
    const s = get();
    if (s.currentDrawing.length < 2) {
      set({ currentDrawing: [], mode: 'select' as Mode });
      return;
    }
    const colorId = ROUTE_COLORS[s.project.routes.length % ROUTE_COLORS.length].id;
    const routeId = crypto.randomUUID();
    const pts = [...s.currentDrawing];
    const route: Route = {
      id: routeId,
      name: '',
      pts,
      color: colorId,
      elevations: null,
    };

    set({
      project: { ...s.project, routes: [...s.project.routes, route] },
      currentDrawing: [],
      mode: 'select' as Mode,
      selectedRouteId: routeId,
      selectedSpotId: null,
    });

    // Async side effect outside of set()
    const mid = pts[Math.floor(pts.length / 2)];
    reverseGeocode(mid).then((name) => {
      if (name) {
        const curr = get();
        const r = curr.project.routes.find((r) => r.id === routeId);
        if (r && !r.name) {
          set((s2) => ({
            project: {
              ...s2.project,
              routes: s2.project.routes.map((r2) =>
                r2.id === routeId ? { ...r2, name } : r2
              ),
            },
          }));
        }
      }
    }).catch(() => { /* naming is best-effort */ });
  },

  cancelDrawing: () => set({ currentDrawing: [], mode: 'select' }),

  addRoute: (route) =>
    set((s) => ({
      project: { ...s.project, routes: [...s.project.routes, route] },
    })),

  updateRoutePt: (routeId, ptIndex, latlng) =>
    set((s) => ({
      project: {
        ...s.project,
        routes: s.project.routes.map((r) =>
          r.id !== routeId ? r : { ...r, pts: r.pts.map((p, i) => (i === ptIndex ? latlng : p)) }
        ),
      },
    })),

  deleteRoutePt: (routeId, ptIndex) =>
    set((s) => {
      const route = s.project.routes.find((r) => r.id === routeId);
      if (!route) return s;
      const newPts = route.pts.filter((_, i) => i !== ptIndex);
      if (newPts.length < 2) {
        return {
          project: { ...s.project, routes: s.project.routes.filter((r) => r.id !== routeId) },
          selectedRouteId: s.selectedRouteId === routeId ? null : s.selectedRouteId,
        };
      }
      return {
        project: {
          ...s.project,
          routes: s.project.routes.map((r) =>
            r.id !== routeId ? r : { ...r, pts: newPts }
          ),
        },
      };
    }),

  deleteRoute: (id) =>
    set((s) => ({
      project: { ...s.project, routes: s.project.routes.filter((r) => r.id !== id) },
      selectedRouteId: s.selectedRouteId === id ? null : s.selectedRouteId,
    })),

  setRouteColor: (id, color) =>
    set((s) => ({
      project: {
        ...s.project,
        routes: s.project.routes.map((r) =>
          r.id !== id ? r : { ...r, color }
        ),
      },
    })),

  setRouteName: (id, name) =>
    set((s) => ({
      project: {
        ...s.project,
        routes: s.project.routes.map((r) => r.id !== id ? r : { ...r, name }),
      },
    })),

  setSelectedRoute: (id) => set({ selectedRouteId: id, selectedSpotId: null }),

  fetchRouteElevation: async (id) => {
    const route = get().project.routes.find((r) => r.id === id);
    if (!route || route.elevations) return; // already has elevation
    try {
      const elevations = await fetchElevations(route.pts);
      set((s) => ({
        project: {
          ...s.project,
          routes: s.project.routes.map((r) =>
            r.id !== id ? r : { ...r, elevations }
          ),
        },
      }));
    } catch (err) {
      console.error('Elevation fetch failed:', err);
      alert(t('route.fetchEleFailed'));
    }
  },

  // ── GPX ──

  importGpx: (data) => {
    const s = get();
    const newRoutes: Route[] = data.tracks.map((trackPts, i) => {
      const hasEle = trackPts.some((p) => p.ele !== null);
      return {
        id: crypto.randomUUID(),
        name: '',
        pts: trackPts.map((p) => p.latlng),
        color: ROUTE_COLORS[(s.project.routes.length + i) % ROUTE_COLORS.length].id,
        elevations: hasEle ? trackPts.map((p) => p.ele ?? 0) : null,
      };
    });

    const baseNum = s.project.spots.length;
    const newSpots: Spot[] = data.waypoints.map((wp, i) => ({
      id: crypto.randomUUID(),
      latlng: wp.latlng,
      num: baseNum + i + 1,
      title: wp.name || `${t('spot.defaultTitle')} ${baseNum + i + 1}`,
      desc: '',
      photo: null,
      iconId: 'pin',
      cardOffset: { ...DEFAULT_CARD_OFFSET },
    }));

    const allPts = [
      ...newRoutes.flatMap((r) => r.pts),
      ...newSpots.map((sp) => sp.latlng),
    ];
    let center = s.project.center;
    let zoom = s.project.zoom;
    if (allPts.length > 0) {
      const lats = allPts.map((p) => p[0]);
      const lngs = allPts.map((p) => p[1]);
      center = [
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
      ];
      zoom = 12;
    }

    set({
      project: {
        ...s.project,
        spots: [...s.project.spots, ...newSpots],
        routes: [...s.project.routes, ...newRoutes],
      },
      pendingFlyTo: { center, zoom },
    });

    // Async side effects: reverse geocode route names (outside set)
    for (const route of newRoutes) {
      const mid = route.pts[Math.floor(route.pts.length / 2)];
      reverseGeocode(mid).then((name) => {
        if (name) {
          const curr = get();
          if (curr.project.routes.find((r) => r.id === route.id && !r.name)) {
            set((s2) => ({
              project: {
                ...s2.project,
                routes: s2.project.routes.map((r) =>
                  r.id === route.id ? { ...r, name } : r
                ),
              },
            }));
          }
        }
      }).catch(() => { /* naming is best-effort */ });
    }
  },

  // ── POI import (010 E4) ──

  importPOIs: async (result) => {
    const s = get();
    const combinedSpots = [...s.project.spots, ...result.spots];
    const combinedRoutes = [...s.project.routes, ...result.routes];
    const allPts: [number, number][] = [
      ...combinedRoutes.flatMap((r) => r.pts),
      ...combinedSpots.map((sp) => sp.latlng),
    ];
    const bbox = computeBoundingBoxCenter(allPts);

    set({
      project: {
        ...s.project,
        spots: renumberSpots(combinedSpots),
        routes: combinedRoutes,
      },
      pendingFlyTo: bbox ?? s.pendingFlyTo,
    });

    // Async photo compression outside set()
    if (result.spotPhotoMap && result.spotPhotoMap.size > 0) {
      for (const [spotId, file] of result.spotPhotoMap) {
        compressImage(file)
          .then((dataUrl) => {
            const curr = get();
            if (curr.project.spots.find((sp) => sp.id === spotId)) {
              set((s2) => ({
                project: {
                  ...s2.project,
                  spots: s2.project.spots.map((sp) =>
                    sp.id === spotId ? { ...sp, photo: dataUrl } : sp
                  ),
                },
              }));
            }
          })
          .catch(() => { /* photo attach is best-effort; spot stays without photo */ });
      }
    }

    // Background reverseGeocode — per spot, queued at 1 req/s with dedup.
    // Skip pendingLocation spots: their coordinate is mapCenter, not the real
    // photo location, so the resolved place name would be misleading.
    for (const newSpot of result.spots) {
      if (newSpot.pendingLocation) continue;
      enqueueGeocode({
        spotId: newSpot.id,
        latlng: newSpot.latlng,
        originalTitle: newSpot.title,
        onResult: (spotId, placeName, origTitle) => {
          const curr = get();
          const target = curr.project.spots.find((sp) => sp.id === spotId);
          // checkAndSet: only overwrite if user hasn't edited the title
          if (target && target.title === origTitle) {
            set((s2) => ({
              project: {
                ...s2.project,
                spots: s2.project.spots.map((sp) =>
                  sp.id === spotId ? { ...sp, title: placeName } : sp
                ),
              },
            }));
          }
        },
      });
    }
  },

  // ── UI ──

  setMode: (mode) => {
    const s = get();
    if (mode !== 'drawRoute' && s.currentDrawing.length > 0) {
      set({ mode, currentDrawing: [] });
    } else {
      set({ mode });
    }
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setMapView: (center, zoom) =>
    set((s) => ({ project: { ...s.project, center, zoom } })),

  setProjectName: (name) =>
    set((s) => ({ project: { ...s.project, name } })),

  clearPendingFlyTo: () => set({ pendingFlyTo: null }),

  // ── Background image ──

  setBackgroundImage: (dataUrl, width, height) =>
    set((s) => ({
      baseMode: 'image',
      bgImage: dataUrl,
      bgImageSize: { w: width, h: height },
      selectedSpotId: null,
      selectedRouteId: null,
      currentDrawing: [],
      mode: 'select' as Mode,
      // Clear spots/routes from different coordinate system to prevent data corruption
      project: { ...s.project, spots: [], routes: [] },
    })),

  clearBackgroundImage: () =>
    set((s) => ({
      baseMode: 'map',
      bgImage: null,
      bgImageSize: null,
      currentDrawing: [],
      mode: 'select' as Mode,
      // Clear spots/routes from pixel coordinate system
      project: { ...s.project, spots: [], routes: [] },
    })),

  // ── Basemap & Overlay ──

  setBasemapId: (id) =>
    set((s) => ({ project: { ...s.project, basemapId: id } })),

  setOverlay: (overlay) =>
    set((s) => ({ project: { ...s.project, overlay: overlay ?? undefined } })),

  setMusic: (music) =>
    set((s) => ({ project: { ...s.project, music: music ?? undefined } })),

  // ── Settings ──

  toggleHandDrawn: () => set((s) => ({ handDrawn: !s.handDrawn })),
  toggleWatermark: () => set((s) => ({ watermark: !s.watermark })),

  // ── Persistence ──

  exportJSON: () => JSON.stringify(get().project, null, 2),

  importJSON: (json) => {
    const raw = JSON.parse(json);
    const data = migrateProject(raw);
    set({
      project: data,
      selectedSpotId: null,
      selectedRouteId: null,
      pendingFlyTo: { center: data.center, zoom: data.zoom },
    });
    // Clear undo history — "undo entire project load" is confusing, not useful
    useProjectStore.temporal.getState().clear();
  },
}),
  {
    partialize: (state) => ({ project: state.project }),
    limit: 50,
  },
));
