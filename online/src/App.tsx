import { useCallback, useState, useEffect } from 'react';
import MapView from './map/MapView';
import ImageMapView from './map/ImageMapView';
import Sidebar from './core/components/Sidebar';
import ModeToolbar from './core/components/ModeToolbar';
import OnboardingOverlay from './core/components/OnboardingOverlay';
import ExportWizard from './core/components/ExportWizard';
import ImportWizard from './core/components/ImportWizard';
import FloatingActions from './core/components/FloatingActions';
import UpdatePrompt from './core/components/UpdatePrompt';
import { registerWebMCP } from './core/utils/webMCP';
import { captureMap, saveProject, exportGeojson, exportKml } from './map/ExportButton';
import type { CapturedMap } from './core/utils/exportRenderer';
import { decodeShareLink } from './core/utils/shareLink';
import { openStoryMode } from './core/utils/storyMode';
import { flyTo, panBy, zoomBy } from './map/useMapRef';
import { useUndoRedoKeys } from './core/hooks/useUndoRedo';
import { useProjectStore } from './core/store/useProjectStore';
import { t } from './i18n';
import './core/components/Sidebar.css';
import './App.css';

const MAX_BG_SIZE = 10 * 1024 * 1024;

function loadImageFile(file: File) {
  if (file.size > MAX_BG_SIZE) {
    alert(t('bg.tooLarge'));
    return;
  }
  const state = useProjectStore.getState();
  const hasData = state.project.spots.length > 0 || state.project.routes.length > 0;
  if (hasData && !confirm(t('bg.switchConfirm'))) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      useProjectStore.getState().setBackgroundImage(
        reader.result as string,
        img.width,
        img.height,
      );
    };
    img.src = reader.result as string;
  };
  reader.readAsDataURL(file);
}

export default function App() {
  useUndoRedoKeys();
  // Register TrailPaint skills with navigator.modelContext (WebMCP, if browser supports it).
  // Safe no-op when the API is absent; AEO/GEO scanners pick up the declaration either way.
  useEffect(() => { registerWebMCP(); }, []);
  const baseMode = useProjectStore((s) => s.baseMode);
  const sidebarOpen = useProjectStore((s) => s.sidebarOpen);
  const [dragOver, setDragOver] = useState(false);
  const [exportWizardOpen, setExportWizardOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<CapturedMap | null>(null);
  const [importWizardOpen, setImportWizardOpen] = useState(false);

  // Handle share link on load.
  // Two paths:
  //   (A) sessionStorage — primary for /s/:id backend shares. Worker redirect
  //       stashes the deflate-base64 hash in sessionStorage (same origin) and
  //       navigates here with ?share=ss, sidestepping the URL fragment length
  //       cap that breaks photo-heavy shares (>~300KB).
  //   (B) window.location.hash — legacy path for directly-pasted long-hash
  //       URLs (pre-012 shares, or fallback when sessionStorage is blocked).
  useEffect(() => {
    let hash: string | null = null;
    try {
      const stored = sessionStorage.getItem('tp_share_hash');
      if (stored) {
        sessionStorage.removeItem('tp_share_hash');
        hash = '#share=' + stored;
      }
    } catch { /* sessionStorage unavailable (Safari private mode, quota) */ }

    if (!hash && window.location.hash.startsWith('#share=')) {
      hash = window.location.hash;
    }

    if (!hash) return;

    decodeShareLink(hash).then((project) => {
      if (project) {
        useProjectStore.getState().importJSON(JSON.stringify(project));
      }
      history.replaceState(null, '', window.location.pathname);
    }).catch(() => {
      history.replaceState(null, '', window.location.pathname);
      alert(t('import.failed'));
    });
  }, []);

  // Restore Editor project saved before entering Story Mode.
  // PWA standalone replaces the window when opening Player, wiping in-memory Zustand
  // state. storyMode.ts saves a snapshot to localStorage so we can restore on return.
  // Share link (sessionStorage 'tp_share_hash' or #share=...) takes precedence
  // — it's an explicit intent overriding any editor auto-restore.
  useEffect(() => {
    if (window.location.hash.startsWith('#share=')) return;
    if (new URLSearchParams(window.location.search).get('share') === 'ss') return;
    try {
      const raw = localStorage.getItem('trailpaint-editor-restore');
      if (!raw) return;
      const { project, savedAt } = JSON.parse(raw);
      // Expire after 1 hour to avoid stale restores across days
      if (project && typeof savedAt === 'number' && Date.now() - savedAt < 60 * 60 * 1000) {
        useProjectStore.getState().importJSON(JSON.stringify(project));
      }
      localStorage.removeItem('trailpaint-editor-restore');
    } catch {
      localStorage.removeItem('trailpaint-editor-restore');
    }
  }, []);

  const handleOpenExportWizard = useCallback(() => {
    // Dismiss any open on-screen keyboard (e.g. iOS when focus is on project name input)
    // so it doesn't cover the Wizard bottom area.
    (document.activeElement as HTMLElement | null)?.blur?.();
    setExportWizardOpen(true);
  }, []);

  // Lazy capture: triggered by ExportWizard useEffect on first entry to image tab.
  // MUST be useCallback with stable deps — if onCapture ref changes on every App
  // render, the Wizard's useEffect dependency diff would retrigger captureMap in
  // an infinite loop.
  const handleCaptureRequest = useCallback(async () => {
    try {
      if (useProjectStore.getState().sidebarOpen) {
        useProjectStore.getState().setSidebarOpen(false);
        await new Promise((r) => setTimeout(r, 350));
        panBy(-150, 0);
        await new Promise((r) => setTimeout(r, 100));
      }
      const img = await captureMap(2);
      setCapturedImage(img);
    } catch (err) {
      console.error('Capture failed:', err);
      alert(t('export.failed'));
    }
  }, []);

  const handleAdjustView = useCallback(async (dx: number, dy: number, dZoom: number): Promise<CapturedMap> => {
    if (dx || dy) panBy(dx, dy);
    if (dZoom) zoomBy(dZoom);
    // Wait for tiles to load after adjustment
    await new Promise((r) => setTimeout(r, 400));
    const img = await captureMap(2);
    setCapturedImage(img);
    return img;
  }, []);

  const handleOpenImportWizard = useCallback(() => {
    setImportWizardOpen(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      loadImageFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return (
    <div
      className={`app${dragOver ? ' app--drag-over' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <Sidebar
        onFlyTo={flyTo}
        onOpenExportWizard={handleOpenExportWizard}
        onOpenImportWizard={handleOpenImportWizard}
      />
      <div className="map-container">
        {baseMode === 'map' ? <MapView /> : <ImageMapView />}
        {!sidebarOpen && (
          <div className="floating-mode-toolbar">
            <ModeToolbar />
            <FloatingActions
              onExport={handleOpenExportWizard}
              onImport={handleOpenImportWizard}
              onToggleSettings={() => useProjectStore.getState().setSidebarOpen(true)}
              onStoryMode={useProjectStore.getState().project.spots.length > 0 ? () => {
                openStoryMode(useProjectStore.getState().project);
              } : undefined}
            />
          </div>
        )}
      </div>
      <OnboardingOverlay />
      {exportWizardOpen && (
        <ExportWizard
          baseImage={capturedImage}
          onClose={() => { setExportWizardOpen(false); setCapturedImage(null); }}
          onAdjust={handleAdjustView}
          onCapture={handleCaptureRequest}
          onSave={saveProject}
          onOpenImportWizard={handleOpenImportWizard}
          onExportGeojson={exportGeojson}
          onExportKml={exportKml}
        />
      )}
      {importWizardOpen && (
        <ImportWizard
          onClose={() => setImportWizardOpen(false)}
          onLoadImage={loadImageFile}
        />
      )}
      <UpdatePrompt />
    </div>
  );
}
