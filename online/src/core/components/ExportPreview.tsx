import { useState, useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import {
  renderExportCanvas,
  type ExportFormat,
  type ExportBorderStyle,
  type StyleFilter,
} from '../utils/exportRenderer';
import { applyStyleFilter } from '../utils/styleFilters';
import { encodeShareLink } from '../utils/shareLink';
import { t } from '../../i18n';
import './ExportPreview.css';

interface ExportPreviewProps {
  baseImage: HTMLImageElement | null;
  onClose: () => void;
  onRecapture: (pixelRatio: number) => Promise<HTMLImageElement>;
}

const FORMATS: ExportFormat[] = ['full', '1:1', '9:16', '4:3'];
const BORDERS: ExportBorderStyle[] = ['classic', 'paper', 'minimal'];
const FILTERS: StyleFilter[] = ['original', 'watercolor', 'sketch', 'vintage', 'comic'];
const RESOLUTIONS = [1, 2, 3] as const;

// Type-safe i18n label lookups (no unsafe casts)
const FORMAT_LABEL: Record<ExportFormat, () => string> = {
  'full': () => t('export.format.full'),
  '1:1': () => t('export.format.1:1'),
  '9:16': () => t('export.format.9:16'),
  '4:3': () => t('export.format.4:3'),
};
const BORDER_LABEL: Record<ExportBorderStyle, () => string> = {
  classic: () => t('export.border.classic'),
  paper: () => t('export.border.paper'),
  minimal: () => t('export.border.minimal'),
};
const FILTER_LABEL: Record<StyleFilter, () => string> = {
  original: () => t('export.filter.original'),
  watercolor: () => t('export.filter.watercolor'),
  sketch: () => t('export.filter.sketch'),
  vintage: () => t('export.filter.vintage'),
  comic: () => t('export.filter.comic'),
};

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '_').slice(0, 100) || 'Untitled';
}

function getAiPrompt(routeName: string, filter: StyleFilter): string {
  // Sanitize: keep letters, numbers, whitespace, basic punctuation only
  const name = routeName.replace(/[^\p{L}\p{N}\s\-·—.,()]/gu, '').trim().slice(0, 100) || 'a hiking trail';
  const base = `An illustrated trail map of "${name}"`;

  const styleDesc: Record<StyleFilter, string> = {
    original: `${base}, hand-drawn cartographic style with warm paper texture, Georgia serif typography, dashed trail paths with directional arrows, nature icons for points of interest. Warm earth tones (#78350f, #fdf8ef). Stationery illustration aesthetic.`,
    watercolor: `${base} in watercolor painting style. Soft wet-on-wet technique, gentle color bleeding at edges, subtle paper grain texture. Muted pastel earth tones with forest greens and sky blues. Delicate and airy feel, like a field journal illustration.`,
    sketch: `${base} in pencil sketch style. Fine graphite line work on white paper, cross-hatching for topographic shading, dotted trail paths. Black and white with subtle gray gradients. Clean architectural drawing aesthetic.`,
    vintage: `${base} in vintage cartographic style. Sepia-toned aged paper, classic hand-drawn contour lines, vignette darkening at corners. Reminiscent of 1950s national park service maps. Warm brown and cream palette.`,
    comic: `${base} in comic book illustration style. Bold black outlines, flat color fills with limited palette, high contrast. Pop art influenced with quantized colors. Dynamic and playful, like a manga travel guide illustration.`,
  };

  return styleDesc[filter];
}

export default function ExportPreview({ baseImage, onClose, onRecapture }: ExportPreviewProps) {
  const routes = useProjectStore((s) => s.project.routes);
  const projectName = useProjectStore((s) => s.project.name);
  const showWatermark = useProjectStore((s) => s.watermark);
  const project = useProjectStore((s) => s.project);

  const [format, setFormat] = useState<ExportFormat>('full');
  const [borderStyle, setBorderStyle] = useState<ExportBorderStyle>('classic');
  const [filter, setFilter] = useState<StyleFilter>('original');
  const [pixelRatio, setPixelRatio] = useState(2);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState('');

  const previewRef = useRef<HTMLCanvasElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2000);
  }, []);

  // Render preview whenever settings change
  useEffect(() => {
    if (!baseImage || !previewRef.current) return;

    const canvas = renderExportCanvas(baseImage, {
      format,
      borderStyle,
      filter,
      showWatermark,
      routes,
    }, applyStyleFilter);

    // Scale down to fit preview area
    const preview = previewRef.current;
    const maxW = preview.parentElement?.clientWidth ?? 600;
    const maxH = preview.parentElement?.clientHeight ?? 500;
    const scale = Math.min(1, maxW / canvas.width, maxH / canvas.height);

    preview.width = Math.round(canvas.width * scale);
    preview.height = Math.round(canvas.height * scale);

    const ctx = preview.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0, preview.width, preview.height);
  }, [baseImage, format, borderStyle, filter, showWatermark, routes]);

  // Download at full resolution
  const handleDownload = useCallback(async () => {
    if (!baseImage) return;

    if (pixelRatio >= 3 && !confirm(t('export.3xWarn'))) return;

    setDownloading(true);
    // Let UI update before heavy work
    await new Promise((r) => setTimeout(r, 50));

    try {
      // If pixelRatio != 2 (base capture ratio), re-capture at correct DPI
      let img = baseImage;
      if (pixelRatio !== 2) {
        img = await onRecapture(pixelRatio);
      }

      const canvas = renderExportCanvas(img, {
        format,
        borderStyle,
        filter,
        showWatermark,
        routes,
      }, applyStyleFilter);

      const finalUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      const suffix = format === 'full' ? '' : `-${format.replace(':', 'x')}`;
      const filterSuffix = filter === 'original' ? '' : `-${filter}`;
      link.download = `trailpaint-${sanitizeFilename(projectName)}-${date}${suffix}${filterSuffix}.png`;
      link.href = finalUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert(t('export.failed'));
    } finally {
      setDownloading(false);
    }
  }, [baseImage, pixelRatio, format, borderStyle, filter, showWatermark, routes, projectName, onRecapture]);

  const handleCopyShareLink = useCallback(async () => {
    try {
      const url = await encodeShareLink(project);
      await navigator.clipboard.writeText(url);
      showToast(t('export.preview.shareCopied'));
    } catch (err) {
      console.error('Share link failed:', err);
    }
  }, [project, showToast]);

  const handleCopyAiPrompt = useCallback(async () => {
    const routeName = routes[0]?.name?.trim() ?? projectName;
    const text = getAiPrompt(routeName, filter);
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('export.preview.aiCopied'));
    } catch {
      window.prompt('Copy this prompt:', text);
    }
  }, [routes, projectName, filter, showToast]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!baseImage) return null;

  return (
    <div className="export-preview__backdrop" onClick={onClose}>
      <div className="export-preview" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="export-preview__header">
          <h2>{t('export.preview.title')}</h2>
          <button className="export-preview__close" onClick={onClose}>✕</button>
        </div>

        <div className="export-preview__body">
          {/* Preview area */}
          <div className="export-preview__canvas-wrap">
            <canvas ref={previewRef} className="export-preview__canvas" />
          </div>

          {/* Controls */}
          <div className="export-preview__controls">
            {/* Format */}
            <div className="export-preview__section">
              <label className="export-preview__label">{t('export.preview.format')}</label>
              <div className="export-preview__chips">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    className={`export-preview__chip${format === f ? ' export-preview__chip--active' : ''}`}
                    onClick={() => setFormat(f)}
                  >
                    {FORMAT_LABEL[f]()}
                  </button>
                ))}
              </div>
            </div>

            {/* Border */}
            <div className="export-preview__section">
              <label className="export-preview__label">{t('export.borderStyle')}</label>
              <div className="export-preview__chips">
                {BORDERS.map((b) => (
                  <button
                    key={b}
                    className={`export-preview__chip${borderStyle === b ? ' export-preview__chip--active' : ''}`}
                    onClick={() => setBorderStyle(b)}
                  >
                    {BORDER_LABEL[b]()}
                  </button>
                ))}
              </div>
            </div>

            {/* Style Filter */}
            <div className="export-preview__section">
              <label className="export-preview__label">{t('export.preview.filter')}</label>
              <div className="export-preview__chips">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    className={`export-preview__chip${filter === f ? ' export-preview__chip--active' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {FILTER_LABEL[f]()}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div className="export-preview__section">
              <label className="export-preview__label">{t('export.preview.resolution')}</label>
              <div className="export-preview__chips">
                {RESOLUTIONS.map((r) => (
                  <button
                    key={r}
                    className={`export-preview__chip${pixelRatio === r ? ' export-preview__chip--active' : ''}`}
                    onClick={() => setPixelRatio(r)}
                  >
                    {r}x{r === 3 ? ' ⚠️' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="export-preview__actions">
              <button
                className="export-preview__btn export-preview__btn--primary"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? t('export.preview.downloading') : t('export.preview.download')}
              </button>
              <button
                className="export-preview__btn"
                onClick={handleCopyShareLink}
              >
                🔗 {t('export.preview.shareLink')}
              </button>
              <button
                className="export-preview__btn"
                onClick={handleCopyAiPrompt}
              >
                🤖 {t('export.preview.aiPrompt')}
              </button>
            </div>
          </div>
        </div>

        {/* Toast */}
        {toast && <div className="export-preview__toast">{toast}</div>}
      </div>
    </div>
  );
}
