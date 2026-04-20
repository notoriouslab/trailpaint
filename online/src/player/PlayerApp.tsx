import { useEffect, useCallback, useState } from 'react';
import { usePlayerStore } from './usePlayerStore';
import { migrateProject } from '../core/utils/migrateProject';
import { decodeShareLink } from '../core/utils/shareLink';
import { t } from '../i18n';
import PlayerMap from './PlayerMap';
import SpotListPanel from './SpotListPanel';
import PlaybackControl from './PlaybackControl';

/** Validate ?src= param: allow curated same-origin JSON under /stories/ or
 *  /examples/routes/. Path components use [^/] so Chinese filenames work
 *  (e.g. /examples/routes/阿朗壹古道.trailpaint.json). `..` traversal blocked. */
function isValidSrc(src: string): boolean {
  if (src.includes('..')) return false;
  return /^\/stories\/[^/]+\/[^/]+\.json$/.test(src)
      || /^\/examples\/routes\/[^/]+\.json$/.test(src);
}

export default function PlayerApp() {
  const project = usePlayerStore((s) => s.project);
  const error = usePlayerStore((s) => s.error);
  const loadProject = usePlayerStore((s) => s.loadProject);
  const setError = usePlayerStore((s) => s.setError);
  const setPlaying = usePlayerStore((s) => s.setPlaying);

  // URL params
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const isEmbed = params.get('embed') === '1';
  const autoplay = params.get('autoplay') === '1';

  // Load project on mount: ?src= → localStorage → #share=
  useEffect(() => {
    // 1. Check ?src= param (embed mode — fetch same-origin JSON)
    const src = params.get('src');
    if (src) {
      if (!isValidSrc(src)) {
        console.warn('Invalid embed source: only /stories/*.json allowed');
        return;
      }
      fetch(src, { signal: AbortSignal.timeout(30000) })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((raw) => {
          const data = migrateProject(raw);
          loadProject(data);
        })
        .catch((e) => {
          const msg = e instanceof Error && e.name === 'TimeoutError'
            ? t('player.error.timeout') : t('player.error.load');
          setError(msg);
        });
      return;
    }

    // 2. Check localStorage (from Editor "Story Mode" button)
    const stored = localStorage.getItem('trailpaint-player-project');
    if (stored) {
      localStorage.removeItem('trailpaint-player-project');
      try {
        const data = migrateProject(JSON.parse(stored));
        loadProject(data);
        return;
      } catch { /* fall through to hash */ }
    }

    // 3. Check URL hash (share link — photos stripped)
    const hash = window.location.hash;
    if (hash && hash.startsWith('#share=')) {
      decodeShareLink(hash).then((p) => {
        if (p) loadProject(p);
        else setError(t('player.error.share'));
      }).catch(() => setError(t('player.error.format')));
      return;
    }

    // 4. Listen for postMessage (embed with full project data including photos)
    if (isEmbed) {
      // Same-origin only: embed HTML lives on the same origin as Player (see Embed Code builder).
      // Rejects third-party iframes trying to inject project data.
      const expectedOrigin = window.location.origin;
      const handler = (e: MessageEvent) => {
        if (e.origin !== expectedOrigin) return;
        if (e.source !== window.parent) return;
        if (e.data?.type !== 'trailpaint-project' || !e.data?.data) return;
        try {
          const data = migrateProject(e.data.data);
          loadProject(data);
        } catch { /* invalid data, ignore */ }
      };
      window.addEventListener('message', handler);
      // Tell parent we're ready — use specific origin, not wildcard
      window.parent.postMessage({ type: 'trailpaint-ready' }, expectedOrigin);
      return () => window.removeEventListener('message', handler);
    }

    // 5. Story-mode cross-tab — three transports Editor may use.
    //    BroadcastChannel is primary for iOS Safari, where `window.opener` can
    //    be null and localStorage has cross-tab ITP isolation. The opener path
    //    stays as legacy fallback for older browsers.
    if (!isEmbed) {
      const expectedOrigin = window.location.origin;
      const cleanups: Array<() => void> = [];

      // 5a. BroadcastChannel: Player broadcasts 'player-ready', Editor posts back
      if (typeof BroadcastChannel === 'function') {
        const channel = new BroadcastChannel('trailpaint-player');
        const onChannel = (ev: MessageEvent) => {
          if (ev.data?.type !== 'project' || !ev.data?.data) return;
          try {
            const data = migrateProject(ev.data.data);
            loadProject(data);
          } catch { /* ignore bad payload */ }
        };
        channel.addEventListener('message', onChannel);
        try { channel.postMessage({ type: 'player-ready' }); } catch { /* noop */ }
        cleanups.push(() => { channel.removeEventListener('message', onChannel); channel.close(); });
      }

      // 5b. window.opener postMessage
      if (window.opener) {
        const openerHandler = (e: MessageEvent) => {
          if (e.origin !== expectedOrigin) return;
          if (e.source !== window.opener) return;
          if (e.data?.type !== 'trailpaint-project' || !e.data?.data) return;
          try {
            const data = migrateProject(e.data.data);
            loadProject(data);
          } catch { /* ignore */ }
        };
        window.addEventListener('message', openerHandler);
        try {
          window.opener.postMessage({ type: 'trailpaint-opener-ready' }, expectedOrigin);
        } catch { /* opener gone — channel path still has a chance */ }
        cleanups.push(() => window.removeEventListener('message', openerHandler));
      }

      if (cleanups.length > 0) {
        return () => cleanups.forEach((c) => c());
      }
    }
  }, [params, loadProject, setError, isEmbed]);

  // Autoplay: trigger after project loads
  useEffect(() => {
    if (autoplay && project && project.spots.length > 0) {
      setPlaying(true);
    }
  }, [autoplay, project, setPlaying]);

  // Handle file drop / file input
  const handleFile = useCallback((file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      setError(t('player.error.tooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);
        const data = migrateProject(raw);
        loadProject(data);
      } catch (e) {
        setError(`${t('player.error.load')}：${e instanceof Error ? e.message : t('player.error.parse')}`);
      }
    };
    reader.onerror = () => setError(t('player.error.read'));
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

  // No project loaded
  if (!project) {
    // Embed mode: show empty map placeholder (no landing page)
    if (isEmbed) {
      return (
        <div className="player-app">
          <div className="player-embed-empty">
            {error
              ? <span className="player-embed-empty__text">{error}</span>
              : <span className="player-embed-empty__text">{t('player.embed.empty')}</span>}
          </div>
        </div>
      );
    }

    // Standalone mode: full landing page with drop zone
    return (
      <div className="player-app">
        <div
          className="player-landing"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="player-landing__card">
            <h1 className="player-landing__title">{t('player.title')}</h1>
            <p className="player-landing__desc">
              {t('player.landing.desc')}
            </p>
            <label className="player-landing__btn">
              {t('player.landing.btn')}
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
