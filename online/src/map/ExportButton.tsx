import { toPng } from 'html-to-image';
import { useProjectStore } from '../core/store/useProjectStore';
import { parseGpx } from '../core/utils/gpxParser';
import { polylineDistance, formatDistance, elevationStats, estimateTime } from '../core/utils/geo';
import { t } from '../i18n';

function sanitizeFilename(name: string): string {
  return name.replace(/[\/\\:*?"<>|]/g, '_').slice(0, 100) || 'Untitled';
}

export type ExportBorderStyle = 'classic' | 'paper' | 'minimal';

function drawExportBorder(ctx: CanvasRenderingContext2D, w: number, h: number, style: ExportBorderStyle = 'classic') {
  if (style === 'classic') {
    // 原有雙層線框
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
    // 紙感邊框：暖奶油色底邊 + 手繪不規則線 + 角落小圓點
    const margin = Math.round(Math.min(w, h) * 0.018);
    const jitter = () => (Math.random() - 0.5) * Math.max(2, Math.min(w, h) * 0.003);

    ctx.save();

    // 暖奶油色漸層底邊（只在四邊畫一層薄膜感）
    const edgeWidth = Math.round(margin * 0.8);
    const grad = ctx.createLinearGradient(0, 0, edgeWidth, 0);
    grad.addColorStop(0, 'rgba(255,248,220,0.55)');
    grad.addColorStop(1, 'rgba(255,248,220,0)');
    // 左邊
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, edgeWidth, h);
    // 右邊
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.fillRect(0, 0, edgeWidth, h);
    ctx.restore();
    // 上邊
    const gradTop = ctx.createLinearGradient(0, 0, 0, edgeWidth);
    gradTop.addColorStop(0, 'rgba(255,248,220,0.55)');
    gradTop.addColorStop(1, 'rgba(255,248,220,0)');
    ctx.fillStyle = gradTop;
    ctx.fillRect(0, 0, w, edgeWidth);
    // 下邊
    ctx.save();
    ctx.translate(0, h);
    ctx.scale(1, -1);
    ctx.fillRect(0, 0, w, edgeWidth);
    ctx.restore();

    // 手繪不規則邊框線
    ctx.strokeStyle = 'rgba(160,120,60,0.45)';
    ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.003);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    // 以 margin 為基準，每個角加一點抖動模擬手繪感
    const m = margin;
    ctx.moveTo(m + jitter(), m + jitter());
    ctx.lineTo(w - m + jitter(), m + jitter());
    ctx.lineTo(w - m + jitter(), h - m + jitter());
    ctx.lineTo(m + jitter(), h - m + jitter());
    ctx.closePath();
    ctx.stroke();

    // 角落裝飾小圓點（四個角各一個）
    const dotR = Math.max(3, Math.round(Math.min(w, h) * 0.008));
    const dotColor = 'rgba(160,120,60,0.55)';
    ctx.fillStyle = dotColor;
    for (const [cx, cy] of [[m, m], [w - m, m], [w - m, h - m], [m, h - m]] as [number, number][]) {
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  } else if (style === 'minimal') {
    // 極簡：單線細框 + 大圓角
    const margin = Math.round(Math.min(w, h) * 0.022);
    const radius = Math.round(Math.min(w, h) * 0.04);
    ctx.save();
    ctx.strokeStyle = 'rgba(100,100,100,0.25)';
    ctx.lineWidth = Math.max(1, Math.round(Math.min(w, h) * 0.002));
    ctx.beginPath();
    ctx.roundRect(margin, margin, w - margin * 2, h - margin * 2, radius);
    ctx.stroke();
    ctx.restore();
  }
}

function drawStatsOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const state = useProjectStore.getState();
  const routes = state.project.routes;
  if (routes.length === 0) return;

  // 第一條路線名稱（有值才顯示）
  const routeName = routes[0].name?.trim() ?? '';

  // Aggregate stats across all routes
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

  // 計算 box 寬度（取路線名稱與統計文字中較寬者）
  ctx.font = `bold ${nameFontSize}px Georgia, serif`;
  const nameMetrics = routeName ? ctx.measureText(routeName) : { width: 0 };
  ctx.font = `${fs}px Georgia, serif`;
  const statsMetrics = ctx.measureText(statsText);
  const contentW = Math.max(nameMetrics.width, statsMetrics.width);
  const boxW = contentW + pad * 2;

  // 高度：有路線名稱時多一行
  const lineH = fs * 1.5;
  const nameH = routeName ? nameFontSize * 1.4 : 0;
  const boxH = nameH + lineH + pad * 1.5;

  const x = pad;
  const y = h - boxH - pad;

  // Background pill
  ctx.fillStyle = 'rgba(253,248,239,0.88)';
  ctx.beginPath();
  ctx.roundRect(x, y, boxW, boxH, fs * 0.4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,130,60,0.32)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#78350f';
  ctx.textAlign = 'left';

  // 路線名稱（粗體，稍大）
  if (routeName) {
    ctx.font = `bold ${nameFontSize}px Georgia, serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(routeName, x + pad, y + pad * 0.8);
  }

  // 統計文字
  ctx.font = `${fs}px Georgia, serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(statsText, x + pad, y + nameH + pad * 0.8);

  ctx.restore();
}

function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
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
  const y = h - totalH - pad * 3; // Above stats overlay

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

export type ExportFormat = '1:1' | '9:16' | '4:3' | 'full';

export function exportPng(pixelRatio = 2, format: ExportFormat = 'full', borderStyle: ExportBorderStyle = 'classic') {
  const projectName = useProjectStore.getState().project.name;
  const mapEl = document.querySelector('.leaflet-container') as HTMLElement | null;
  if (!mapEl) return;

  if (pixelRatio >= 3 && !confirm(t('export.3xWarn'))) return;

  setTimeout(async () => {
    try {
      const dataUrl = await toPng(mapEl, {
        cacheBust: true,
        pixelRatio,
        filter: (node) => {
          const el = node as HTMLElement;
          if (el.classList?.contains('leaflet-control-container')) return false;
          if (el.classList?.contains('watermark')) return false; // Draw watermark on canvas after crop
          return true;
        },
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('Image load failed')); });

      // Calculate crop for format
      let cropX = 0, cropY = 0, cropW = img.width, cropH = img.height;
      if (format !== 'full') {
        const ratios: Record<string, number> = { '1:1': 1, '9:16': 9 / 16, '4:3': 4 / 3 };
        const targetRatio = ratios[format] ?? 1;
        const currentRatio = img.width / img.height;
        if (currentRatio > targetRatio) {
          cropW = Math.round(img.height * targetRatio);
          cropX = Math.round((img.width - cropW) / 2);
        } else {
          cropH = Math.round(img.width / targetRatio);
          cropY = Math.round((img.height - cropH) / 2);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      drawExportBorder(ctx, cropW, cropH, borderStyle);
      drawStatsOverlay(ctx, cropW, cropH);
      if (useProjectStore.getState().watermark) {
        drawWatermark(ctx, cropW, cropH);
      }

      const finalUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      const suffix = format === 'full' ? '' : `-${format.replace(':', 'x')}`;
      link.download = `trailpaint-${sanitizeFilename(projectName)}-${date}${suffix}.png`;
      link.href = finalUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert(t('export.failed'));
    }
  }, 300);
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

export function loadProject() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
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
