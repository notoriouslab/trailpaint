import { toPng } from 'html-to-image';
import { useProjectStore } from '../core/store/useProjectStore';
import { parseGpx } from '../core/utils/gpxParser';
import { t } from '../i18n';

function drawExportBorder(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const lw = Math.max(2, Math.round(Math.min(w, h) * 0.005));
  const p1 = lw * 3;
  const p2 = p1 + lw * 4;
  ctx.strokeStyle = 'rgba(80,110,140,0.38)';
  ctx.lineWidth = lw;
  ctx.strokeRect(p1, p1, w - p1 * 2, h - p1 * 2);
  ctx.strokeStyle = 'rgba(80,110,140,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(p2, p2, w - p2 * 2, h - p2 * 2);
}

export function exportPng(pixelRatio = 2) {
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
          return true;
        },
      });

      // Add border overlay
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve) => { img.onload = () => resolve(); });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      drawExportBorder(ctx, img.width, img.height);
      const finalUrl = canvas.toDataURL('image/png');

      const link = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      link.download = `trailpaint-${projectName}-${date}-${pixelRatio}x.png`;
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
  link.download = `${projectName}.trailpaint.json`;
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
      alert(`${t('gpx.importFailed')}: ${(err as Error).message}`);
    }
  };
  input.click();
}
