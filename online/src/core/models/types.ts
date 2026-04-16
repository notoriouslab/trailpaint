import type { Route } from './routes';

export interface Spot {
  id: string;
  latlng: [number, number]; // [lat, lng]
  num: number;
  title: string;
  desc: string;
  photo: string | null; // base64 data URL (compressed)
  photoY?: number; // 0-100 vertical object-position percentage
  iconId: string;       // key into ICONS
  customEmoji?: string; // fallback if iconId is 'custom'
  cardOffset: { x: number; y: number }; // pixel offset from pin (screen coords)
}

export interface Project {
  version: 1 | 2;
  name: string;
  center: [number, number]; // [lat, lng]
  zoom: number;
  spots: Spot[];
  routes: Route[];
  playback?: {
    mode: 'auto' | 'manual';
    interval: number;
    loop: boolean;
  };
}

export type Mode = 'select' | 'addSpot' | 'drawRoute';

export const DEFAULT_CARD_OFFSET = { x: 0, y: -60 };

export const DEFAULT_CENTER: [number, number] = [23.5, 121];
export const DEFAULT_ZOOM = 8;
