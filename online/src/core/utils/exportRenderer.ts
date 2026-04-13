import { polylineDistance, formatDistance, elevationStats, estimateTime } from './geo';
import type { Route } from '../models/routes';

export type ExportBorderStyle = 'classic' | 'paper' | 'minimal';
export type ExportFormat = '1:1' | '9:16' | '4:3' | 'full';

/** roundRect with fallback for Safari < 16 / Chrome < 112 */
export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
export type StyleFilter = 'original' | 'watercolor' | 'sketch' | 'vintage' | 'comic';

/* ── Crop ── */

export function getCropDimensions(
  imgW: number,
  imgH: number,
  format: ExportFormat,
): { cropX: number; cropY: number; cropW: number; cropH: number } {
  if (format === 'full') return { cropX: 0, cropY: 0, cropW: imgW, cropH: imgH };

  const ratios: Record<string, number> = { '1:1': 1, '9:16': 9 / 16, '4:3': 4 / 3 };
  const targetRatio = ratios[format] ?? 1;
  const currentRatio = imgW / imgH;

  let cropX = 0, cropY = 0, cropW = imgW, cropH = imgH;
  if (currentRatio > targetRatio) {
    cropW = Math.round(imgH * targetRatio);
    cropX = Math.round((imgW - cropW) / 2);
  } else {
    cropH = Math.round(imgW / targetRatio);
    cropY = Math.round((imgH - cropH) / 2);
  }
  return { cropX, cropY, cropW, cropH };
}

/* ── Border ── */

export function drawExportBorder(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  style: ExportBorderStyle = 'classic',
) {
  if (style === 'classic') {
    const lw = Math.max(2, Math.round(Math.min(w, h) * 0.005));
    const p1 = lw * 3;
    const p2 = p1 + lw * 4;
    ctx.strokeStyle = 'rgba(80,110,140,0.38)';
    ctx.lineWidth = lw;
    ctx.strokeRect(p1, p1, w - p1 * 2, h - p1 * 2);
    ctx.strokeStyle = 'rgba(80,110,140,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(p2, p2, w - p2 * 2, h - p2 * 2);
  } else if (style === 'paper') {
    const margin = Math.round(Math.min(w, h) * 0.018);
    const jitter = () => (Math.random() - 0.5) * Math.max(2, Math.min(w, h) * 0.003);

    ctx.save();

    const edgeWidth = Math.round(margin * 0.8);
    const grad = ctx.createLinearGradient(0, 0, edgeWidth, 0);
    grad.addColorStop(0, 'rgba(255,248,220,0.55)');
    grad.addColorStop(1, 'rgba(255,248,220,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, edgeWidth, h);
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.fillRect(0, 0, edgeWidth, h);
    ctx.restore();
    const gradTop = ctx.createLinearGradient(0, 0, 0, edgeWidth);
    gradTop.addColorStop(0, 'rgba(255,248,220,0.55)');
    gradTop.addColorStop(1, 'rgba(255,248,220,0)');
    ctx.fillStyle = gradTop;
    ctx.fillRect(0, 0, w, edgeWidth);
    ctx.save();
    ctx.translate(0, h);
    ctx.scale(1, -1);
    ctx.fillRect(0, 0, w, edgeWidth);
    ctx.restore();

    ctx.strokeStyle = 'rgba(160,120,60,0.45)';
    ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.003);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    const m = margin;
    ctx.moveTo(m + jitter(), m + jitter());
    ctx.lineTo(w - m + jitter(), m + jitter());
    ctx.lineTo(w - m + jitter(), h - m + jitter());
    ctx.lineTo(m + jitter(), h - m + jitter());
    ctx.closePath();
    ctx.stroke();

    const dotR = Math.max(3, Math.round(Math.min(w, h) * 0.008));
    ctx.fillStyle = 'rgba(160,120,60,0.55)';
    for (const [cx, cy] of [[m, m], [w - m, m], [w - m, h - m], [m, h - m]] as [number, number][]) {
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  } else if (style === 'minimal') {
    const margin = Math.round(Math.min(w, h) * 0.022);
    const radius = Math.round(Math.min(w, h) * 0.04);
    ctx.save();
    ctx.strokeStyle = 'rgba(100,100,100,0.25)';
    ctx.lineWidth = Math.max(1, Math.round(Math.min(w, h) * 0.002));
    ctx.beginPath();
    roundRectPath(ctx, margin, margin, w - margin * 2, h - margin * 2, radius);
    ctx.stroke();
    ctx.restore();
  }
}

/* ── Stats Overlay ── */

export function drawStatsOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  routes: Route[],
) {
  if (routes.length === 0) return;

  const routeName = routes[0].name?.trim() ?? '';

  let totalDist = 0;
  let totalAscent = 0;
  let totalDescent = 0;
  let hasEle = false;

  for (const r of routes) {
    totalDist += polylineDistance(r.pts);
    if (r.elevations) {
      hasEle = true;
      const s = elevationStats(r.elevations);
      totalAscent += s.ascent;
      totalDescent += s.descent;
    }
  }

  const parts: string[] = [];
  parts.push(`📏 ${formatDistance(totalDist)}`);
  if (hasEle) {
    parts.push(`⏱️ ${estimateTime(totalDist, totalAscent)}`);
    parts.push(`↗ ${totalAscent}m  ↘ ${totalDescent}m`);
  }

  const statsText = parts.join('   ');
  const fs = Math.round(Math.min(w, h) * 0.022);
  const nameFontSize = Math.round(fs * 1.1);
  const pad = Math.round(fs * 0.8);

  ctx.save();

  ctx.font = `bold ${nameFontSize}px Georgia, serif`;
  const nameMetrics = routeName ? ctx.measureText(routeName) : { width: 0 };
  ctx.font = `${fs}px Georgia, serif`;
  const statsMetrics = ctx.measureText(statsText);
  const contentW = Math.max(nameMetrics.width, statsMetrics.width);
  const boxW = contentW + pad * 2;

  const lineH = fs * 1.5;
  const nameH = routeName ? nameFontSize * 1.4 : 0;
  const boxH = nameH + lineH + pad * 1.5;

  const x = pad;
  const y = h - boxH - pad;

  ctx.fillStyle = 'rgba(253,248,239,0.88)';
  ctx.beginPath();
  roundRectPath(ctx, x, y, boxW, boxH, fs * 0.4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,130,60,0.32)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#78350f';
  ctx.textAlign = 'left';

  if (routeName) {
    ctx.font = `bold ${nameFontSize}px Georgia, serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(routeName, x + pad, y + pad * 0.8);
  }

  ctx.font = `${fs}px Georgia, serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(statsText, x + pad, y + nameH + pad * 0.8);

  ctx.restore();
}

/* ── Watermark ── */

export function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const fs = Math.round(Math.min(w, h) * 0.018);
  const pad = Math.round(fs * 0.8);
  const text = '🌿 TrailPaint 路小繪';
  const sub = 'notoriouslab';

  ctx.save();
  ctx.font = `bold ${fs}px Georgia, serif`;
  const mainW = ctx.measureText(text).width;
  ctx.font = `${Math.round(fs * 0.7)}px Georgia, serif`;
  const subW = ctx.measureText(sub).width;
  const totalW = Math.max(mainW, subW) + pad * 2;
  const totalH = fs * 2 + pad * 2;
  const x = w - totalW - pad;
  const y = h - totalH - pad * 3;

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x, y, totalW, totalH);

  ctx.fillStyle = 'rgba(120,120,120,0.45)';
  ctx.font = `bold ${fs}px Georgia, serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(text, w - pad * 2, y + pad);

  ctx.fillStyle = 'rgba(120,120,120,0.30)';
  ctx.font = `${Math.round(fs * 0.7)}px Georgia, serif`;
  ctx.fillText(sub, w - pad * 2, y + pad + fs * 1.2);
  ctx.restore();
}

/* ── Full render pipeline ── */

export interface RenderOptions {
  format: ExportFormat;
  borderStyle: ExportBorderStyle;
  filter: StyleFilter;
  showWatermark: boolean;
  routes: Route[];
}

/**
 * Render an export canvas from a base image with all effects applied.
 * Returns the resulting canvas.
 */
export function renderExportCanvas(
  baseImage: HTMLImageElement,
  options: RenderOptions,
  applyFilter: (canvas: HTMLCanvasElement, filter: StyleFilter) => void,
): HTMLCanvasElement {
  const { cropX, cropY, cropW, cropH } = getCropDimensions(
    baseImage.width,
    baseImage.height,
    options.format,
  );

  const canvas = document.createElement('canvas');
  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext('2d', { willReadFrequently: options.filter !== 'original' })!;
  ctx.drawImage(baseImage, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  // Style filter (before overlays so border/stats stay crisp)
  if (options.filter !== 'original') {
    applyFilter(canvas, options.filter);
  }

  drawExportBorder(ctx, cropW, cropH, options.borderStyle);
  drawStatsOverlay(ctx, cropW, cropH, options.routes);
  if (options.showWatermark) {
    drawWatermark(ctx, cropW, cropH);
  }

  return canvas;
}
