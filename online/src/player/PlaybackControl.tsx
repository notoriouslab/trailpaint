import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { usePlayerStore } from './usePlayerStore';
import { t } from '../i18n';

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

  const DEFAULT_MUSIC = 'https://trailpaint.org/stories/music/redeemed.mp3';
  const [musicUrlInput, setMusicUrlInput] = useState(project.music?.url || DEFAULT_MUSIC);
  const [musicAutoplay, setMusicAutoplay] = useState(project.music?.autoplay ?? false);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const isEmbed = params.get('embed') === '1';
  // Priority: ?music= param > project.music.url > default
  const effectiveMusicUrl = params.get('music') || project.music?.url || DEFAULT_MUSIC;
  const effectiveAutoplay = params.get('music') ? true : project.music?.autoplay ?? false;

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
            const src = params.get('src');
            const origin = window.location.origin;
            let html: string;
            if (src) {
              const musicParam = musicUrl ? `&music=${encodeURIComponent(musicUrl)}` : '';
              html = `<iframe src="${origin}/app/player/?embed=1&src=${encodeURIComponent(src)}${musicParam}" width="100%" height="500" style="border:none;border-radius:8px" allowfullscreen></iframe>`;
            } else {
              const json = JSON.stringify(project);
              html = `<div id="tp-embed"></div>\n<script>\n(function(){\n  var d=${json};\n  var f=document.createElement('iframe');\n  f.src='${origin}/app/player/?embed=1';\n  f.style.cssText='width:100%;height:500px;border:none;border-radius:8px';\n  f.allowFullscreen=true;\n  document.getElementById('tp-embed').appendChild(f);\n  window.addEventListener('message',function h(e){if(e.data&&e.data.type==='trailpaint-ready'){f.contentWindow.postMessage({type:'trailpaint-project',data:d},'${origin}');window.removeEventListener('message',h);}});\n})();\n<\/script>`;
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
