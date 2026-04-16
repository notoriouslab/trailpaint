import type { Route } from './routes';

export interface Spot {
  id: string;
  latlng: [number, number]; // [lat, lng]
  num: number;
  title: string;
  desc: string;
  photo: string | null; // base64 data URL (compressed)
  iconId: string;       // key into ICONS
  cardOffset: { x: number; y: number }; // pixel offset from pin (screen coords)
}

export interface OverlaySetting {
  id: string;
  opacity: number;
}

export interface Project {
  version: 1 | 2;
  name: string;
  center: [number, number]; // [lat, lng]
  zoom: number;
  spots: Spot[];
  routes: Route[];
  overlay?: OverlaySetting;
}

export type Mode = 'select' | 'addSpot' | 'drawRoute';

export const DEFAULT_CARD_OFFSET = { x: 0, y: -60 };

export const DEFAULT_CENTER: [number, number] = [23.5, 121];
export const DEFAULT_ZOOM = 8;
