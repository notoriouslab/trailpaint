/**
 * Postcard renderer — composes a 1080x1080 IG-square image from a captured map
 * (top half) plus a stamp panel showing era / location / scripture (bottom half).
 *
 * Design ref: openspec/changes/2026-05-03-016-time-slider-postcard/design.md B4, D8
 *
 * Caller flow (T8):
 *   const captured = await captureMap(2);
 *   const blob = await renderPostcard({ capturedMap: captured, stamp: ..., locale: ... });
 *   // blob -> <a download> or upload to clipboard / share API
 *
 * Excluded from `captureMap` itself — postcard is a derivative artefact built
 * on top of captureMap output, not a control. No CSS class to filter.
 */

import type { CapturedMap } from './exportRenderer';
import { formatStampLines, type StampLocale } from './postcardStamp';

const POSTCARD_SIZE = 1080;
const MAP_HEIGHT = 720;
const STAMP_TOP_Y = MAP_HEIGHT;

const STAMP_BG = '#fdf8ef';
const STAMP_BORDER = '#7c3a0e';
const STAMP_TEXT = '#3b1a06';
const STAMP_MUTED = '#8b6914';

const FONT_STACK = '"EB Garamond", "Cormorant Garamond", "Noto Serif TC", "Noto Serif JP", Georgia, serif';

export interface PostcardStampInput {
  year: number;
  location?: string;
  scriptureRef?: string;
}

export interface PostcardOptions {
  capturedMap: CapturedMap;
  stamp: PostcardStampInput;
  locale: StampLocale;
}

/**
 * Compose the postcard. Returns a PNG Blob. Uses OffscreenCanvas where
 * available for off-main-thread render; falls back to HTMLCanvasElement.
 */
export async function renderPostcard({
  capturedMap,
  stamp,
  locale,
}: PostcardOptions): Promise<Blob> {
  const useOffscreen = typeof OffscreenCanvas !== 'undefined';
  const canvas: OffscreenCanvas | HTMLCanvasElement = useOffscreen
    ? new OffscreenCanvas(POSTCARD_SIZE, POSTCARD_SIZE)
    : (() => {
        const c = document.createElement('canvas');
        c.width = POSTCARD_SIZE;
        c.height = POSTCARD_SIZE;
        return c;
      })();
  const ctx = canvas.getContext('2d') as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error('postcardRenderer: 2D context unavailable');

  // Background fill (covers the stamp panel; map area gets overdrawn)
  ctx.fillStyle = STAMP_BG;
  ctx.fillRect(0, 0, POSTCARD_SIZE, POSTCARD_SIZE);

  drawMapCoverFit(ctx as CanvasRenderingContext2D, capturedMap, 0, 0, POSTCARD_SIZE, MAP_HEIGHT);
  drawStampPanel(ctx as CanvasRenderingContext2D, stamp, locale);

  if (canvas instanceof OffscreenCanvas) {
    return await canvas.convertToBlob({ type: 'image/png' });
  }
  return new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob((blob) => {
      if (!blob) reject(new Error('postcardRenderer: toBlob returned null'));
      else resolve(blob);
    }, 'image/png');
  });
}

/** Cover-fit the captured map (tiles + overlays) into the destination rect. */
function drawMapCoverFit(
  ctx: CanvasRenderingContext2D,
  cm: CapturedMap,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const src = cm.tilesImg;
  const sw = src.naturalWidth || src.width;
  const sh = src.naturalHeight || src.height;
  if (sw === 0 || sh === 0) return;
  const scale = Math.max(dw / sw, dh / sh);
  const renderW = sw * scale;
  const renderH = sh * scale;
  const cx = dx + (dw - renderW) / 2;
  const cy = dy + (dh - renderH) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();
  ctx.drawImage(src, cx, cy, renderW, renderH);
  ctx.drawImage(cm.overlaysImg, cx, cy, renderW, renderH);
  ctx.restore();
}

/** Bottom 360px panel: era / location / scripture / watermark. */
function drawStampPanel(
  ctx: CanvasRenderingContext2D,
  stamp: PostcardStampInput,
  locale: StampLocale,
): void {
  // Top separator line under the map
  ctx.strokeStyle = STAMP_BORDER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, STAMP_TOP_Y + 4);
  ctx.lineTo(POSTCARD_SIZE - 80, STAMP_TOP_Y + 4);
  ctx.stroke();

  const lines = formatStampLines(stamp, locale);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Era — large
  ctx.fillStyle = STAMP_TEXT;
  ctx.font = `60px ${FONT_STACK}`;
  ctx.fillText(lines[0], POSTCARD_SIZE / 2, STAMP_TOP_Y + 110);

  // Location — medium
  if (lines[1]) {
    ctx.font = `36px ${FONT_STACK}`;
    ctx.fillText(lines[1], POSTCARD_SIZE / 2, STAMP_TOP_Y + 180);
  }

  // Scripture ref — small italic muted
  if (lines[2]) {
    ctx.fillStyle = STAMP_MUTED;
    ctx.font = `italic 28px ${FONT_STACK}`;
    ctx.fillText(lines[2], POSTCARD_SIZE / 2, STAMP_TOP_Y + 240);
  }

  // Watermark bottom-right
  ctx.fillStyle = STAMP_MUTED;
  ctx.font = `18px ${FONT_STACK}`;
  ctx.textAlign = 'right';
  ctx.fillText('via TrailPaint · trailpaint.org', POSTCARD_SIZE - 60, POSTCARD_SIZE - 30);
}
