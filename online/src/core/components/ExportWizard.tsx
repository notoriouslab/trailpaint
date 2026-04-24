import { useState, useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import {
  renderExportCanvas,
  type ExportFormat,
  type ExportBorderStyle,
  type StyleFilter,
  type CapturedMap,
} from '../utils/exportRenderer';
import { applyStyleFilter } from '../utils/styleFilters';
import { createBackendShare } from '../utils/shareLink';
import { buildProjectEmbedHtml } from '../utils/embedCode';
import { t, currentLocale } from '../../i18n';
import './ExportWizard.css';

interface ExportWizardProps {
  baseImage: CapturedMap | null;
  onClose: () => void;
  onAdjust: (dx: number, dy: number, dZoom: number) => Promise<CapturedMap>;
  onCapture: () => Promise<void>;
  onSave: () => void;
  onOpenImportWizard: () => void;
  onExportGeojson: () => void;
  onExportKml: () => void;
}

type WizardTab = 'image' | 'backup' | 'interop';
const WIZARD_TABS: WizardTab[] = ['image', 'backup', 'interop'];

const FORMATS: ExportFormat[] = ['full', '1:1', '9:16', '4:3'];
const BORDERS: ExportBorderStyle[] = ['classic', 'paper', 'minimal'];
const FILTERS: StyleFilter[] = ['original', 'sketch'];

/** Copy text to clipboard with iOS Safari fallback */
async function copyToClipboard(text: string): Promise<boolean> {
  // Try ClipboardItem API (better iOS PWA support)
  if (navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }) }),
      ]);
      return true;
    } catch { /* fall through */ }
  }
  // Try writeText
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch { /* fall through */ }
  }
  // Fallback: hidden textarea + execCommand
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.setSelectionRange(0, text.length);
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  return ok;
}

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
  sketch: () => t('export.filter.sketch'),
};

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '_').slice(0, 100) || 'Untitled';
}

type AiStyle = 'japanese' | 'treasure' | 'kawaii';

const AI_STYLES: AiStyle[] = ['japanese', 'treasure', 'kawaii'];

const LOCALE_LABEL_INSTRUCTION: Record<string, string> = {
  'zh-TW': 'All text labels on the map MUST be written in Traditional Chinese (繁體中文). Do NOT use Simplified Chinese or garbled characters.',
  'ja': 'All text labels on the map MUST be written in Japanese (日本語).',
  'en': 'All text labels on the map should be written in English.',
};

function getAiPrompt(routeName: string, aiStyle: AiStyle): string {
  const name = routeName.replace(/[^\p{L}\p{N}\s\-·—.,()]/gu, '').trim().slice(0, 100) || 'a hiking trail';
  const base = `An illustrated trail map of "${name}"`;
  const langRule = LOCALE_LABEL_INSTRUCTION[currentLocale] ?? LOCALE_LABEL_INSTRUCTION['en'];

  const prompts: Record<AiStyle, string> = {
    japanese: `${base}, Japanese hand-drawn cartographic style (手描き地図). Warm washi paper texture, soft watercolor washes for terrain, delicate ink outlines, handwritten-style labels. Muted earth tones with gentle greens and warm browns. Illustrated travel journal (旅ノート) aesthetic. ${langRule}`,
    treasure: `${base} in antique treasure map style. Aged parchment with burnt edges and coffee stains, ornate compass rose, hand-drawn topographic features with hachure shading, sea-monster-style decorative illustrations in margins. Sepia ink with gold and deep brown tones. Old-world cartography aesthetic, as if drawn by an 18th-century explorer. ${langRule}`,
    kawaii: `${base} in cute kawaii cartoon style. Rounded soft shapes, pastel color palette (mint green, baby pink, cream, lavender), tiny smiling trees and clouds, chibi-style hikers, bubble-letter labels. Flat design with subtle shadows. Cheerful, cozy, sticker-sheet aesthetic. ${langRule}`,
  };

  return prompts[aiStyle];
}

const PAN_STEP = 80; // pixels per click

export default function ExportWizard({
  baseImage,
  onClose,
  onAdjust,
  onCapture,
  onSave,
  onOpenImportWizard,
  onExportGeojson,
  onExportKml,
}: ExportWizardProps) {
  const spots = useProjectStore((s) => s.project.spots);
  const routes = useProjectStore((s) => s.project.routes);
  const isMapMode = useProjectStore((s) => s.baseMode === 'map');
  const projectName = useProjectStore((s) => s.project.name);
  const showWatermark = useProjectStore((s) => s.watermark);
  const project = useProjectStore((s) => s.project);
  const hasData = spots.length > 0 || routes.length > 0;

  const [activeTab, setActiveTab] = useState<WizardTab>('image');
  const [format, setFormat] = useState<ExportFormat>('full');
  const [borderStyle, setBorderStyle] = useState<ExportBorderStyle>('classic');
  const [filter, setFilter] = useState<StyleFilter>('original');
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  // `capturing` = first-time lazy capture when entering image tab;
  // `adjusting` = re-capture after user pan/zoom. Intentionally separate.
  const [capturing, setCapturing] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [toast, setToast] = useState('');
  const [aiStyle, setAiStyle] = useState<AiStyle>('japanese');

  const previewRef = useRef<HTMLCanvasElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2000);
  }, []);

  const handleAdjust = useCallback(async (dx: number, dy: number, dZoom: number) => {
    if (adjusting) return;
    setAdjusting(true);
    try {
      await onAdjust(dx, dy, dZoom);
    } catch (err) {
      console.error('Adjust failed:', err);
    } finally {
      setAdjusting(false);
    }
  }, [adjusting, onAdjust]);

  // Lazy capture: first time user enters image tab without baseImage,
  // trigger onCapture (which collapses sidebar + panBy + captureMap in App.tsx).
  useEffect(() => {
    if (activeTab !== 'image') return;
    if (baseImage) return;
    if (capturing) return;
    setCapturing(true);
    onCapture().finally(() => setCapturing(false));
  }, [activeTab, baseImage, capturing, onCapture]);

  // Render preview whenever settings change
  useEffect(() => {
    if (!baseImage || !previewRef.current) return;

    const canvas = renderExportCanvas(baseImage, {
      format,
      borderStyle,
      filter,
      showWatermark,
      routes,
      showStats: isMapMode,
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
  }, [baseImage, format, borderStyle, filter, showWatermark, routes, isMapMode]);

  // Download at full resolution (always 2x)
  const handleDownload = useCallback(async () => {
    if (!baseImage) return;

    setDownloading(true);
    await new Promise((r) => setTimeout(r, 50));

    try {
      const canvas = renderExportCanvas(baseImage, {
        format,
        borderStyle,
        filter,
        showWatermark,
        routes,
        showStats: isMapMode,
      }, applyStyleFilter);

      const finalUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      const fmtSuffix = format === 'full' ? '' : `-${format.replace(':', 'x')}`;
      const filterSuffix = filter === 'original' ? '' : `-${filter}`;
      link.download = `trailpaint-${sanitizeFilename(projectName)}-${date}${fmtSuffix}${filterSuffix}.png`;
      link.href = finalUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert(t('export.failed'));
    } finally {
      setDownloading(false);
    }
  }, [baseImage, format, borderStyle, filter, showWatermark, routes, projectName]);

  const handleCopyShareLink = useCallback(async () => {
    // Call the backend exactly once per click and share the Promise across
    // both clipboard paths. Why: calling `createBackendShare` twice (once in
    // the ClipboardItem path, then again in the await fallback) would have
    // the second call hit the WAF rate limit (10 req / 10s per IP), silently
    // degrading to TinyURL or long-hash URL — which is the "short link turns
    // into a long URL" bug Safari hit with photo-heavy projects.
    //
    // Why ClipboardItem with a pending Blob Promise: Safari (desktop + iOS)
    // revokes clipboard permission the moment we `await` — the user gesture
    // is spent. ClipboardItem lets us synchronously enqueue the write inside
    // the gesture and wait for the promise to resolve before the browser
    // actually touches the clipboard. Chrome/Firefox honour this shape too.
    const urlPromise = createBackendShare(project);
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        try {
          const blobPromise = urlPromise.then(
            (url) => new Blob([url], { type: 'text/plain' }),
          );
          await navigator.clipboard.write([
            new ClipboardItem({ 'text/plain': blobPromise }),
          ]);
          showToast(t('export.preview.shareCopied'));
          return;
        } catch (err) {
          console.warn('[share] ClipboardItem path failed, falling back:', err);
        }
      }
      const url = await urlPromise;
      const ok = await copyToClipboard(url);
      if (ok) showToast(t('export.preview.shareCopied'));
      else showToast(t('export.preview.shortFailed'));
    } catch (err) {
      console.error('Share link failed:', err);
      showToast(t('export.preview.shortFailed'));
    }
  }, [project, showToast]);

  const handleCopyAiPrompt = useCallback(async () => {
    const routeName = routes[0]?.name?.trim() ?? projectName;
    const text = getAiPrompt(routeName, aiStyle);
    const ok = await copyToClipboard(text);
    if (ok) {
      showToast(t('export.preview.aiCopied'));
    } else {
      window.prompt('Copy this prompt:', text);
    }
  }, [routes, projectName, aiStyle, showToast]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="export-preview__backdrop" onClick={onClose}>
      <div className="export-preview" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="export-preview__header">
          <h2>{t('export.preview.title')}</h2>
          <button className="export-preview__close" onClick={onClose}>✕</button>
        </div>

        {/* Tab bar */}
        <div className="export-preview__tabs" role="tablist">
          {WIZARD_TABS.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={`export-preview__tab${activeTab === tab ? ' export-preview__tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {t(`export.tab.${tab}`)}
            </button>
          ))}
        </div>

        <div className="export-preview__body">
          {activeTab === 'image' && (
            <>
          {/* Preview area */}
          <div className="export-preview__canvas-wrap">
            {baseImage && <canvas ref={previewRef} className="export-preview__canvas" />}
            {(adjusting || capturing) && <div className="export-preview__loading">{t('export.preview.capturing')}</div>}
            {/* View adjustment controls */}
            <div className="export-preview__adjust">
              <div className="export-preview__adjust-pad">
                <button className="export-preview__adjust-btn" disabled={!baseImage || adjusting || capturing} onClick={() => handleAdjust(0, -PAN_STEP, 0)} title={t('export.adjust.up')}>▲</button>
                <div className="export-preview__adjust-row">
                  <button className="export-preview__adjust-btn" disabled={!baseImage || adjusting || capturing} onClick={() => handleAdjust(-PAN_STEP, 0, 0)} title={t('export.adjust.left')}>◀</button>
                  <button className="export-preview__adjust-btn" disabled={!baseImage || adjusting || capturing} onClick={() => handleAdjust(PAN_STEP, 0, 0)} title={t('export.adjust.right')}>▶</button>
                </div>
                <button className="export-preview__adjust-btn" disabled={!baseImage || adjusting || capturing} onClick={() => handleAdjust(0, PAN_STEP, 0)} title={t('export.adjust.down')}>▼</button>
              </div>
              <div className="export-preview__adjust-zoom">
                <button className="export-preview__adjust-btn" disabled={!baseImage || adjusting || capturing} onClick={() => handleAdjust(0, 0, 0.5)} title={t('export.adjust.zoomIn')}>+</button>
                <button className="export-preview__adjust-btn" disabled={!baseImage || adjusting || capturing} onClick={() => handleAdjust(0, 0, -0.5)} title={t('export.adjust.zoomOut')}>−</button>
              </div>
            </div>
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

            {/* Action buttons */}
            <div className="export-preview__actions">
              <button
                className="export-preview__btn export-preview__btn--primary"
                onClick={handleDownload}
                disabled={downloading || !baseImage}
              >
                {downloading ? t('export.preview.downloading') : t('export.preview.download')}
              </button>
              <div className="export-preview__ai-row">
                <select
                  className="export-preview__select"
                  value={aiStyle}
                  onChange={(e) => setAiStyle(e.target.value as AiStyle)}
                >
                  {AI_STYLES.map((s) => (
                    <option key={s} value={s}>{t(`export.ai.${s}`)}</option>
                  ))}
                </select>
                <button
                  className="export-preview__btn"
                  onClick={handleCopyAiPrompt}
                >
                  🤖 {t('export.preview.aiPrompt')}
                </button>
              </div>
              <p className="export-preview__ai-hint">{t('export.preview.aiHint')}</p>
            </div>
          </div>
            </>
          )}

          {activeTab === 'backup' && (
            <div className="export-preview__tab-pane">
              <button
                className="export-preview__btn export-preview__btn--primary"
                disabled={saving}
                onClick={() => {
                  if (saving) return;
                  setSaving(true);
                  try { onSave(); } finally {
                    setTimeout(() => setSaving(false), 600);
                  }
                }}
              >
                💾 {t('export.backup.saveTitle')}
              </button>
              <p className="export-preview__desc">{t('export.backup.saveDesc')}</p>
              <div className="export-preview__divider" />
              <button
                className="export-preview__btn"
                onClick={() => { onClose(); onOpenImportWizard(); }}
              >
                📂 {t('export.backup.importTitle')}
              </button>
            </div>
          )}

          {activeTab === 'interop' && (
            <div className="export-preview__tab-pane export-preview__tab-pane--interop">
              <div className="export-interop-cols">
                <div className="export-interop-col">
                  <h3 className="export-preview__pane-title">{t('export.interop.geoTitle')}</h3>
                  <p className="export-preview__desc">{t('export.interop.geoDesc')}</p>
                  {hasData ? (
                    <>
                      <button className="export-preview__btn" onClick={onExportGeojson}>
                        🌐 {t('export.interop.geojson')}
                      </button>
                      <button className="export-preview__btn" onClick={onExportKml}>
                        🌐 {t('export.interop.kml')}
                      </button>
                    </>
                  ) : (
                    <div className="export-preview__empty">{t('export.interop.empty')}</div>
                  )}
                </div>
                <div className="export-interop-col">
                  <h3 className="export-preview__pane-title">{t('export.interop.shareTitle')}</h3>
                  <p className="export-preview__desc">{t('export.interop.shareDesc')}</p>
                  <button
                    className="export-preview__btn"
                    onClick={handleCopyShareLink}
                    disabled={!hasData}
                  >
                    🔗 {t('export.preview.shareLink')}
                  </button>
                  <button
                    className="export-preview__btn"
                    disabled={!hasData}
                    onClick={async () => {
                      const project = useProjectStore.getState().project;
                      const embedHtml = buildProjectEmbedHtml(project, window.location.origin);
                      await navigator.clipboard.writeText(embedHtml);
                      showToast(t('export.preview.embedCopied'));
                    }}
                  >
                    📋 {t('export.preview.embedCode')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && <div className="export-preview__toast">{toast}</div>}
      </div>
    </div>
  );
}
