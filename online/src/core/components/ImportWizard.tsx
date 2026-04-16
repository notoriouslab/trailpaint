import { useState, useEffect, useCallback, useRef } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { parseGpx } from '../utils/gpxParser';
import { t } from '../../i18n';
import './ImportWizard.css';

const MAX_BG_SIZE = 10 * 1024 * 1024;
const MAX_PROJECT_SIZE = 20 * 1024 * 1024;

interface ImportWizardProps {
  onClose: () => void;
  onLoadImage: (file: File) => void;
}

const AI_PROMPT_TEMPLATE = `請幫我製作 TrailPaint 路線地圖的 JSON 檔案。

我的行程：
[在這裡描述你的景點和路線]

JSON 格式要求：
{
  "version": 2,
  "name": "行程名稱",
  "center": [緯度, 經度],
  "zoom": 14,
  "spots": [
    { "id": "s1", "latlng": [緯度, 經度], "num": 1, "title": "景點名", "desc": "描述", "photo": null, "iconId": "pin", "cardOffset": { "x": 0, "y": -60 } }
  ],
  "routes": [
    { "id": "r1", "name": "路線名", "pts": [[緯度,經度], ...中間路徑點...], "color": "orange", "elevations": null }
  ]
}

iconId 選項：leaf(植物), flower(花), tree(樹), bird(鳥), water(水), rock(岩石), toilet(廁所), bus(站牌), rest(休憩), food(餐廳), beer(酒吧), hotspring(溫泉), mall(商城), cinema(電影院), bike(腳踏車), parking(停車), sun(觀景), camera(拍照), warning(注意), info(說明), pin(標記)
color 選項：orange, blue, green, red, purple
座標請用真實 GPS 座標（可用 Google Maps 查）。每個景點的 cardOffset 請設不同的 x 值（如 80, -100, 90, -80）避免卡片重疊。`;

async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }) }),
      ]);
      return true;
    } catch { /* fall through */ }
  }
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch { /* fall through */ }
  }
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

export default function ImportWizard({ onClose, onLoadImage }: ImportWizardProps) {
  const importJSON = useProjectStore((s) => s.importJSON);
  const importGpx = useProjectStore((s) => s.importGpx);
  const [toast, setToast] = useState('');
  const [schemaOpen, setSchemaOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2000);
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleUploadBg = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > MAX_BG_SIZE) {
        alert(t('bg.tooLarge'));
        return;
      }
      onLoadImage(file);
      onClose();
    };
    input.click();
  }, [onClose, onLoadImage]);

  const handleLoadJson = useCallback(() => {
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
      try {
        const text = await file.text();
        importJSON(text);
        onClose();
      } catch {
        alert(t('import.failed'));
      }
    };
    input.click();
  }, [importJSON, onClose]);

  const handleImportGpx = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.gpx';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > MAX_PROJECT_SIZE) {
        alert(t('import.tooLarge'));
        return;
      }
      try {
        const text = await file.text();
        const data = parseGpx(text);
        importGpx(data);
        onClose();
      } catch (err) {
        alert(`${t('gpx.importFailed')}: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    input.click();
  }, [importGpx, onClose]);

  const handleCopyPrompt = useCallback(async () => {
    const ok = await copyToClipboard(AI_PROMPT_TEMPLATE);
    if (ok) showToast(t('import.ai.promptCopied'));
  }, [showToast]);

  const [dragOver, setDragOver] = useState(false);

<<<<<<< HEAD
  const handleWizardDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      if (file.size > MAX_BG_SIZE) { alert(t('bg.tooLarge')); return; }
      onLoadImage(file);
      onClose();
    } else if (file.name.endsWith('.json')) {
      if (file.size > MAX_PROJECT_SIZE) { alert(t('import.tooLarge')); return; }
      file.text().then((text) => { importJSON(text); onClose(); }).catch(() => alert(t('import.failed')));
    } else if (file.name.endsWith('.gpx')) {
      if (file.size > MAX_PROJECT_SIZE) { alert(t('import.tooLarge')); return; }
      file.text().then((text) => { importGpx(parseGpx(text)); onClose(); }).catch((err) => alert(`${t('gpx.importFailed')}: ${err instanceof Error ? err.message : String(err)}`));
    }
  }, [importGpx, importJSON, onClose, onLoadImage]);

  const handleWizardDragOver = useCallback((e: React.DragEvent) => {
=======
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        onLoadImage(file);
        onClose();
      } else if (file.name.endsWith('.json')) {
        file.text().then(text => {
          importJSON(text);
          onClose();
        });
      } else if (file.name.endsWith('.gpx')) {
        file.text().then(text => {
          const data = parseGpx(text);
          importGpx(data);
          onClose();
        });
      }
    }
  }, [importGpx, importJSON, onClose, onLoadImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
>>>>>>> 54551e3 (feat: enhance UI/UX and add guidebook playback functionality)
    e.preventDefault();
    setDragOver(true);
  }, []);

<<<<<<< HEAD
  const handleWizardDragLeave = useCallback(() => {
=======
  const handleDragLeave = useCallback(() => {
>>>>>>> 54551e3 (feat: enhance UI/UX and add guidebook playback functionality)
    setDragOver(false);
  }, []);

  return (
    <div className="import-wizard__backdrop" onClick={onClose}>
<<<<<<< HEAD
      <div
        className={`import-wizard${dragOver ? ' import-wizard--drag-over' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onDrop={handleWizardDrop}
        onDragOver={handleWizardDragOver}
        onDragLeave={handleWizardDragLeave}
=======
      <div 
        className={`import-wizard${dragOver ? ' import-wizard--drag-over' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
>>>>>>> 54551e3 (feat: enhance UI/UX and add guidebook playback functionality)
      >
        {/* Header */}
        <div className="import-wizard__header">
          <h2>{t('import.title')}</h2>
          <button className="import-wizard__close" onClick={onClose}>✕</button>
        </div>

        <div className="import-wizard__body">
          {/* Three import cards */}
          <div className="import-wizard__cards">
            <button className="import-wizard__card" onClick={handleUploadBg}>
              <span className="import-wizard__card-icon">🗺️</span>
              <span className="import-wizard__card-title">{t('import.uploadBg')}</span>
              <span className="import-wizard__card-desc">{t('import.uploadBgDesc')}</span>
            </button>
            <button className="import-wizard__card" onClick={handleLoadJson}>
              <span className="import-wizard__card-icon">📂</span>
              <span className="import-wizard__card-title">{t('import.loadJson')}</span>
              <span className="import-wizard__card-desc">{t('import.loadJsonDesc')}</span>
            </button>
            <button className="import-wizard__card" onClick={handleImportGpx}>
              <span className="import-wizard__card-icon">📥</span>
              <span className="import-wizard__card-title">{t('import.importGpx')}</span>
              <span className="import-wizard__card-desc">{t('import.importGpxDesc')}</span>
            </button>
          </div>

          <div className="import-wizard__hint">{t('import.dragHint')}</div>

          {/* AI teaching section */}
          <div className="import-wizard__ai">
            <h3>{t('import.ai.title')}</h3>
            <p>{t('import.ai.desc')}</p>
            <button className="import-wizard__ai-btn" onClick={handleCopyPrompt}>
              📋 {t('import.ai.copyPrompt')}
            </button>

            {/* Collapsible JSON schema */}
            <button
              className="import-wizard__schema-toggle"
              onClick={() => setSchemaOpen(!schemaOpen)}
            >
              {schemaOpen ? '▼' : '▶'} {t('import.ai.schemaTitle')}
            </button>
            {schemaOpen && (
              <div className="import-wizard__schema">
                <pre>{`{
  "version": 2,
  "name": "行程名稱",
  "center": [緯度, 經度],
  "zoom": 14,
  "spots": [{
    "id": "s1",
    "latlng": [緯度, 經度],
    "num": 1,
    "title": "景點名",
    "desc": "描述",
    "photo": null,
    "iconId": "pin",
    "cardOffset": { "x": 0, "y": -60 }
  }],
  "routes": [{
    "id": "r1",
    "name": "路線名",
    "pts": [[lat, lng], ...],
    "color": "orange",
    "elevations": null
  }]
}`}</pre>
                <div className="import-wizard__schema-icons">
                  <strong>iconId：</strong>
                  🌿leaf 🌸flower 🌳tree 🐦bird 💧water 🪨rock 🚻toilet 🚌bus 🪑rest 🍽️food 🍺beer ♨️hotspring 🏢mall 🎬cinema 🚲bike 🅿️parking 🌅sun 📸camera ⚠️warning ℹ️info 📍pin
                </div>
                <div className="import-wizard__schema-colors">
                  <strong>color：</strong>
                  <span style={{ color: '#e05a1a' }}>orange</span>{' · '}
                  <span style={{ color: '#2563eb' }}>blue</span>{' · '}
                  <span style={{ color: '#16a34a' }}>green</span>{' · '}
                  <span style={{ color: '#dc2626' }}>red</span>{' · '}
                  <span style={{ color: '#9333ea' }}>purple</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && <div className="import-wizard__toast">{toast}</div>}
      </div>
    </div>
  );
}
