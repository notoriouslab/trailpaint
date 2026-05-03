import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { usePlayerStore } from './usePlayerStore';
import { t } from '../i18n';
import { buildProjectEmbedHtml, isAllowedMediaUrl } from '../core/utils/embedCode';

const FLY_DURATION = 800; // ms

const DWELL_OPTIONS = [
  { label: '2s', value: 2000 },
  { label: '4s', value: 4000 },
  { label: '6s', value: 6000 },
  { label: '8s', value: 8000 },
];

const LOOP_OPTIONS = [
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '3×', value: 3 },
  { label: '∞', value: 0 },
];

// Random per Player mount when project doesn't pin a music URL — keeps demos
// fresh instead of always Redeemed. Same-mount stays stable; reload re-rolls.
const MUSIC_POOL = [
  { url: 'https://trailpaint.org/stories/music/redeemed.mp3', labelKey: 'player.music.track.redeemed' },
  { url: 'https://trailpaint.org/stories/music/morning-mood.mp3', labelKey: 'player.music.track.morningMood' },
  { url: 'https://trailpaint.org/stories/music/voller-hoffnung.mp3', labelKey: 'player.music.track.vollerHoffnung' },
  { url: 'https://trailpaint.org/stories/music/sorrow-and-love.mp3', labelKey: 'player.music.track.sorrowAndLove' },
  { url: 'https://trailpaint.org/stories/music/the-servant-king.mp3', labelKey: 'player.music.track.theServantKing' },
] as const;

export default function PlaybackControl() {
  const project = usePlayerStore((s) => s.project)!;
  const playing = usePlayerStore((s) => s.playing);
  const activeIndex = usePlayerStore((s) => s.activeSpotIndex);
  const dwellTime = usePlayerStore((s) => s.dwellTime);
  const loopCount = usePlayerStore((s) => s.loopCount);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const setActiveSpot = usePlayerStore((s) => s.setActiveSpot);
  const setDwellTime = usePlayerStore((s) => s.setDwellTime);
  const setLoopCount = usePlayerStore((s) => s.setLoopCount);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentLoopRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const canFullscreen = useMemo(() => !!document.documentElement.requestFullscreen, []);
  // Hide "back to editor" button when Player is embedded via iframe (story pages)
  // or when ?embed=1 is explicitly set.
  const isEmbedded = useMemo(() => {
    try {
      const embedParam = new URLSearchParams(window.location.search).get('embed');
      return embedParam === '1' || window.parent !== window;
    } catch {
      return true; // cross-origin parent access throws — assume embedded
    }
  }, []);
  const handleBackToEditor = useCallback(() => {
    // Prefer history.back when the Editor is the previous entry (same origin),
    // so the Editor state (spots, routes, photos) is preserved. Fall back to
    // navigating to /app/ for direct Player access (PWA opened from home screen).
    const sameOriginReferrer = document.referrer && document.referrer.startsWith(window.location.origin);
    if (window.history.length > 1 && sameOriginReferrer) {
      window.history.back();
    } else {
      window.location.href = '/app/';
    }
  }, []);

  const [defaultPick] = useState(() => MUSIC_POOL[Math.floor(Math.random() * MUSIC_POOL.length)]);
  const DEFAULT_MUSIC = defaultPick.url;
  const [musicUrlInput, setMusicUrlInput] = useState(project.music?.url || DEFAULT_MUSIC);
  const [musicAutoplay, setMusicAutoplay] = useState(project.music?.autoplay ?? false);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  // Priority: ?music= param (whitelist-checked) > project.music.url > default
  // Same whitelist as migrateProject — prevents tracking pixels / mixed content via URL param
  const rawMusicParam = params.get('music');
  const musicParam = rawMusicParam && isAllowedMediaUrl(rawMusicParam) ? rawMusicParam : null;
  const effectiveMusicUrl = musicParam || project.music?.url || DEFAULT_MUSIC;
  const effectiveAutoplay = musicParam ? true : project.music?.autoplay ?? false;
  const currentTrackLabelKey = useMemo(() => {
    const found = MUSIC_POOL.find((m) => m.url === effectiveMusicUrl);
    return found ? found.labelKey : 'player.music.track.custom';
  }, [effectiveMusicUrl]);

  // Initialize audio element for background music
  useEffect(() => {
    if (!effectiveMusicUrl) return;
    const audio = new Audio(effectiveMusicUrl);
    audio.loop = true;
    audio.volume = 0.3;
    audio.preload = 'auto';
    audioRef.current = audio;
    if (effectiveAutoplay) {
      audio.play().catch(() => {});
      setMusicPlaying(true);
    }
    return () => { audio.pause(); audio.src = ''; audioRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMusicUrl]);

  const spots = project.spots;
  const total = spots.length;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Playback loop
  useEffect(() => {
    if (!playing || total === 0) return;

    const currentIndex = activeIndex ?? -1;
    const nextIndex = currentIndex + 1;

    if (nextIndex >= total) {
      // End of sequence — check loop
      timerRef.current = setTimeout(() => {
        const nextLoop = currentLoopRef.current + 1;
        if (loopCount !== 0 && nextLoop >= loopCount) {
          // All loops done
          setPlaying(false);
          setActiveSpot(null);
        } else {
          // Start next loop
          currentLoopRef.current = nextLoop;
          setActiveSpot(-1); // triggers restart from 0
        }
      }, dwellTime);
      return () => clearTimer();
    }

    // Move to next spot after dwell
    const delay = currentIndex === -1 ? 0 : FLY_DURATION + dwellTime;
    timerRef.current = setTimeout(() => {
      setActiveSpot(nextIndex);
    }, delay);

    return () => clearTimer();
  }, [playing, activeIndex, total, dwellTime, loopCount, setPlaying, setActiveSpot, clearTimer]);

  // Stop timer when paused
  useEffect(() => {
    if (!playing) clearTimer();
  }, [playing, clearTimer]);

  const handlePlayPause = () => {
    if (playing) {
      setPlaying(false);
    } else {
      if (total === 0) return;
      // Starting from beginning — reset loop counter
      if (activeIndex === null || activeIndex >= total - 1) {
        currentLoopRef.current = 0;
        setActiveSpot(-1);
      }
      setPlaying(true);
    }
  };

  const handleDotClick = (index: number) => {
    setPlaying(false);
    setActiveSpot(index);
    currentLoopRef.current = 0;
  };

  // Listen for fullscreen changes (e.g. user presses Escape)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  if (total === 0) return null;

  return (
    <>
      {showSettings && (
        <div className="playback__settings">
          <div className="playback__setting-group">
            <span className="playback__setting-label">{t('player.playback.interval')}</span>
            {DWELL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`playback__setting-btn${dwellTime === opt.value ? ' playback__setting-btn--active' : ''}`}
                onClick={() => setDwellTime(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="playback__setting-group">
            <span className="playback__setting-label">{t('player.playback.loop')}</span>
            {LOOP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`playback__setting-btn${loopCount === opt.value ? ' playback__setting-btn--active' : ''}`}
                onClick={() => setLoopCount(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="playback__setting-group playback__setting-group--music">
            <span className="playback__setting-label">{t('player.music.nowPlaying')}</span>
            <span className="playback__setting-hint">{t(currentTrackLabelKey)}</span>
          </div>
          <div className="playback__setting-group playback__setting-group--music">
            <span className="playback__setting-label">{t('player.music.url')}</span>
            <span className="playback__setting-hint">{t('player.music.urlHint')}</span>
            <input
              className="playback__setting-input"
              type="url"
              placeholder="https://..."
              value={musicUrlInput}
              onChange={(e) => setMusicUrlInput(e.target.value)}
              onBlur={() => {
                const url = musicUrlInput.trim();
                if (url !== (project.music?.url ?? '')) {
                  // Update audio
                  if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
                  if (url) {
                    const audio = new Audio(url);
                    audio.loop = true;
                    audio.volume = 0.3;
                    audioRef.current = audio;
                  } else {
                    audioRef.current = null;
                    setMusicPlaying(false);
                  }
                }
              }}
            />
          </div>
          <div className="playback__setting-group">
            <label className="playback__setting-label" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={musicAutoplay}
                onChange={(e) => setMusicAutoplay(e.target.checked)}
              />
              {t('player.music.autoplay')}
            </label>
          </div>
        </div>
      )}
      <div className="playback">
        {!isEmbedded && (
          <button
            className="playback__btn playback__btn--back"
            onClick={handleBackToEditor}
            title={t('player.backToEditor')}
          >
            {t('player.backToEditor')}
          </button>
        )}
        {canFullscreen && (
          <button
            className="playback__btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? t('player.fullscreen.exit') : t('player.fullscreen.enter')}
          >
            {isFullscreen ? '⊡' : '⛶'}
          </button>
        )}
        <button
          className="playback__btn"
          onClick={handlePlayPause}
          title={playing ? t('player.playback.pause') : t('player.playback.play')}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <div className="playback__dots">
          {spots.map((_, i) => (
            <button
              key={i}
              className={`playback__dot${activeIndex === i ? ' playback__dot--active' : ''} ${i < (activeIndex ?? -1) ? 'playback__dot--visited' : ''}`}
              onClick={() => handleDotClick(i)}
              title={spots[i].title}
            />
          ))}
        </div>
        <span className="playback__counter">
          {activeIndex !== null && activeIndex >= 0 ? activeIndex + 1 : 0}/{total}
        </span>
        <button
          className={`playback__btn${musicPlaying ? ' playback__btn--active' : ''}`}
          onClick={() => {
            if (!audioRef.current) return;
            if (musicPlaying) {
              audioRef.current.pause();
            } else {
              audioRef.current.play().catch(() => {});
            }
            setMusicPlaying(!musicPlaying);
          }}
          title={musicPlaying ? t('player.music.off') : t('player.music.on')}
        >
          {musicPlaying ? '❚❚' : '♫'}
        </button>
        <button
          className={`playback__btn${showSettings ? ' playback__btn--active' : ''}`}
          onClick={() => setShowSettings(!showSettings)}
          title={t('player.playback.settings')}
        >
          ⚙
        </button>
        <button
          className={`playback__btn${embedCopied ? ' playback__btn--active' : ''}`}
          onClick={async () => {
            const compId = params.get('compilation');
            const src = params.get('src');
            const origin = window.location.origin;
            let html: string;
            if (compId) {
              // T9 / CP4: compilation embed — iframe re-fetches catalog.json + segments,
              // no inline data needed (small embed snippet, large compilation playback).
              const musicParam = effectiveMusicUrl ? `&music=${encodeURIComponent(effectiveMusicUrl)}` : '';
              html = `<iframe src="${origin}/app/player/?embed=1&compilation=${encodeURIComponent(compId)}${musicParam}" width="100%" height="500" style="border:none;border-radius:8px" allowfullscreen></iframe>`;
            } else if (src) {
              const musicParam = effectiveMusicUrl ? `&music=${encodeURIComponent(effectiveMusicUrl)}` : '';
              html = `<iframe src="${origin}/app/player/?embed=1&src=${encodeURIComponent(src)}${musicParam}" width="100%" height="500" style="border:none;border-radius:8px" allowfullscreen></iframe>`;
            } else {
              html = buildProjectEmbedHtml(project, origin);
            }
            await navigator.clipboard.writeText(html);
            setEmbedCopied(true);
            setTimeout(() => setEmbedCopied(false), 2000);
          }}
          title={t('player.embed.copy')}
        >
          {embedCopied ? '✓' : '📋'}
        </button>
      </div>
    </>
  );
}
