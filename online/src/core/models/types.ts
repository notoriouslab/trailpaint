import type { Route } from './routes';

// v3.1+ (013-ai-photo-commons): attribution metadata for auto-fetched photos.
// Only rendered by Player/Editor when spot.photoMeta is present; existing stories
// with `📷 作者, 授權` embedded in spot.desc stay untouched.
export interface PhotoMeta {
  source: 'wikimedia-commons'; // 字面值聯合；未來擴來源時加 union member
  license: string;
  author: string;
  authorUrl: string | null;
  sourceUrl: string;
}

export interface Spot {
  id: string;
  latlng: [number, number]; // [lat, lng]
  num: number;
  title: string;
  desc: string;
  photo: string | null; // base64 data URL (compressed)
  iconId: string;       // key into ICONS
  cardOffset: { x: number; y: number }; // pixel offset from pin (screen coords)
  scripture_refs?: string[]; // v3+, optional (see 009 D3)
  pendingLocation?: boolean; // v4+, set when EXIF had no GPS — user must drag to real location
  photo_query?: string;      // v3.1+ (013): LLM-generated search keywords; 匯入階段消化後一般不保留
  photoMeta?: PhotoMeta;     // v3.1+ (013): Commons attribution；Player render 角落小字
}

export interface OverlaySetting {
  id: string;
  opacity: number;
}

export interface MusicSetting {
  url: string;
  autoplay: boolean;
}

export interface Project {
  version: 1 | 2 | 3 | 4;
  name: string;
  center: [number, number]; // [lat, lng]
  zoom: number;
  basemapId?: string;
  music?: MusicSetting;
  spots: Spot[];
  routes: Route[];
  overlay?: OverlaySetting;
}

export type Mode = 'select' | 'addSpot' | 'drawRoute';

export const DEFAULT_CARD_OFFSET = { x: 0, y: -60 };

export const DEFAULT_CENTER: [number, number] = [23.5, 121];
export const DEFAULT_ZOOM = 8;
