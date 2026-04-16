import { create } from 'zustand';
import { temporal } from 'zundo';
import type { Project, Spot, Mode } from '../models/types';
import { DEFAULT_CARD_OFFSET, DEFAULT_CENTER, DEFAULT_ZOOM } from '../models/types';
import type { Route } from '../models/routes';
import { ROUTE_COLORS } from '../models/routes';
import { reverseGeocode } from '../utils/reverseGeocode';
import { fetchElevations } from '../utils/elevationApi';
import { t } from '../../i18n';

import type { GpxData } from '../utils/gpxParser';

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
<<<<<<< HEAD
  reorderSpots: (fromIndex: number, toIndex: number) => void;
=======
  reorderSpots: (startIndex: number, endIndex: number) => void;
>>>>>>> 54551e3 (feat: enhance UI/UX and add guidebook playback functionality)
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

  // UI
  setMode: (mode: Mode) => void;
  setSidebarOpen: (open: boolean) => void;
  setMapView: (center: [number, number], zoom: number) => void;
  setProjectName: (name: string) => void;
  clearPendingFlyTo: () => void;

  // Background image
  setBackgroundImage: (dataUrl: string, width: number, height: number) => void;
  clearBackgroundImage: () => void;

  // Settings
  handDrawn: boolean;
  watermark: boolean;
  toggleHandDrawn: () => void;
  toggleWatermark: () => void;

  // Slideshow / Playback
  playing: boolean;
  playIndex: number;
  playMode: 'manual' | 'auto';
  playInterval: number; // in ms
  playLoop: boolean;
  togglePlay: () => void;
  setPlayMode: (mode: 'manual' | 'auto') => void;
  setPlayInterval: (ms: number) => void;
  setPlayLoop: (loop: boolean) => void;
  nextSpot: () => void;
  prevSpot: () => void;

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
    spots: [],
    routes: [],
  };
}

// Validate and migrate project data
function migrateProject(data: Record<string, unknown>): Project {
  // Basic schema validation
  if (!data || typeof data !== 'object') throw new Error('Invalid project data');
  if (!Array.isArray(data.spots)) throw new Error('Missing or invalid spots');
  if (!Array.isArray(data.center) || data.center.length !== 2) throw new Error('Missing or invalid center');
  // Clamp center to valid lat/lng range
  data.center = [
    Math.max(-90, Math.min(90, Number(data.center[0]) || 0)),
    Math.max(-180, Math.min(180, Number(data.center[1]) || 0)),
  ];
  if (typeof data.zoom !== 'number' || isNaN(data.zoom)) throw new Error('Missing or invalid zoom');
  if (typeof data.name !== 'string') data.name = 'Untitled';

  // Semantic limits — prevent UI freeze from absurd data
  if (data.spots.length > 200) throw new Error('Too many spots (max 200)');

  // Validate each spot — skip invalid ones instead of rejecting entire import
  const spots: Spot[] = [];
  for (const raw of data.spots as unknown[]) {
    if (!raw || typeof raw !== 'object') continue;
    const s = raw as Record<string, unknown>;
    if (!s.id || typeof s.id !== 'string') continue;
    if (!Array.isArray(s.latlng) || s.latlng.length !== 2) continue;
    if (typeof s.latlng[0] !== 'number' || typeof s.latlng[1] !== 'number'
      || !isFinite(s.latlng[0] as number) || !isFinite(s.latlng[1] as number)) continue;
    // Only allow null or data:image/ base64 photos (block external URLs / tracking pixels)
    const rawPhoto = (s as Record<string, unknown>).photo;
    const safePhoto = typeof rawPhoto === 'string' && rawPhoto.startsWith('data:image/') ? rawPhoto : null;

    spots.push({
      ...(s as unknown as Spot),
      photo: safePhoto,
      photoY: typeof s.photoY === 'number' ? Math.max(0, Math.min(100, s.photoY)) : undefined,
      customEmoji: typeof s.customEmoji === 'string' ? s.customEmoji : undefined,
      num: typeof s.num === 'number' && s.num > 0 ? Math.round(s.num) : spots.length + 1,
      cardOffset: s.cardOffset && typeof (s.cardOffset as Record<string, unknown>).x === 'number'
        && typeof (s.cardOffset as Record<string, unknown>).y === 'number'
        ? (s.cardOffset as Spot['cardOffset'])
        : { ...DEFAULT_CARD_OFFSET },
    });
  }

  const p = { ...(data as unknown as Project), spots };
  if (!p.routes || !Array.isArray(p.routes)) {
    p.routes = [];
  }
  if (p.routes.length > 50) throw new Error('Too many routes (max 50)');
  const validColorIds = ROUTE_COLORS.map((c) => c.id);
  const routes: Route[] = [];
  for (const raw of p.routes as unknown as unknown[]) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    if (!r.id || typeof r.id !== 'string') continue;
    if (!Array.isArray(r.pts) || r.pts.length < 2 || r.pts.length > 5000) continue;
    const validPts = (r.pts as unknown[]).every(
      (pt) => Array.isArray(pt) && pt.length === 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number'
        && isFinite(pt[0] as number) && isFinite(pt[1] as number),
    );
    if (!validPts) continue;
    routes.push({
      ...(r as unknown as Route),
      name: (r.name as string) ?? '',
      color: validColorIds.includes(r.color as string) ? (r.color as string) : ROUTE_COLORS[0].id,
      elevations: Array.isArray(r.elevations) ? (r.elevations as number[]) : null,
    });
  }

  // Handle playback settings
  const playback = data.playback as Record<string, unknown> | undefined;
  const safePlayback = playback ? {
    mode: (playback.mode === 'manual' ? 'manual' : 'auto') as 'auto' | 'manual',
    interval: typeof playback.interval === 'number' ? Math.max(1000, Math.min(60000, playback.interval)) : 2000,
    loop: typeof playback.loop === 'boolean' ? playback.loop : true,
  } : undefined;

  return { ...p, version: 2, routes, playback: safePlayback };
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
  playing: false,
  playIndex: -1,
  playMode: 'auto',
  playInterval: 2000,
  playLoop: true,

  togglePlay: () => {
    const s = get();
    if (s.playing) {
      set({ playing: false, playIndex: -1, selectedSpotId: null });
    } else {
      const idx = s.project.spots.length > 0 ? 0 : -1;
      set({ playing: true, playIndex: idx, mode: 'select' });
      if (idx !== -1) {
        const spot = s.project.spots[idx];
        set({ selectedSpotId: spot.id });
        // Trigger flyto if needed
        const currentZoom = s.project.zoom;
        const targetZoom = Math.max(currentZoom, 15); // ensure detail is visible
        set({ pendingFlyTo: { center: spot.latlng, zoom: targetZoom } });
      }
    }
  },

  setPlayMode: (playMode) => set({ playMode }),
  setPlayInterval: (playInterval) => set({ playInterval }),
  setPlayLoop: (playLoop) => set({ playLoop }),

  nextSpot: () => {
    const s = get();
    if (s.project.spots.length === 0) return;
    let nextIdx = s.playIndex + 1;
    if (nextIdx >= s.project.spots.length) {
      if (s.playLoop) {
        nextIdx = 0;
      } else {
        set({ playing: false, playIndex: -1, selectedSpotId: null });
        return;
      }
    }
    const spot = s.project.spots[nextIdx];
    set({ playIndex: nextIdx, selectedSpotId: spot.id });
    
    // Zoom/Pan logic: fly to spot if zoomed out or if user wants detail
    const currentZoom = s.project.zoom;
    const targetZoom = Math.max(currentZoom, 15.5);
    set({ pendingFlyTo: { center: spot.latlng, zoom: targetZoom } });
  },

  prevSpot: () => {
    const s = get();
    if (s.project.spots.length === 0) return;
    let nextIdx = s.playIndex - 1;
    if (nextIdx < 0) {
      nextIdx = s.project.spots.length - 1;
    }
    const spot = s.project.spots[nextIdx];
    set({ playIndex: nextIdx, selectedSpotId: spot.id });
    set({ pendingFlyTo: { center: spot.latlng, zoom: Math.max(s.project.zoom, 15.5) } });
  },

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
        spots: s.project.spots.map((sp) =>
          sp.id === id ? { ...sp, ...patch } : sp
        ),
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

<<<<<<< HEAD
  reorderSpots: (fromIndex, toIndex) =>
    set((s) => {
      const spots = [...s.project.spots];
      const [moved] = spots.splice(fromIndex, 1);
      spots.splice(toIndex, 0, moved);
=======
  reorderSpots: (startIndex, endIndex) =>
    set((s) => {
      const spots = [...s.project.spots];
      const [removed] = spots.splice(startIndex, 1);
      spots.splice(endIndex, 0, removed);
>>>>>>> 54551e3 (feat: enhance UI/UX and add guidebook playback functionality)
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
