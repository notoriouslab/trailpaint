import type L from 'leaflet';

let mapInstance: L.Map | null = null;

export function getMapInstance() { return mapInstance; }

export function setMapInstance(map: L.Map | null) {
  mapInstance = map;
}

export function flyTo(latlng: [number, number], zoom?: number) {
  if (mapInstance) {
    try {
      mapInstance.flyTo(latlng, zoom ?? mapInstance.getZoom(), { duration: 0.6 });
    } catch {
      // Map may have been destroyed during mode switch
    }
  }
}

/** Shift the map view by pixel offset without animation. */
export function panBy(dx: number, dy: number) {
  if (mapInstance) {
    try {
      mapInstance.panBy([dx, dy], { animate: false });
    } catch {
      // Map may have been destroyed
    }
  }
}

/** Change zoom by delta (e.g. +1 or -1) without animation. */
export function zoomBy(delta: number) {
  if (mapInstance) {
    try {
      mapInstance.setZoom(mapInstance.getZoom() + delta);
    } catch {
      // Map may have been destroyed
    }
  }
}
