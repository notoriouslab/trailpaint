import { useEffect, useCallback } from 'react';
import { usePlayerStore } from './usePlayerStore';
import { migrateProject } from '../core/utils/migrateProject';
import { decodeShareLink } from '../core/utils/shareLink';
import PlayerMap from './PlayerMap';
import SpotListPanel from './SpotListPanel';
import PlaybackControl from './PlaybackControl';

export default function PlayerApp() {
  const project = usePlayerStore((s) => s.project);
  const error = usePlayerStore((s) => s.error);
  const loadProject = usePlayerStore((s) => s.loadProject);
  const setError = usePlayerStore((s) => s.setError);

  // Load project on mount: localStorage (from Editor, includes photos) → URL hash (share link)
  useEffect(() => {
    // 1. Check localStorage (from Editor "Story Mode" button)
    const stored = localStorage.getItem('trailpaint-player-project');
    if (stored) {
      localStorage.removeItem('trailpaint-player-project');
      try {
        const data = migrateProject(JSON.parse(stored));
        loadProject(data);
        return;
      } catch { /* fall through to hash */ }
    }

    // 2. Check URL hash (share link — photos stripped)
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#share=')) return;
    decodeShareLink(hash).then((p) => {
      if (p) loadProject(p);
      else setError('無法解析分享連結');
    }).catch(() => setError('連結格式錯誤'));
  }, [loadProject, setError]);

  // Handle file drop / file input
  const handleFile = useCallback((file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      setError('檔案太大（上限 20MB）');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);
        const data = migrateProject(raw);
        loadProject(data);
      } catch (e) {
        setError(`載入失敗：${e instanceof Error ? e.message : '檔案格式不正確'}`);
      }
    };
    reader.onerror = () => setError('讀取檔案失敗');
    reader.readAsText(file);
  }, [loadProject, setError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // Landing page (no project loaded)
  if (!project) {
    return (
      <div className="player-app">
        <div
          className="player-landing"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="player-landing__card">
            <h1 className="player-landing__title">TrailPaint Story Player</h1>
            <p className="player-landing__desc">
              拖曳 .trailpaint.json 到這裡，或選擇檔案載入
            </p>
            <label className="player-landing__btn">
              選擇檔案
              <input
                type="file"
                accept=".json,.trailpaint.json"
                onChange={handleFileInput}
                hidden
              />
            </label>
            {error && <p className="player-landing__error">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  // Map view (project loaded)
  return (
    <div className="player-app">
      <div className="player-main">
        <SpotListPanel />
        <div className="player-map-area">
          <PlayerMap />
        </div>
      </div>
      <PlaybackControl />
    </div>
  );
}
