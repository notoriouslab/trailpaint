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
  // Support both raster <img> tiles and vector <canvas> tiles (protomaps-leaflet)
  const tiles = mapEl.querySelectorAll<HTMLElement>('.leaflet-tile-pane img, .leaflet-tile-pane canvas');
  for (const tile of tiles) {
    if (tile instanceof HTMLImageElement && (!tile.complete || !tile.naturalWidth)) continue;
    const r = tile.getBoundingClientRect();
    try {
      ctx.drawImage(
        tile as CanvasImageSource,
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
 * Draw spot-card photos directly to canvas, bypassing html-to-image's
 * foreignObject which silently fails on iOS Safari at pixelRatio ≥ 3.
 *
 * Each photo <img> lives inside .spot-card__photo-wrap. We read its
 * bounding rect and apply the same border-radius clip as the CSS.
 */
function drawPhotosToCanvas(
  ctx: CanvasRenderingContext2D,
  mapEl: HTMLElement,
  containerRect: DOMRect,
  pixelRatio: number,
) {
  const photos = mapEl.querySelectorAll<HTMLImageElement>('.spot-card__photo');
  for (const img of photos) {
    if (!img.complete || !img.naturalWidth) continue;

    const r = img.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const dx = (r.left - containerRect.left) * pixelRatio;
    const dy = (r.top - containerRect.top) * pixelRatio;
    const dw = r.width * pixelRatio;
    const dh = r.height * pixelRatio;

    // Replicate object-fit: cover — compute source crop rect
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const boxRatio = r.width / r.height;
    let sx: number, sy: number, sw: number, sh: number;
    if (imgRatio > boxRatio) {
      // Image wider than box → crop sides
      sh = img.naturalHeight;
      sw = sh * boxRatio;
      sx = (img.naturalWidth - sw) / 2;
      sy = 0;
    } else {
      // Image taller than box → crop top/bottom
      sw = img.naturalWidth;
      sh = sw / boxRatio;
      sx = 0;
      sy = (img.naturalHeight - sh) / 2;
    }

    // Clip to match CSS border-radius: 4px
    const radius = 4 * pixelRatio;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(dx, dy, dw, dh, radius);
    ctx.clip();
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
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

  // Wait for pending tile loads to settle.
  // Raster tiles need ~200ms; vector tiles (protomaps-leaflet) render to canvas
  // asynchronously and may need longer. Poll until no new tiles appear or timeout.
  await new Promise((r) => setTimeout(r, 200));
  const hasPendingCanvasTiles = () => {
    const canvases = mapEl.querySelectorAll<HTMLCanvasElement>('.leaflet-tile-pane canvas');
    for (const c of canvases) {
      // A blank canvas has all-zero pixels; check one pixel as a quick heuristic
      try {
        const px = c.getContext('2d')?.getImageData(0, 0, 1, 1).data;
        if (px && px[3] === 0) return true; // fully transparent → not yet rendered
      } catch { /* tainted or unavailable — skip */ }
    }
    return false;
  };
  // Wait up to 1.5s extra for vector tiles (3 checks × 500ms)
  for (let i = 0; i < 3 && hasPendingCanvasTiles(); i++) {
    await new Promise((r) => setTimeout(r, 500));
  }

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
        // Exclude card photos — they are drawn directly to canvas below
        // to avoid iOS Safari foreignObject decode failures at high pixelRatio.
        if (el.tagName === 'IMG' && el.closest('.spot-card__photo-wrap')) return false;
        // Exclude vector tile canvases (protomaps-leaflet) — already drawn in Step 1.
        // foreignObject cannot serialize canvas content, so they'd appear blank.
        if (el.tagName === 'CANVAS' && el.closest('.leaflet-tile-pane')) return false;
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

    // Draw card photos directly via canvas.drawImage (bypasses foreignObject).
    // This runs AFTER the overlay composite so photos render on top of the
    // card background/border that html-to-image already drew.
    drawPhotosToCanvas(ctx, mapEl, containerRect, dpi);
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
