import { toPng } from 'html-to-image';
import { useProjectStore } from '../core/store/useProjectStore';
import { parseGpx } from '../core/utils/gpxParser';
import { t } from '../i18n';

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '_').slice(0, 100) || 'Untitled';
}

/**
 * Draw tile images directly to a canvas (bypasses SVG foreignObject entirely).
 * Works on iOS Safari because canvas.drawImage + crossOrigin is reliable,
 * unlike foreignObject which blocks cross-origin images on WebKit.
 */
function drawTilesToCanvas(
  ctx: CanvasRenderingContext2D,
  mapEl: HTMLElement,
  containerRect: DOMRect,
  pixelRatio: number,
) {
  const tiles = mapEl.querySelectorAll<HTMLImageElement>('.leaflet-tile-pane img');
  for (const tile of tiles) {
    if (!tile.complete || !tile.naturalWidth) continue;
    const r = tile.getBoundingClientRect();
    try {
      ctx.drawImage(
        tile,
        (r.left - containerRect.left) * pixelRatio,
        (r.top - containerRect.top) * pixelRatio,
        r.width * pixelRatio,
        r.height * pixelRatio,
      );
    } catch {
      // Tainted canvas (tile loaded without CORS) — skip this tile
    }
  }
}

/**
 * Capture the map as an HTMLImageElement at the given pixelRatio.
 *
 * Hybrid approach for iOS Safari compatibility:
 * 1. Draw tiles to canvas manually (canvas.drawImage — works everywhere with crossOrigin)
 * 2. Hide tiles, capture overlays (routes, markers, cards) with html-to-image
 *    (no cross-origin images in foreignObject → works on iOS WebKit)
 * 3. Composite: tiles at bottom, overlays on top
 */
// iOS Safari canvas size limit (~16M pixels). Exceeding it causes silent blank output.
const MAX_CANVAS_PIXELS = 16_000_000;

export async function captureMap(pixelRatio = 2): Promise<HTMLImageElement> {
  const mapEl = document.querySelector('.leaflet-container') as HTMLElement;
  if (!mapEl) throw new Error('Map element not found');

  // Wait for any pending image loads to settle (fixes x1 re-capture timing on iOS)
  await new Promise((r) => setTimeout(r, 200));

  const containerRect = mapEl.getBoundingClientRect();
  // Auto-downgrade if canvas would exceed iOS limit
  let dpi = pixelRatio;
  while (dpi > 1 && containerRect.width * dpi * containerRect.height * dpi > MAX_CANVAS_PIXELS) {
    dpi--;
  }
  const w = Math.round(containerRect.width * dpi);
  const h = Math.round(containerRect.height * dpi);

  // Step 1: Draw tiles directly to canvas
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  drawTilesToCanvas(ctx, mapEl, containerRect, dpi);

  // Step 2: Capture with html-to-image (DON'T filter tiles — let it try)
  // Make map background transparent so on iOS where tiles fail in foreignObject,
  // the transparent areas let our canvas-drawn tiles show through.
  // On desktop tiles render fine in both canvas and foreignObject (harmless double-draw).
  const origBg = mapEl.style.background;
  mapEl.style.background = 'transparent';

  // Suppress pin/card shadows for cleaner export
  const shadowStyle = document.createElement('style');
  shadowStyle.textContent = '.spot-pin__circle, .spot-card { box-shadow: none !important; }';
  document.head.appendChild(shadowStyle);

  try {
    const overlayDataUrl = await toPng(mapEl, {
      cacheBust: true,
      pixelRatio: dpi,
      filter: (node) => {
        const el = node as HTMLElement;
        if (el.classList?.contains('leaflet-control-container')) return false;
        if (el.classList?.contains('watermark')) return false;
        if (el.classList?.contains('locate-button')) return false;
        if (el.classList?.contains('basemap-switcher')) return false;
        return true;
      },
    });

    const overlayImg = new Image();
    overlayImg.src = overlayDataUrl;
    await new Promise<void>((resolve, reject) => {
      overlayImg.onload = () => resolve();
      overlayImg.onerror = () => reject(new Error('Overlay capture failed'));
    });

    // Composite: html-to-image result on top of canvas tiles
    ctx.drawImage(overlayImg, 0, 0);
  } finally {
    mapEl.style.background = origBg;
    shadowStyle.remove();
  }

  // Convert canvas to image
  const finalImg = new Image();
  finalImg.src = canvas.toDataURL('image/png');
  await new Promise<void>((resolve, reject) => {
    finalImg.onload = () => resolve();
    finalImg.onerror = () => reject(new Error('Image load failed'));
  });
  return finalImg;
}

export function saveProject() {
  const json = useProjectStore.getState().exportJSON();
  const projectName = useProjectStore.getState().project.name;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${sanitizeFilename(projectName)}.trailpaint.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

const MAX_PROJECT_SIZE = 20 * 1024 * 1024; // 20MB

export function loadProject() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > MAX_PROJECT_SIZE) {
      alert(t('import.tooLarge'));
      return;
    }
    const text = await file.text();
    try {
      useProjectStore.getState().importJSON(text);
    } catch {
      alert(t('import.failed'));
    }
  };
  input.click();
}

export function importGpxFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.gpx';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = parseGpx(text);
      useProjectStore.getState().importGpx(data);
    } catch (err) {
      alert(`${t('gpx.importFailed')}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  input.click();
}
